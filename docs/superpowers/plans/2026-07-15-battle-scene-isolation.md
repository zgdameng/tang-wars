# 战场独立画面实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 战斗时只显示战场，结束后恢复完整大地图界面。

**Architecture:** 地图界面保留在内存中，不删除。`MapScene` 提供进入与离开战场的两个动作，分别控制城名、部队人数和地图按钮的显示；`BattleScene` 结束时通知地图恢复。

**Tech Stack:** JavaScript、Phaser 3、Vitest、Vite。

## Global Constraints

- 不改变战斗规则、城市数据、部队数据或存档格式。
- 不新增第三方依赖。
- 浏览器流程必须验证进入战场和战后返回地图。

---

### Task 1: 战场切换时隐藏和恢复地图界面

**Files:**
- Modify: `src/rendering/city-marker.js`
- Modify: `src/rendering/army-marker.js`
- Modify: `src/ui/turn-panel.js`
- Modify: `src/scenes/map-scene.js`
- Modify: `src/scenes/battle-scene.js`
- Test: `tests/rendering/city-marker.test.js`

**Interfaces:**
- Produces: `setCityMarkersVisible(visible)`、`setArmyMarkersVisible(visible)`、`setTurnPanelVisible(visible)`。
- Consumes: `MapScene.enterBattle()` 在战斗开始前调用三个隐藏入口；`MapScene.restoreMapUi()` 在战斗结束后调用三个恢复入口。

- [ ] **Step 1: 写会失败的检查**

```js
import { setCityMarkersVisible } from '../../src/rendering/city-marker.js';

it('exports a city marker visibility control', () => {
  expect(typeof setCityMarkersVisible).toBe('function');
});
```

- [ ] **Step 2: 运行检查，确认先失败**

Run: `npm.cmd test -- tests/rendering/city-marker.test.js`

Expected: FAIL with `setCityMarkersVisible is not a function`.

- [ ] **Step 3: 写最小实现**

```js
export function setCityMarkersVisible(visible) {
  if (containerEl) containerEl.style.display = visible ? '' : 'none';
  for (const marker of markers) {
    marker.circle?.setVisible(visible);
  }
}

export function setArmyMarkersVisible(visible) {
  if (containerEl) containerEl.style.display = visible ? '' : 'none';
  for (const marker of markers) {
    marker.sprite?.setVisible(visible);
    marker.outline?.setVisible(visible);
    marker.hitZone?.setVisible(visible);
  }
}

export function setTurnPanelVisible(visible) {
  if (panelEl) panelEl.style.display = visible ? 'flex' : 'none';
}
```

```js
enterBattle(encounter) {
  hideCityPanel();
  hideArmyPanel();
  hideDiplomacyPanel();
  hideEspionagePanel();
  hideSavePanel();
  setCityMarkersVisible(false);
  setArmyMarkersVisible(false);
  setTurnPanelVisible(false);
  this.removeDomButton('diplomacy-btn');
  this.removeDomButton('spy-btn');
  this.removeDomButton('save-btn');
  this.scene.sleep('MapScene');
  this.scene.launch('BattleScene', { encounter });
}
```

- [ ] **Step 4: 在战斗结束时恢复**

```js
restoreMapUi() {
  setCityMarkersVisible(true);
  setArmyMarkersVisible(true);
  setTurnPanelVisible(true);
  this.createDomButton('diplomacy-btn', '外交', 200, () => {
    playClick(); showDiplomacyPanel(this.gameState);
  });
  this.createDomButton('spy-btn', '间谍', 280, () => {
    playClick(); showEspionagePanel(this.gameState);
  });
  this.createDomButton('save-btn', '存档', 360, () => {
    playClick(); showSavePanel(this.gameState);
  });
}
```

`BattleScene.endBattle()` 在唤醒 `MapScene` 前恢复界面：

```js
const mapScene = this.scene.get('MapScene');
mapScene.events.emit('battle-ended', result);
mapScene.restoreMapUi();
this.scene.stop('BattleScene');
this.scene.wake('MapScene');
```

- [ ] **Step 5: 运行检查和打包**

Run: `npm.cmd test && npm.cmd run build`

Expected: all tests pass and Vite build completes.

- [ ] **Step 6: 浏览器验证**

1. 新游戏，选择李克用。
2. 太原征募步兵一队，行军到洛阳。
3. 两次结束回合后关闭回合报告。
4. 确认战场无城名、部队数字、回合按钮、外交、间谍、存档按钮。
5. 结束战斗，确认上述地图界面恢复。

- [ ] **Step 7: 提交**

```bash
git add src/rendering/city-marker.js src/rendering/army-marker.js src/ui/turn-panel.js src/scenes/map-scene.js src/scenes/battle-scene.js tests/rendering/city-marker.test.js
git commit -m "fix: hide map interface during battles"
```
