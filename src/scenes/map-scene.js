import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { createGameState } from '../logic/game-state.js';
import { loadGameData } from '../logic/data-loader.js';
import { drawIsoMap, gridToScreen } from '../rendering/iso-renderer.js';
import { createCityMarkers, updateCityLabelPositions, destroyCityMarkers } from '../rendering/city-marker.js';
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
    this.cameras.main.setBackgroundColor('#0a1628');

    // 三种启动方式：
    // 1. data.savedGame  → 从存档恢复（直接用存档状态）
    // 2. data.playerFactionId → 新游戏选了势力
    // 3. 无参数 → 默认流程（向后兼容）
    if (data && data.savedGame) {
      this.gameState = data.savedGame;
    } else {
      this.gameState = createGameState({
        playerFactionId: data && data.playerFactionId ? data.playerFactionId : undefined
      });
      loadGameData(this.gameState);
    }

    // 生成地图数据（纯色菱形格，不同地形用不同绿色区分）
    const mapData = this.generateMapData();

    // 画菱形地图
    this.isoMap = drawIsoMap(this, mapData);

    // 放城池标记
    this.cityMarkers = createCityMarkers(this, this.gameState.cities, this.gameState.factions);

    // 相机控制：拖拽平移 + 滚轮缩放
    this.setupCamera();

    // 城池点击 → 弹出信息面板
    this.events.on('city-clicked', (cityId) => {
      const city = this.gameState.cities[cityId];
      if (!city) return;
      const faction = city.owner ? this.gameState.factions[city.owner] : null;
      const governor = city.governor ? this.gameState.generals[city.governor] : null;
      showCityPanel(city, faction, governor);
    });

    // 切走场景时清理所有 UI
    this.events.on('shutdown', () => {
      hideCityPanel();
      hideDiplomacyPanel();
      hideSavePanel();
      removeTurnPanel();
      destroyCityMarkers();
      this.removeDomButton('diplomacy-btn');
      this.removeDomButton('save-btn');
    });

    // 右下角回合面板
    createTurnPanel(() => {
      const result = executeTurn(this.gameState);
      setTurnDisplay(result.turn);
      // 每回合结束自动存档
      saveGame(this.gameState, 1, '自动存档');

      // 本回合有遭遇战 → 暂停地图，切到战场
      if (result.encounters && result.encounters.length > 0) {
        this.pendingEncounter = result.encounters[0];
        this.scene.sleep('MapScene');
        this.scene.launch('BattleScene', {
          encounter: this.pendingEncounter
        });
      }
    });

    // 外交按钮（回合面板左边）
    this.createDomButton('diplomacy-btn', '外交', 200, () => {
      showDiplomacyPanel(this.gameState);
    });

    // 存档按钮（外交按钮左边）
    this.createDomButton('save-btn', '存档', 280, () => {
      showSavePanel(this.gameState);
    });

    // 从战场唤醒时接收战斗结果
    this.events.on('battle-ended', (battleResult) => {
      if (this.pendingEncounter) {
        applyBattleResult(this.gameState, this.pendingEncounter, battleResult);
        this.pendingEncounter = null;
      }
    });

    // 将相机对准玩家势力的首城
    this.focusOnPlayerCapital();

    // 初始化 DOM 标签位置
    updateCityLabelPositions(this.cameras.main);
  }

  // 每帧更新 DOM 标签位置（跟随镜头拖拽和缩放）
  update() {
    updateCityLabelPositions(this.cameras.main);
  }

  // 生成30×30的地形格，用不同绿色模拟草原/森林/山地
  generateMapData() {
    const cols = CONFIG.MAP_COLS;
    const rows = CONFIG.MAP_ROWS;
    const tiles = [];

    for (let r = 0; r < rows; r++) {
      tiles[r] = [];
      for (let c = 0; c < cols; c++) {
        // 用坐标算一个伪随机数，确保同坐标永远同色
        const rng = ((c * 17 + r * 31) % 100) / 100;
        let color = 0x2d5a1e; // 默认：草原绿
        if (rng < 0.15) color = 0x3d6a2e; // 深绿：森林
        if (rng > 0.85) color = 0x4a7a30; // 浅绿：农田
        // 边缘放山脉（地图四周是山）
        if (c < 1 || c >= cols - 1 || r < 1 || r >= rows - 1) {
          color = 0x5a4a30; // 褐色：山
        }
        // 河流（一条斜穿的蓝带）
        if (Math.abs(c - r - 2) <= 1 || Math.abs(c + r - 35) <= 1) {
          color = 0x304a6a; // 蓝：河流
        }
        tiles[r][c] = { type: 'plain', color };
      }
    }
    return { cols, rows, tiles };
  }

  // 拖拽平移地图，滚轮缩放
  setupCamera() {
    const cam = this.cameras.main;

    // 初始偏移，把地图放在视口中央
    cam.setScroll(-400, -300);

    // 按住左键拖拽
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });

    // 滚轮缩放
    this.input.on('wheel', (_pointer, _objs, _dx, dy) => {
      const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.4, 2.5);
      cam.setZoom(newZoom);
    });
  }

  // 创建一个右下角 DOM 按钮（在回合面板左侧排开）
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

  // 从页面移除一个 DOM 按钮
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

    const pos = gridToScreen(capital.x, capital.y);
    const cam = this.cameras.main;
    cam.setScroll(pos.x - cam.width / 2, pos.y - cam.height / 2);
  }
}
