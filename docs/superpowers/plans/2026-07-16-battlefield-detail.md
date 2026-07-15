# 战场细节优先实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变战斗数值的前提下，让双方军阵、旗帜、尘土和交锋反馈成为战场的主体。

**Architecture:** `battle-visuals.js` 只提供可检查的军阵坐标与颜色；`BattleScene` 用这些坐标绘制军阵和短暂效果。原有兵牌继续显示兵种、人数、士气和血量。

**Tech Stack:** JavaScript、Phaser 3、Vitest、Vite。

## Global Constraints

- 视觉细节优先，不为低性能手机减少军阵、旗帜或效果。
- 不改变伤害、士气、胜负和自动战斗规则。
- 不新增第三方工具。

---

### Task 1: 绘制军阵与交锋反馈

**Files:**
- Modify: `src/rendering/battle-visuals.js`
- Modify: `src/scenes/battle-scene.js`
- Modify: `tests/rendering/battle-visuals.test.js`

**Interfaces:**
- Produces: `getBattleFormationOffsets(side)`，返回 15 个 `{ x, y }` 士兵位置。
- Produces: `getBattleDustOffsets()`，返回 6 个 `{ x, y, alpha }` 尘土位置。
- Consumes: `BattleScene.createBattleCard(unit, x, y, color, side)` 用两组位置绘制军阵与尘土。

- [ ] **Step 1: 写会失败的检查**

```js
import { getBattleFormationOffsets, getBattleDustOffsets } from '../../src/rendering/battle-visuals.js';

it('creates a fifteen-soldier formation for each side', () => {
  expect(getBattleFormationOffsets('attacker')).toHaveLength(15);
  expect(getBattleFormationOffsets('defender')).toHaveLength(15);
  expect(getBattleFormationOffsets('attacker')[0]).toEqual({ x: -28, y: 20 });
  expect(getBattleFormationOffsets('defender')[0]).toEqual({ x: 28, y: 20 });
});

it('creates six dust marks for the battle ground', () => {
  expect(getBattleDustOffsets()).toHaveLength(6);
});
```

- [ ] **Step 2: 运行检查，确认先失败**

Run: `npm.cmd test -- tests/rendering/battle-visuals.test.js`

Expected: FAIL with `getBattleFormationOffsets is not a function`.

- [ ] **Step 3: 写最小实现**

```js
export function getBattleFormationOffsets(side) {
  const direction = side === 'attacker' ? 1 : -1;
  return [
    -28, -14, 0, 14, 28,
    -21, -7, 7, 21, 35,
    -28, -14, 0, 14, 28,
  ].map((x, index) => ({
    x: x * direction,
    y: 20 + Math.floor(index / 5) * 14,
  }));
}

export function getBattleDustOffsets() {
  return [
    { x: -66, y: 58, alpha: 0.18 },
    { x: -38, y: 64, alpha: 0.14 },
    { x: -8, y: 60, alpha: 0.20 },
    { x: 20, y: 66, alpha: 0.12 },
    { x: 48, y: 59, alpha: 0.18 },
    { x: 72, y: 65, alpha: 0.10 },
  ];
}
```

`createBattleCard` 在原有兵牌之前，为每个位置添加深色身体、肤色头部和势力色圆盾；为每个尘土位置添加半透明圆形。受击时在受击军阵上方显示一次短暂的亮色斜线。

- [ ] **Step 4: 运行检查和打包**

Run: `npm.cmd test && npm.cmd run build`

Expected: all tests pass and Vite build completes.

- [ ] **Step 5: 浏览器验证**

1. 进入一场野战。
2. 截图确认双方有三排士兵、主旗和副旗。
3. 等待一次伤害，确认出现短暂的交锋亮线与数字。
4. 确认兵牌中的人数、士气和血量仍可阅读。

- [ ] **Step 6: 提交**

```bash
git add src/rendering/battle-visuals.js src/scenes/battle-scene.js tests/rendering/battle-visuals.test.js
git commit -m "feat: add detailed battlefield formations"
```
