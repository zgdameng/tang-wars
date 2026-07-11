# 写实厚重大地图美化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变游戏规则的前提下，把唐末五代大地图做成地形、城池和部队均有厚重写实感的可玩画面。

**Architecture:** 地图底图继续由 `map-bitmap.js` 生成，加入统一的土地、山岩、河岸和森林细节。城池与部队保持独立标记层，分别强化建筑轮廓和军旗队列；`MapScene` 只负责装配与相机，不承载美术绘制规则。

**Tech Stack:** JavaScript、Phaser 3、Canvas、Vite、Vitest、Playwright 截图检查。

## Global Constraints

- 不改变城池归属、行军、外交、间谍、战斗或存档规则。
- 二十座城池在默认视野下必须可辨认、可点击。
- 核心细节在所有手机上始终显示；仅可减少肉眼不明显的烟尘与粒子数量。
- 横屏和竖屏下，地图操作区不得遮挡右下角主要按钮。
- 保留单指拖动、双指缩放、鼠标滚轮缩放与现有城池/部队点击。
- 不增加外部在线图片依赖；所有纹理由现有 Canvas 绘制。

---

### Task 1: 厚重地形与河流底图

**Files:**
- Modify: `src/rendering/map-bitmap.js`
- Test: `npm run build`

**Interfaces:**
- Consumes: `generateMapBitmap(state)` 和现有 `MAP_W`、`MAP_H`。
- Produces: 仍为 `generateMapBitmap(state) -> HTMLCanvasElement`，供 `MapScene` 直接使用。

- [ ] **Step 1: 记录当前地图截图**

运行开发服务器，分别保存桌面与手机默认视野截图，作为美化前对照。截图中应包含至少一条大河、两种地貌和三个城池。

- [ ] **Step 2: 调整土地色彩与光影**

将 `renderSmall` 内按高度分配颜色的部分改为以下更沉稳的颜色，并保持 `computeShade` 的明暗计算：

```js
if (elev < 3)       { r = 25;  g = 54;  b = 92;  }
else if (elev < 8)  { r = 56;  g = 90;  b = 102; }
else if (elev < 20) { r = 93;  g = 118; b = 59;  }
else if (elev < 50) { r = 104; g = 126; b = 65;  }
else if (elev < 95) { r = 137; g = 111; b = 64;  }
else if (elev < 150){ r = 128; g = 103; b = 75;  }
else if (elev < 205){ r = 151; g = 142; b = 120; }
else                { r = 205; g = 204; b = 192; }
```

在 `addGroundGrain` 后增加 `paintTerrainWash(ctx)`；它以固定种子的短笔触，在平原、黄土、山地各画一层不透明度不超过 `0.10` 的纹理，避免缩放后出现大片单色。

- [ ] **Step 3: 加强河岸与山体体积**

在 `paintRiverPath` 中保留三层河道，改为“深色河岸、蓝灰河水、窄亮面”的顺序：

```js
ctx.strokeStyle = 'rgba(31, 45, 43, 0.48)';
ctx.lineWidth = w + 16;
// 河水
ctx.strokeStyle = '#3d7187';
ctx.lineWidth = w;
// 水面亮线
ctx.strokeStyle = 'rgba(188, 213, 205, 0.34)';
ctx.lineWidth = Math.max(2, w * 0.18);
```

在 `drawPeak` 的山体深色面之后，增加向右下延伸的半透明阴影三角形；亮面保留在左上。每个阴影的透明度固定为 `0.28`，使山脉在任何设备上都有高度感。

- [ ] **Step 4: 验证底图可构建**

运行：`npm run build`

预期：命令以 `built in` 结束，没有 JavaScript 语法错误。

- [ ] **Step 5: 提交**

```bash
git add src/rendering/map-bitmap.js
git commit -m "feat: deepen map terrain rendering"
```

### Task 2: 城池地标与可读名称

**Files:**
- Modify: `src/rendering/city-marker.js`
- Test: `npm run build`

**Interfaces:**
- Consumes: `createCityMarkers(scene, cities, factions)`。
- Produces: 相同函数签名；每座城继续拥有可点击区域与名称标签。

- [ ] **Step 1: 增加不改变点击范围的城池底座**

在 `_drawCastle` 中、建筑主体之前绘制固定大小的深灰石基座。基座中心使用现有 `cx`、`cy`，不得移动 `hitZone`：

```js
gfx.fillStyle(0x28251F, 0.55);
gfx.fillEllipse(cx + 2, cy + 12, 42, 12);
gfx.fillStyle(0x766B58, 0.90);
gfx.fillEllipse(cx, cy + 10, 38, 10);
gfx.fillStyle(0xB2A481, 0.35);
gfx.fillEllipse(cx - 4, cy + 8, 22, 4);
```

- [ ] **Step 2: 强化城墙、屋顶和军旗层次**

在四种城池绘制函数中统一使用三层结构：深色阴影墙面、石块或砖线、中亮色顶部。旗帜保留势力颜色，但增加暗红或深褐描边：

