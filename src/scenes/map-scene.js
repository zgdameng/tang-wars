import Phaser from 'phaser';
import { createGameState } from '../logic/game-state.js';
import { loadGameData } from '../logic/data-loader.js';
import { generateMapBitmap, gridToPixel, MAP_W, MAP_H, WORLD_OX, WORLD_OY } from '../rendering/map-bitmap.js';
import { createCityMarkers, updateCityLabelPositions, destroyCityMarkers } from '../rendering/city-marker.js';
import { createArmyMarkers, updateArmyPositions, refreshArmyMarkers, destroyArmyMarkers } from '../rendering/army-marker.js';
import { showCityPanel, hideCityPanel } from './city-panel.js';
import { executeTurn } from '../logic/turn.js';
import { createTurnPanel, setTurnDisplay, removeTurnPanel } from '../ui/turn-panel.js';
import { applyBattleResult } from '../logic/battle/battle-resolution.js';
import { showDiplomacyPanel, hideDiplomacyPanel } from '../ui/diplomacy-panel.js';
import { showSavePanel, hideSavePanel } from '../ui/save-panel.js';
import { showArmyPanel, hideArmyPanel } from '../ui/army-panel.js';
import { showEspionagePanel, hideEspionagePanel } from '../ui/espionage-panel.js';
import { showTurnReport } from '../ui/turn-report.js';
import { saveGame } from '../logic/save-load.js';
import { playClick, playDrum, startBgMusic, stopBgMusic } from '../audio/sound-manager.js';

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create(data) {
    // 三种启动方式：存档 / 新游戏选势力 / 默认
    if (data && data.savedGame) {
      this.gameState = data.savedGame;
    } else {
      this.gameState = createGameState({
        playerFactionId: data && data.playerFactionId ? data.playerFactionId : undefined
      });
      loadGameData(this.gameState);
    }

    // 生成三国志风格整张地图（Canvas 位图 → Phaser 纹理 → Image）
    const bitmap = generateMapBitmap(this.gameState);
    const tex = this.textures.addCanvas('map-bitmap', bitmap);
    this.add.image(MAP_W / 2 + WORLD_OX, MAP_H / 2 + WORLD_OY, 'map-bitmap').setDepth(0);

    // 放城池标记（圆点 + DOM 标签）
    createCityMarkers(this, this.gameState.cities, this.gameState.factions);

    // 放部队标记（三角箭头 + 人数标签）
    createArmyMarkers(this, this.gameState.armies, this.gameState.factions);

    // 相机：有边界 + 拖拽平移 + 滚轮缩放
    this.setupCamera();

    // 城池点击 → 弹出信息面板（捏合缩放冷却期内不触发）
    this.events.on('city-clicked', (cityId) => {
      if (this._pinchCooldown) return;
      playClick();
      const city = this.gameState.cities[cityId];
      if (!city) return;
      const faction = city.owner ? this.gameState.factions[city.owner] : null;
      const governor = city.governor ? this.gameState.generals[city.governor] : null;
      showCityPanel(city, faction, governor, this.gameState);
    });

    // 部队点击 → 行军操作面板
    this.events.on('army-clicked', (armyId) => {
      if (this._pinchCooldown) return;
      playDrum();
      const army = this.gameState.armies[armyId];
      if (!army) return;
      hideCityPanel();
      showArmyPanel(army, this.gameState);
    });

    // 切走场景时清理
    this.events.on('shutdown', () => {
      stopBgMusic();
      hideCityPanel();
      hideDiplomacyPanel();
      hideEspionagePanel();
      hideSavePanel();
      hideArmyPanel();
      removeTurnPanel();
      destroyCityMarkers();
      destroyArmyMarkers();
      this.removeDomButton('diplomacy-btn');
      this.removeDomButton('spy-btn');
      this.removeDomButton('save-btn');
      // 清理原生 touch 监听
      const canvas = this.sys.game.canvas;
      if (this._onTouchStart) {
        canvas.removeEventListener('touchstart', this._onTouchStart);
        canvas.removeEventListener('touchmove', this._onTouchMove);
        canvas.removeEventListener('touchend', this._onTouchEnd);
        this._onTouchStart = null;
        this._onTouchMove = null;
        this._onTouchEnd = null;
      }
      // 清理 DOM 滚轮监听
      if (this._onWheel) {
        this.sys.game.canvas.removeEventListener('wheel', this._onWheel);
        this._onWheel = null;
      }
      // 清理地图纹理
      if (this.textures.exists('map-bitmap')) {
        this.textures.remove('map-bitmap');
      }
    });

    // 回合面板（右下角）
    createTurnPanel(() => {
      playDrum();
      const result = executeTurn(this.gameState);
      setTurnDisplay(result.turn);
      saveGame(this.gameState, 1, '自动存档');
      // 回合后刷新部队显示（可能有新征兵/AI出兵）
      refreshArmyMarkers(this, this.gameState.armies, this.gameState.factions);
      // 弹出回合报告
      showTurnReport(this.gameState);

      if (result.encounters && result.encounters.length > 0) {
        this.pendingEncounter = result.encounters[0];
        this.scene.sleep('MapScene');
        this.scene.launch('BattleScene', { encounter: this.pendingEncounter });
      }
    });

    // 外交按钮
    this.createDomButton('diplomacy-btn', '外交', 200, () => {
      playClick(); showDiplomacyPanel(this.gameState);
    });

    // 间谍按钮
    this.createDomButton('spy-btn', '间谍', 280, () => {
      playClick(); showEspionagePanel(this.gameState);
    });

    // 存档按钮
    this.createDomButton('save-btn', '存档', 360, () => {
      playClick(); showSavePanel(this.gameState);
    });

    // 战斗结果回调
    this.events.on('battle-ended', (battleResult) => {
      if (this.pendingEncounter) {
        applyBattleResult(this.gameState, this.pendingEncounter, battleResult);
        this.pendingEncounter = null;
      }
    });

    // 镜头归零（世界已偏移，地图自然居中）
    this.cameras.main.setScroll(0, 0);

    // 首次同步 DOM 标签
    updateCityLabelPositions(this.cameras.main);

    // 启动背景音乐（首次用户交互后才能播放，延迟一点确保 AudioContext 已解锁）
    this.time.delayedCall(500, () => startBgMusic());
  }

  // 每帧更新 DOM 标签（跟随镜头）
  update() {
    updateCityLabelPositions(this.cameras.main);
    updateArmyPositions(this.cameras.main, this.gameState.armies);
  }

  // 相机：限制在地图范围内，支持拖拽平移 + 滚轮缩放（聚焦鼠标位置）
  setupCamera() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#F0E8D8');

    // 初始缩放：手机上 0.55 起步（防止地图太小），桌面端自适应
    const fitZoom = Math.min(cam.width / MAP_W, cam.height / MAP_H);
    const minZoom = 0.50;
    cam.setZoom(Math.max(minZoom, fitZoom));

    // 缩放工具函数
    this._zoomAt = (camera, mx, my, delta) => {
      const wx = camera.scrollX + (mx - camera.width * 0.5) / camera.zoom;
      const wy = camera.scrollY + (my - camera.height * 0.5) / camera.zoom;
      const nz = Phaser.Math.Clamp(camera.zoom + delta, 0.25, 2.5);
      camera.setZoom(nz);
      camera.scrollX = wx - (mx - camera.width * 0.5) / nz;
      camera.scrollY = wy - (my - camera.height * 0.5) / nz;
    };

    // 单指拖拽 / 鼠标拖拽
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1 && p2 && p1.isDown && p2.isDown) return;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });

    // 桌面滚轮 —— 用事件自带坐标，不依赖可能过期的 activePointer
    this._onWheel = (e) => {
      e.preventDefault();
      const cvs = this.sys.game.canvas;
      const rect = cvs.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (cam.width / rect.width);
      const my = (e.clientY - rect.top) * (cam.height / rect.height);
      this._zoomAt(cam, mx, my, -e.deltaY * 0.0008);
    };
    this.sys.game.canvas.addEventListener('wheel', this._onWheel, { passive: false });

    // 手机双指缩放 —— 用原生 touch 事件，比 Phaser pointer 兼容性更好
    this._pinchDist = 0;
    this._pinchActive = false;   // 是否正在捏合中
    this._pinchCooldown = false; // 捏合结束后短暂屏蔽点击
    const canvas = this.sys.game.canvas;

    this._onTouchStart = (e) => {
      if (e.touches.length >= 2) {
        this._pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this._pinchActive = true;
      }
    };
    this._onTouchMove = (e) => {
      if (e.touches.length >= 2 && this._pinchDist > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = canvas.getBoundingClientRect();
        const gx = (mx - rect.left) * (cam.width / rect.width);
        const gy = (my - rect.top) * (cam.height / rect.height);
        this._zoomAt(cam, gx, gy, (dist - this._pinchDist) * 0.005);
        this._pinchDist = dist;
        e.preventDefault(); // 阻止浏览器处理这个 touch，避免误触
      }
    };
    this._onTouchEnd = () => {
      if (this._pinchActive) {
        // 捏合结束：设 300ms 冷却，屏蔽 Phaser 点击事件（防止误触城池）
        this._pinchCooldown = true;
        setTimeout(() => { this._pinchCooldown = false; }, 300);
      }
      this._pinchDist = 0;
      this._pinchActive = false;
    };

    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd);
  }

  // 右下角 DOM 按钮
  createDomButton(id, label, rightOffset, onClick) {
    const btn = document.createElement('div');
    btn.id = id;
    btn.style.cssText = `
      position: fixed; bottom: 16px; right: ${rightOffset}px;
      background: rgba(247,242,232,0.94); border: 1px solid #D4C5A0;
      border-radius: 6px; padding: 8px 14px; color: #3D2B1F;
      font-family: 'KaiTi', 'STKaiti', 'Microsoft YaHei', sans-serif; z-index: 500;
      cursor: pointer; font-size: 15px;
    `;
    btn.textContent = label;
    btn.onclick = onClick;
    document.body.appendChild(btn);
  }

  removeDomButton(id) {
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // 镜头对准玩家首城
  focusOnPlayerCapital() {
    const faction = this.gameState.factions[this.gameState.playerFactionId];
    if (!faction || faction.cities.length === 0) return;
    const capital = this.gameState.cities[faction.cities[0]];
    if (!capital) return;

    const pos = gridToPixel(capital.x, capital.y);
    const cam = this.cameras.main;
    cam.centerOn(pos.x, pos.y);
  }
}
