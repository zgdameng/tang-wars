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
import { saveGame } from '../logic/save-load.js';

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

    // 城池点击 → 弹出信息面板
    this.events.on('city-clicked', (cityId) => {
      const city = this.gameState.cities[cityId];
      if (!city) return;
      const faction = city.owner ? this.gameState.factions[city.owner] : null;
      const governor = city.governor ? this.gameState.generals[city.governor] : null;
      showCityPanel(city, faction, governor, this.gameState);
    });

    // 部队点击 → 显示部队信息
    this.events.on('army-clicked', (armyId) => {
      const army = this.gameState.armies[armyId];
      if (!army) return;
      const faction = this.gameState.factions[army.factionId];
      const total = army.units.reduce((s, u) => s + u.count, 0);
      const unitList = army.units.map(u => `${u.type === 'infantry' ? '步兵' : u.type === 'cavalry' ? '骑兵' : '弓兵'}×${u.count}`).join('，');
      alert(`${faction ? faction.name : '未知'}部队\n兵力：${total} 人\n编组：${unitList}\n状态：${army.state === 'idle' ? '待命' : army.state === 'moving' ? '行军中' : army.state}`);
    });

    // 切走场景时清理
    this.events.on('shutdown', () => {
      hideCityPanel();
      hideDiplomacyPanel();
      hideSavePanel();
      removeTurnPanel();
      destroyCityMarkers();
      destroyArmyMarkers();
      this.removeDomButton('diplomacy-btn');
      this.removeDomButton('save-btn');
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
      const result = executeTurn(this.gameState);
      setTurnDisplay(result.turn);
      saveGame(this.gameState, 1, '自动存档');
      // 回合后刷新部队显示（可能有新征兵/AI出兵）
      refreshArmyMarkers(this, this.gameState.armies, this.gameState.factions);

      if (result.encounters && result.encounters.length > 0) {
        this.pendingEncounter = result.encounters[0];
        this.scene.sleep('MapScene');
        this.scene.launch('BattleScene', { encounter: this.pendingEncounter });
      }
    });

    // 外交按钮
    this.createDomButton('diplomacy-btn', '外交', 200, () => {
      showDiplomacyPanel(this.gameState);
    });

    // 存档按钮
    this.createDomButton('save-btn', '存档', 280, () => {
      showSavePanel(this.gameState);
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
  }

  // 每帧更新 DOM 标签（跟随镜头）
  update() {
    updateCityLabelPositions(this.cameras.main);
    updateArmyPositions(this.cameras.main, this.gameState.armies);
  }

  // 相机：限制在地图范围内，支持拖拽平移 + 滚轮缩放（聚焦鼠标位置）
  setupCamera() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#2a4a6a');

    // 初始缩放：让地图大约占满屏幕
    const initZoom = Math.min(
      cam.width / MAP_W,
      cam.height / MAP_H
    );
    cam.setZoom(Math.max(0.28, initZoom * 0.95));

    // 按住左键拖拽
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });

    // DOM 原生滚轮缩放，缩放中心 = 鼠标指针位置
    this._onWheel = (e) => {
      e.preventDefault();
      const ptr = this.input.activePointer;

      // 缩放前指针下的世界坐标
      const worldPre = { x: 0, y: 0 };
      cam.getWorldPoint(ptr.x, ptr.y, worldPre);

      const newZoom = Phaser.Math.Clamp(cam.zoom - e.deltaY * 0.0008, 0.25, 2.5);
      cam.setZoom(newZoom);

      // 缩放后同一屏幕位置对应的世界坐标
      const worldPost = { x: 0, y: 0 };
      cam.getWorldPoint(ptr.x, ptr.y, worldPost);

      // 补偿偏移——让指针下仍是缩放前那个世界点
      cam.scrollX += worldPre.x - worldPost.x;
      cam.scrollY += worldPre.y - worldPost.y;

      // 软边界
      const vw = cam.width / cam.zoom;
      const vh = cam.height / cam.zoom;
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX, -vw * 0.3, MAP_W - vw * 0.7);
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY, -vh * 0.3, MAP_H - vh * 0.7);
    };
    this.sys.game.canvas.addEventListener('wheel', this._onWheel, { passive: false });
  }

  // 右下角 DOM 按钮
  createDomButton(id, label, rightOffset, onClick) {
    const btn = document.createElement('div');
    btn.id = id;
    btn.style.cssText = `
      position: fixed; bottom: 16px; right: ${rightOffset}px;
      background: rgba(15,15,30,0.92); border: 1px solid #665522;
      border-radius: 6px; padding: 8px 14px; color: #ccaa44;
      font-family: 'Microsoft YaHei', sans-serif; z-index: 500;
      cursor: pointer; font-size: 14px;
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