```js
gfx.lineStyle(1, 0x2A2119, 0.75);
gfx.strokeTriangle(px + 1, top + 2, px + 1, top + 7, px + 7, top + 4);
```

建筑主色不得全部替换为势力颜色，势力颜色只用于旗帜、城门饰条和悬停高亮。

- [ ] **Step 3: 调整名称标签的对比度**

保留现有 DOM 名称标签位置算法。在标签样式中使用深褐文字、浅纸底和两层投影：

```js
color: #2B241B;
background: rgba(239, 229, 202, 0.90);
border: 1px solid rgba(80, 62, 42, 0.72);
box-shadow: 0 1px 0 rgba(255,255,255,0.45), 0 2px 5px rgba(0,0,0,0.40);
```

- [ ] **Step 4: 验证城池交互未被破坏**

运行：`npm run build`，再打开游戏并点击任意己方城池与敌方城池。

预期：两次点击均弹出原有城池面板；鼠标移入与移出仍有高亮变化。

- [ ] **Step 5: 提交**

```bash
git add src/rendering/city-marker.js
git commit -m "feat: enrich city landmarks"
```

### Task 3: 行军部队、军旗与移动提示

**Files:**
- Modify: `src/rendering/army-marker.js`
- Test: `npm run build`

**Interfaces:**
- Consumes: `createArmyMarkers(scene, armies, factions)`、`updateArmyPositions(camera, armies)`。
- Produces: 保持相同导出；部队可点击，移动状态仍随镜头更新。

- [ ] **Step 1: 用小队列替代单一三角箭头的视觉主体**

在 `createArmyMarkers` 中保留现有三角形与 `hitZone`，再增加三名士兵剪影和一面旗。士兵与旗的图形对象都设置为深度 `15`：

```js
const soldiers = [-8, 0, 8].map((offset) => {
  const body = scene.add.rectangle(x + offset, y + 4, 4, 8, 0x2B241B);
  const head = scene.add.circle(x + offset, y - 2, 2, 0xC7AE82);
  body.setDepth(15); head.setDepth(15);
  return { body, head };
});
const pole = scene.add.rectangle(x - 11, y - 12, 2, 24, 0x3D2B1F).setDepth(15);
const banner = scene.add.triangle(x - 6, y - 10, 0, 0, 0, 8, 11, 4, color).setDepth(15);
```

将这些对象存入 `markers`，以便更新和销毁。

- [ ] **Step 2: 同步移动与销毁所有新图形**

在 `updateArmyPositions` 中为每个 `soldier`、`pole` 和 `banner` 写入与 `sprite` 相同的 `pos.x`、`pos.y - 4` 偏移；移动时旗帜沿 `x` 方向额外摆动 `Math.sin(Date.now() / 180) * 2`。在 `destroyArmyMarkers` 中依次调用每个新增图形的 `destroy()`。

- [ ] **Step 3: 保留清晰的人数与移动文字**

静止部队标签使用 `"${totalCount}兵"`；行军标签使用 `"行军 ${totalCount}兵 · ${army.moveTurnsRemaining || '?'}回合"`。标签的文字必须保持深褐色或金色，不增加图标字体依赖。

- [ ] **Step 4: 验证行军流程**

运行：`npm run build`，进入游戏后征一队兵，选择目标城池并行军。

预期：静止时看见旗帜和三名士兵；行军时位置与标签一起更新；点击部队仍能打开原有部队面板。

- [ ] **Step 5: 提交**

```bash
git add src/rendering/army-marker.js
git commit -m "feat: add marching army visuals"
```

### Task 4: 桌面与手机画面验收

**Files:**
- Modify: `docs/game-manual.md`
- Test: `npm run build`

**Interfaces:**
- Consumes: Task 1 至 Task 3 的渲染结果和现有操作流程。
- Produces: 更新后的人工验收记录，不改变游戏运行接口。

- [ ] **Step 1: 检查桌面默认视野**

以 1280 x 720 打开新游戏并截图。检查二十座城池中当前视野内的城池名称、建筑、河流和山脉是否清楚，且右下角按钮没有覆盖地图点击目标。

- [ ] **Step 2: 检查手机竖屏和横屏**

以 390 x 844 和 844 x 390 打开地图。分别尝试单指拖动、双指缩放、点击城池、点击部队。

预期：山河、城池、军旗和士兵均可见；任何方向下主要按钮都不遮挡城池面板的关闭与操作区域。

- [ ] **Step 3: 记录结果**

在 `docs/game-manual.md` 的“验证结果”表后增加三行：`写实地形`、`城池地标`、`行军部队`。每行注明桌面、竖屏、横屏是否通过，并链接对应截图文件名。

- [ ] **Step 4: 完整构建检查**

运行：`npm run build`

预期：命令成功结束；浏览器控制台没有未捕获错误。

- [ ] **Step 5: 提交**

```bash
git add docs/game-manual.md
git commit -m "docs: record map visual verification"
```

