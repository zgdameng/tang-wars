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

  // 生成30×30地形格——按中国真实地理分区：西高东低、北草南丘、黄河长江横穿
  generateMapData() {
    const cols = CONFIG.MAP_COLS;
    const rows = CONFIG.MAP_ROWS;
    const tiles = [];

    // 黄河河道：上游从青藏高原流出 → 向东 → 洛阳附近向南拐 → 向东北入海
    const inYellow = (c, r) => {
      // 上游（青→甘，cols 4-8）
      if (c >= 4 && c <= 8 && Math.abs(r - 6) <= 0) return true;
      // 中游（向南拐到洛阳一带，cols 8-14）
      if (c >= 9 && c <= 14 && Math.abs(r - (7 + (c - 8) * 0.4)) <= 1) return true;
      // 下游（向东北入海，cols 14-26）
      if (c >= 15 && c <= 26 && Math.abs(r - 10) <= 1) return true;
      return false;
    };

    // 长江河道：四川盆地流出 → 经江陵襄阳 → 向东南到扬州入海
    const inYangtze = (c, r) => {
      // 上游（四川盆地东端，cols 2-8）
      if (c >= 2 && c <= 8 && Math.abs(r - 17) <= 0) return true;
      // 中游（荆襄一带，cols 8-16）
      if (c >= 9 && c <= 16 && Math.abs(r - 17) <= 1) return true;
      // 下游（江南入海，cols 16-28）
      if (c >= 17 && c <= 28 && Math.abs(r - (17 + (c - 16) * 0.25)) <= 1) return true;
      return false;
    };

    for (let r = 0; r < rows; r++) {
      tiles[r] = [];
      for (let c = 0; c < cols; c++) {
        // === 从"默认平原"开始，后面一层层覆盖 ===
        let type = 'plain';
        let color = 0x3a6a2e;   // 中原绿
        let height = 2;

        // --- 大地形区块（大面积先铺） ---

        // 青藏高原东缘（极西，灰白高海拔）
        if (c <= 3) {
          type = 'snow';
          color = 0x8a8e82;
          height = 14;
        }

        // 西部山脉（秦岭-大巴山过渡带，列4-9）
        if (c >= 4 && c <= 9) {
          type = 'mountain';
          color = 0x6a5a38;
          height = 10;
        }

        // 北方草原（地图顶部的草黄带，但不包括极西高原）
        if (r <= 4 && c >= 4) {
          type = 'steppe';
          color = 0x8a8a3e;
          height = 1;
        }

        // 华北平原（黄河下游以北，河北到中原）
        if (c >= 10 && r >= 4 && r <= 11) {
          type = 'plain';
          color = 0x5a9a3e;
          height = 2;
        }

        // 江南丘陵（长江以南、岭南以北的起伏地带）
        if (r >= 17 && r <= 24 && c >= 9) {
          type = 'hill';
          color = 0x3a7a2e;
          height = 5;
        }

        // 江南水乡（东部沿海低地）
        if (c >= 20 && r >= 12 && r <= 21) {
          type = 'farmland';
          color = 0x5aaa4e;
          height = 1;
        }

        // 岭南（极南湿热密林）
        if (r >= 24) {
          type = 'hill';
          color = 0x2a6a1e;
          height = 4;
        }

        // --- 特殊区域（小块精确修正） ---

        // 关中平原（长安凤翔一带，山区中的平川）
        if (c >= 3 && c <= 7 && r >= 8 && r <= 11) {
          type = 'plain';
          color = 0x6a9a4e;
          height = 2;
        }

        // 四川盆地（成都平原，高山环绕中的低洼沃土）
        if (c >= 1 && c <= 4 && r >= 14 && r <= 18) {
          type = 'plain';
          color = 0x5a8a3e;
          height = 2;
        }

        // --- 河流（最后覆盖，水蓝色） ---
        if (inYellow(c, r)) {
          type = 'water';
          color = 0x3060a0;
          height = 0;
        }
        if (inYangtze(c, r)) {
          type = 'water';
          color = 0x3070b0;
          height = 0;
        }

        // --- 地图边缘屏障（除非有城池需要开口） ---
        if ((c === 0 || c === cols - 1 || r === 0 || r === rows - 1) && type !== 'water') {
          const isCitySpot =
            (c === 18 && r === 2) ||   // 幽州靠北边
            (c === 1 && r === 16) ||    // 成都靠西边
            (c === 24 && r === 22) ||   // 杭州靠东边
            (c === 8 && r === 27);      // 广州靠南边
          if (!isCitySpot) {
            type = 'mountain';
            color = 0x5a4a30;
            height = 10;
          }
        }

        tiles[r][c] = { type, color, height };
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
