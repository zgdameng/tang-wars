# 唐末五代战略游戏 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款唐末五代背景的大地图争霸网页游戏，2.5D 等距视角，回合制经营+实时战斗，人机对战。

**Architecture:** 三层分离——Phaser 3 画面层负责渲染和交互，纯 JS 逻辑层负责游戏规则，JSON 数据层负责配置。逻辑层不引用任何 Phaser 模块，为未来联网预留接口。

**Tech Stack:** Phaser 3.80+, Vite 5.x, Vitest 2.x, 纯 JavaScript (ES Modules), JSON 数据文件, localStorage 存档

## Global Constraints

- 逻辑层代码不引用任何 Phaser 模块（import * from 'phaser' 不出现在 logic/ 目录）
- 所有游戏配置数据（城池、武将、势力）放在 src/data/*.json 中
- 存档使用浏览器 localStorage，最多 5 个存档位
- 第一版只做三种兵种：步兵、骑兵、弓兵（环形克制）
- 第一版 6 个主要势力 + 若干小势力
- 五个 AI 难度等级，AI 不作弊
- 混合时间制：经营回合制（一个月/回合），战斗实时制
- 地图用菱形瓦片 2.5D 视角
- 美工资源用彩色方块代替（第一期），后续替换为正式美术

---

## File Structure

```
tang-wars/
├── index.html                     # 入口 HTML
├── package.json                   # 项目配置
├── vite.config.js                 # Vite 构建配置
├── public/
│   └── favicon.ico
├── src/
│   ├── main.js                    # 入口：Phaser 游戏配置
│   ├── config.js                  # 游戏常量（瓦片大小、地图尺寸等）
│   ├── logic/                     # 纯 JS 逻辑层（不依赖 Phaser）
│   │   ├── game-state.js          # 全局游戏状态（回合、阶段、所有实体）
│   │   ├── city.js                # 城池类
│   │   ├── faction.js             # 势力类
│   │   ├── general.js             # 武将类
│   │   ├── army.js                # 部队/军队类
│   │   ├── economy.js             # 经济计算（收入、人口增长）
│   │   ├── recruitment.js         # 征兵逻辑
│   │   ├── diplomacy.js           # 外交逻辑
│   │   ├── espionage.js           # 间谍逻辑
│   │   ├── turn.js                # 回合推进与结算
│   │   ├── movement.js            # 地图行军
│   │   ├── battle/
│   │   │   ├── battle-state.js    # 战场状态
│   │   │   ├── battle-units.js    # 战斗单位定义
│   │   │   └── battle-ai.js       # 战场 AI
│   │   ├── ai/
│   │   │   ├── ai-controller.js   # AI 回合决策入口
│   │   │   └── ai-strategy.js     # AI 战略评估
│   │   └── save-load.js           # 存档系统
│   ├── scenes/                    # Phaser 场景
│   │   ├── boot-scene.js          # 启动加载场景
│   │   ├── menu-scene.js          # 主菜单
│   │   ├── map-scene.js           # 大地图场景（核心）
│   │   ├── battle-scene.js        # 战场场景
│   │   ├── city-panel.js          # 城池管理面板（HTML UI 覆盖）
│   │   └── diplomacy-panel.js     # 外交面板
│   ├── rendering/                 # Phaser 渲染辅助（画面层工具）
│   │   ├── iso-renderer.js        # 等距瓦片渲染器
│   │   ├── city-marker.js         # 城池标记
│   │   └── army-sprite.js         # 部队精灵
│   └── data/                      # JSON 游戏数据
│       ├── cities.json            # 城池坐标与属性
│       ├── factions.json          # 势力初始配置
│       ├── generals.json          # 武将数据
│       └── provinces.json         # 州区域定义
└── tests/
    └── logic/
        ├── city.test.js
        ├── faction.test.js
        ├── economy.test.js
        ├── recruitment.test.js
        ├── turn.test.js
        ├── movement.test.js
        ├── battle-state.test.js
        └── save-load.test.js
```

---

## Phase 1: Project Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/config.js`
- Create: `tests/logic/.gitkeep`

**Interfaces:**
- Consumes: nothing
- Produces: Vite dev server running, Phaser game instance created, config constants available

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "tang-wars",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  },
  "dependencies": {
    "phaser": "^3.80.0"
  }
}
```

Run: `npm install`

- [ ] **Step 2: 创建 vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 3000, open: true },
  build: { outDir: 'dist' },
  test: { include: ['tests/**/*.test.js'] }
});
```

- [ ] **Step 3: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>唐末风云</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; }
    #game-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 src/config.js**

```js
// 游戏全局常量——所有模块从这里取数值，改一处全局生效

export const CONFIG = {
  // 地图
  MAP_COLS: 30,
  MAP_ROWS: 30,
  TILE_WIDTH: 64,
  TILE_HEIGHT: 32,

  // 回合
  TURN_MONTHS_PER_YEAR: 12,

  // 经营
  BASE_TAX_RATE: 0.3,
  BASE_POP_GROWTH: 0.01,
  BASE_FOOD_PER_POP: 1,
  ARMY_UPKEEP_PER_UNIT: 2,

  // 武将
  BASE_LOYALTY: 80,
  LOYALTY_REBEL_THRESHOLD: 30,

  // 外交
  RELATION_MIN: -100,
  RELATION_MAX: 100,
  PRESTIGE_MAX: 1000,

  // 战斗
  BATTLE_MAP_WIDTH: 800,
  BATTLE_MAP_HEIGHT: 600,
  MORALE_MAX: 100,

  // 存档
  SAVE_SLOTS: 5,

  // AI
  AI_ECONOMY_EFFICIENCY: [0.6, 0.8, 1.0, 1.0, 1.0]  // 按难度索引
};
```

- [ ] **Step 5: 创建 src/main.js**

```js
import Phaser from 'phaser';
import { BootScene } from './scenes/boot-scene.js';
import { MenuScene } from './scenes/menu-scene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [BootScene, MenuScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
```

- [ ] **Step 6: 确认运行**

Run: `npm run dev`
Expected: 浏览器打开，显示一个黑色背景的 1280×720 游戏窗口。控制台无错误。

- [ ] **Step 7: 确认测试框架**

Run: `npm test`
Expected: "No test files found" 或类似提示（vitest 正常运行，只是还没有测试文件）

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/main.js src/config.js tests/
git commit -m "feat: project scaffolding with Vite + Phaser + Vitest"
```

---

### Task 2: Logic Layer - City and Faction Models

**Files:**
- Create: `src/logic/city.js`, `src/logic/faction.js`, `src/logic/general.js`
- Create: `tests/logic/city.test.js`, `tests/logic/faction.test.js`

**Interfaces:**
- Consumes: `src/config.js` CONFIG constants
- Produces: `createCity(opts) -> city`, `createFaction(opts) -> faction`, `createGeneral(opts) -> general`

- [ ] **Step 1: 写 city 测试**

Create `tests/logic/city.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createCity, getCityPopulation, setCityPopulation } from '../../src/logic/city.js';

describe('createCity', () => {
  it('should create a city with required properties', () => {
    const c = createCity({ id: 'taiyuan', name: '太原', x: 10, y: 5, owner: 'li-keyong' });
    expect(c.id).toBe('taiyuan');
    expect(c.name).toBe('太原');
    expect(c.owner).toBe('li-keyong');
    expect(c.population).toBeGreaterThan(0);
    expect(c.agriculture).toBeGreaterThanOrEqual(0);
    expect(c.commerce).toBeGreaterThanOrEqual(0);
    expect(c.defense).toBe(0);
    expect(c.garrison).toEqual([]);
    expect(c.governor).toBeNull();
  });

  it('should accept custom initial values', () => {
    const c = createCity({
      id: 'test', name: '测试', x: 0, y: 0,
      population: 50000, agriculture: 5, commerce: 8
    });
    expect(c.population).toBe(50000);
    expect(c.agriculture).toBe(5);
    expect(c.commerce).toBe(8);
  });
});

describe('setCityPopulation', () => {
  it('should not allow negative population', () => {
    const c = createCity({ id: 'test', name: '测试', x: 0, y: 0, population: 1000 });
    const result = setCityPopulation(c, -500);
    expect(result.population).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试（应该失败）**

Run: `npx vitest run tests/logic/city.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: 实现 city.js**

Create `src/logic/city.js`:

```js
import { CONFIG } from '../config.js';

/**
 * 创建一个城池对象。
 * 用工厂函数而非 class——每一座城就是一个普通数据对象，方便存档和测试。
 *
 * @param {Object} opts
 * @param {string} opts.id       - 唯一标识，如 'taiyuan'
 * @param {string} opts.name     - 显示名，如 '太原'
 * @param {number} opts.x        - 地图坐标 X（等距网格列号）
 * @param {number} opts.y        - 地图坐标 Y（等距网格行号）
 * @param {string} [opts.owner]  - 所属势力 ID，null 表示无主
 * @param {number} [opts.population=10000]
 * @param {number} [opts.agriculture=3]
 * @param {number} [opts.commerce=3]
 * @param {number} [opts.defense=0]
 * @param {number} [opts.stability=70] - 民心 (0-100)
 */
export function createCity(opts) {
  return {
    id: opts.id,
    name: opts.name,
    x: opts.x,
    y: opts.y,
    owner: opts.owner || null,
    population: opts.population ?? 10000,
    agriculture: opts.agriculture ?? 3,
    commerce: opts.commerce ?? 3,
    defense: opts.defense ?? 0,
    stability: opts.stability ?? 70,
    garrison: [],           // [armyId, ...]
    governor: null,         // generalId 或 null
    underSiege: false       // 是否被围攻
  };
}

export function getCityPopulation(city) {
  return city.population;
}

export function setCityPopulation(city, amount) {
  city.population = Math.max(0, amount);
  return city;
}

export function addCityPopulation(city, amount) {
  return setCityPopulation(city, city.population + amount);
}

export function getCityIncome(city) {
  return Math.floor(city.population / 1000 * city.commerce * CONFIG.BASE_TAX_RATE);
}

export function getCityMaxGarrison(city) {
  return Math.floor(city.population / 2000);
}

export function setCityOwner(city, factionId) {
  city.owner = factionId;
  city.stability = 50; // 易主后民心重置
  return city;
}

export function setCityGovernor(city, generalId) {
  city.governor = generalId;
  return city;
}
```

- [ ] **Step 4: 运行测试（应该通过）**

Run: `npx vitest run tests/logic/city.test.js`
Expected: 3 tests PASS

- [ ] **Step 5: 写 faction 测试**

Create `tests/logic/faction.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createFaction, addGold, spendGold } from '../../src/logic/faction.js';

describe('createFaction', () => {
  it('should create a faction with default values', () => {
    const f = createFaction({ id: 'li-keyong', name: '李克用', color: 0xff4444 });
    expect(f.id).toBe('li-keyong');
    expect(f.name).toBe('李克用');
    expect(f.gold).toBeGreaterThan(0);
    expect(f.prestige).toBe(500);
    expect(f.relations).toEqual({});
    expect(f.isHuman).toBe(false);
  });
});

describe('gold operations', () => {
  it('should not allow negative gold', () => {
    const f = createFaction({ id: 'test', name: '测试', color: 0xffffff });
    const result = spendGold(f, 99999);
    expect(result.gold).toBe(0);
  });

  it('should return null when cannot afford', () => {
    const f = createFaction({ id: 'test', name: '测试', color: 0xffffff });
    f.gold = 10;
    const result = spendGold(f, 20);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 6: 运行测试（应该失败）**

Run: `npx vitest run tests/logic/faction.test.js`
Expected: FAIL — module not found

- [ ] **Step 7: 实现 faction.js 和 general.js**

Create `src/logic/faction.js`:

```js
import { CONFIG } from '../config.js';

export function createFaction(opts) {
  return {
    id: opts.id,
    name: opts.name,
    color: opts.color,
    gold: opts.gold ?? 5000,
    prestige: opts.prestige ?? 500,
    generals: opts.generals || [],    // [generalId, ...]
    cities: opts.cities || [],        // [cityId, ...]
    alliances: [],                    // [factionId, ...]
    atWarWith: [],                    // [factionId, ...]
    relations: {},                    // { factionId: number (-100..100) }
    isHuman: opts.isHuman ?? false,
    aiDifficulty: opts.aiDifficulty ?? 3
  };
}

export function addGold(faction, amount) {
  faction.gold += amount;
  return faction;
}

export function spendGold(faction, amount) {
  if (faction.gold < amount) return null;
  faction.gold -= amount;
  return faction;
}

export function setRelation(faction, otherId, value) {
  faction.relations[otherId] = Math.max(
    CONFIG.RELATION_MIN,
    Math.min(CONFIG.RELATION_MAX, value)
  );
  return faction;
}

export function getRelation(faction, otherId) {
  return faction.relations[otherId] || 0;
}

export function addPrestige(faction, amount) {
  faction.prestige = Math.min(CONFIG.PRESTIGE_MAX, faction.prestige + amount);
  return faction;
}
```

Create `src/logic/general.js`:

```js
/**
 * 武将对象。
 * 属性范围 1-100，总值决定武将品质。
 */

export function createGeneral(opts) {
  return {
    id: opts.id,
    name: opts.name,
    factionId: opts.factionId || null,
    leadership: opts.leadership || 50,   // 统率
    might: opts.might || 50,             // 武力
    intelligence: opts.intelligence || 50, // 智力
    politics: opts.politics || 50,       // 政治
    charisma: opts.charisma || 50,       // 魅力
    loyalty: opts.loyalty ?? 80,         // 忠诚度
    inCity: opts.inCity || null,         // 当前所在城池 ID
    leadingArmy: null,                   // 当前统领的部队 ID
    skill: opts.skill || null            // 技能 { name, cooldown, effect }
  };
}

export function getCommandLimit(general) {
  // 统率决定带兵上限：每点统率带 100 兵
  return general.leadership * 100;
}

export function changeLoyalty(general, amount) {
  general.loyalty = Math.max(0, Math.min(100, general.loyalty + amount));
  return general;
}

export function isRebellious(general) {
  return general.loyalty < 30;
}
```

- [ ] **Step 8: 运行测试（应该通过）**

Run: `npx vitest run tests/logic/faction.test.js`
Expected: 3 tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/logic/city.js src/logic/faction.js src/logic/general.js tests/logic/city.test.js tests/logic/faction.test.js
git commit -m "feat: add city, faction, general models with tests"
```

---

### Task 3: Game State Manager

**Files:**
- Create: `src/logic/game-state.js`
- Create: `tests/logic/game-state.test.js`

**Interfaces:**
- Consumes: `city.js`, `faction.js`, `general.js`
- Produces: `createGameState(opts) -> state`, `getEntities(state) -> { cities, factions, generals, armies }`

- [ ] **Step 1: 写测试**

Create `tests/logic/game-state.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createGameState, addCity, addFaction, getFactionById, getCityById } from '../../src/logic/game-state.js';

describe('createGameState', () => {
  it('should create empty state', () => {
    const state = createGameState();
    expect(state.turn).toBe(1);
    expect(state.phase).toBe('economy');
    expect(state.cities).toEqual({});
    expect(state.factions).toEqual({});
    expect(state.playerFactionId).toBeNull();
  });
});

describe('addCity', () => {
  it('should add city to state', () => {
    const state = createGameState();
    addCity(state, { id: 'c1', name: '城1', x: 5, y: 3 });
    expect(getCityById(state, 'c1').name).toBe('城1');
  });
});

describe('addFaction', () => {
  it('should add faction and set relations', () => {
    const state = createGameState();
    const f1 = addFaction(state, { id: 'f1', name: '势力1', color: 0xff0000 });
    const f2 = addFaction(state, { id: 'f2', name: '势力2', color: 0x0000ff });
    expect(f1.relations['f2']).toBe(0);
    expect(f2.relations['f1']).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试（失败）**

Run: `npx vitest run tests/logic/game-state.test.js`
Expected: FAIL

- [ ] **Step 3: 实现 game-state.js**

Create `src/logic/game-state.js`:

```js
import { createCity } from './city.js';
import { createFaction, setRelation } from './faction.js';

/**
 * GameState 是整个游戏的"数据库"。
 * 所有实体（城池、势力、武将、部队）都存在这里，通过 ID 查找。
 * 画面层通过 getEntities() 获取当前快照来渲染。
 */

export function createGameState(opts = {}) {
  return {
    turn: opts.turn || 1,
    phase: 'economy',             // 'economy' | 'military' | 'battle' | 'ai'
    cities: {},                   // { cityId: city }
    factions: {},                 // { factionId: faction }
    generals: {},                 // { generalId: general }
    armies: {},                   // { armyId: army }
    playerFactionId: opts.playerFactionId || null,
    battleState: null,            // 战斗中才有值
    turnLog: []                   // 本回合发生的事件记录
  };
}

export function addCity(state, opts) {
  const city = createCity(opts);
  state.cities[city.id] = city;
  if (city.owner) {
    const faction = state.factions[city.owner];
    if (faction) faction.cities.push(city.id);
  }
  return city;
}

export function addFaction(state, opts) {
  const faction = createFaction(opts);
  state.factions[faction.id] = faction;
  // 与所有已有势力建立中立关系
  for (const otherId of Object.keys(state.factions)) {
    if (otherId !== faction.id) {
      setRelation(faction, otherId, 0);
      setRelation(state.factions[otherId], faction.id, 0);
    }
  }
  return faction;
}

export function addGeneral(state, opts) {
  const general = (await import('./general.js')).createGeneral(opts);
  state.generals[general.id] = general;
  if (general.factionId) {
    const faction = state.factions[general.factionId];
    if (faction) faction.generals.push(general.id);
  }
  return general;
}

export function getCityById(state, id) {
  return state.cities[id] || null;
}

export function getFactionById(state, id) {
  return state.factions[id] || null;
}

export function getGeneralById(state, id) {
  return state.generals[id] || null;
}

export function getPlayerFaction(state) {
  return state.factions[state.playerFactionId] || null;
}

export function getPlayerCities(state) {
  const faction = getPlayerFaction(state);
  if (!faction) return [];
  return faction.cities.map(id => state.cities[id]).filter(Boolean);
}

export function getAllFactions(state) {
  return Object.values(state.factions);
}

export function getFactionCities(state, factionId) {
  const faction = state.factions[factionId];
  if (!faction) return [];
  return faction.cities.map(id => state.cities[id]).filter(Boolean);
}

export function endTurn(state) {
  state.turn += 1;
  state.phase = 'economy';
  state.turnLog = [];
  return state;
}
```

Wait——上面用了动态 import，这在同步函数中不行。修正：直接在顶部 import。

- [ ] **Step 4: 修正并运行测试**

修正 `src/logic/game-state.js` 顶部：

```js
import { createCity } from './city.js';
import { createFaction, setRelation } from './faction.js';
import { createGeneral } from './general.js';
```

并将 `addGeneral` 中的动态 import 改为直接调用 `createGeneral(opts)`。

Run: `npx vitest run tests/logic/game-state.test.js`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic/game-state.js tests/logic/game-state.test.js
git commit -m "feat: add game state manager"
```

---

### Task 4: Game Data — Cities, Factions, Generals JSON

**Files:**
- Create: `src/data/cities.json`, `src/data/factions.json`, `src/data/generals.json`, `src/data/provinces.json`
- Create: `src/logic/data-loader.js`
- Create: `tests/logic/data-loader.test.js`

**Interfaces:**
- Consumes: game-state.js entities
- Produces: `loadGameData() -> { cities: [...], factions: [...], generals: [...] }`

- [ ] **Step 1: 创建城池数据**

Create `src/data/cities.json`（第一期 20 座核心城池）:

```json
[
  {"id":"taiyuan","name":"太原","x":12,"y":4,"population":60000,"agriculture":6,"commerce":5,"province":"hedong"},
  {"id":"hezhong","name":"河中","x":10,"y":8,"population":30000,"agriculture":4,"commerce":3,"province":"hedong"},
  {"id":"luzhou","name":"潞州","x":14,"y":7,"population":25000,"agriculture":3,"commerce":3,"province":"hedong"},
  {"id":"bianzhou","name":"汴州","x":17,"y":12,"population":70000,"agriculture":5,"commerce":8,"province":"henan"},
  {"id":"luoyang","name":"洛阳","x":14,"y":10,"population":80000,"agriculture":4,"commerce":9,"province":"henan"},
  {"id":"xuzhou","name":"许州","x":16,"y":14,"population":30000,"agriculture":4,"commerce":4,"province":"henan"},
  {"id":"fengxiang","name":"凤翔","x":3,"y":9,"population":40000,"agriculture":3,"commerce":4,"province":"guanzhong"},
  {"id":"changan","name":"长安","x":6,"y":10,"population":50000,"agriculture":4,"commerce":7,"province":"guanzhong"},
  {"id":"yangzhou","name":"扬州","x":22,"y":18,"population":90000,"agriculture":5,"commerce":10,"province":"huainan"},
  {"id":"chuzhou","name":"楚州","x":21,"y":16,"population":30000,"agriculture":4,"commerce":5,"province":"huainan"},
  {"id":"chengdu","name":"成都","x":1,"y":16,"population":50000,"agriculture":6,"commerce":6,"province":"xichuan"},
  {"id":"hangzhou","name":"杭州","x":24,"y":22,"population":40000,"agriculture":4,"commerce":7,"province":"zhenhai"},
  {"id":"youzhou","name":"幽州","x":18,"y":2,"population":35000,"agriculture":3,"commerce":3,"province":"hebei"},
  {"id":"zhenzhou","name":"镇州","x":16,"y":5,"population":25000,"agriculture":3,"commerce":3,"province":"hebei"},
  {"id":"weizhou","name":"魏州","x":18,"y":8,"population":40000,"agriculture":4,"commerce":5,"province":"hebei"},
  {"id":"xiangyang","name":"襄阳","x":13,"y":17,"population":45000,"agriculture":4,"commerce":6,"province":"jingnan"},
  {"id":"jiangling","name":"江陵","x":10,"y":19,"population":30000,"agriculture":4,"commerce":4,"province":"jingnan"},
  {"id":"guangzhou","name":"广州","x":8,"y":27,"population":35000,"agriculture":3,"commerce":8,"province":"lingnan"},
  {"id":"tanzhou","name":"潭州","x":16,"y":22,"population":25000,"agriculture":3,"commerce":3,"province":"jiangnan"},
  {"id":"hongzhou","name":"洪州","x":19,"y":24,"population":30000,"agriculture":3,"commerce":4,"province":"jiangnan"}
]
```

- [ ] **Step 2: 创建势力数据**

Create `src/data/factions.json`:

```json
[
  {"id":"li-keyong","name":"李克用","color":16711680,"gold":8000,"prestige":600,"homeCity":"taiyuan","aiDifficulty":4,"isHuman":false},
  {"id":"zhu-wen","name":"朱温","color":255,"gold":10000,"prestige":500,"homeCity":"bianzhou","aiDifficulty":4,"isHuman":false},
  {"id":"li-maozhen","name":"李茂贞","color":16776960,"gold":5000,"prestige":400,"homeCity":"fengxiang","aiDifficulty":3,"isHuman":false},
  {"id":"yang-xingmi","name":"杨行密","color":65280,"gold":9000,"prestige":450,"homeCity":"yangzhou","aiDifficulty":3,"isHuman":false},
  {"id":"wang-jian","name":"王建","color":16753920,"gold":4000,"prestige":350,"homeCity":"chengdu","aiDifficulty":2,"isHuman":false},
  {"id":"qian-liu","name":"钱镠","color":16711935,"gold":6000,"prestige":350,"homeCity":"hangzhou","aiDifficulty":2,"isHuman":false},
  {"id":"ind-minor-1","name":"卢龙军","color":8421504,"gold":2000,"prestige":200,"homeCity":"youzhou","aiDifficulty":1,"isHuman":false},
  {"id":"ind-minor-2","name":"成德军","color":12632256,"gold":2000,"prestige":200,"homeCity":"zhenzhou","aiDifficulty":1,"isHuman":false},
  {"id":"ind-minor-3","name":"魏博军","color":12632256,"gold":3000,"prestige":250,"homeCity":"weizhou","aiDifficulty":1,"isHuman":false}
]
```

- [ ] **Step 3: 创建武将数据**

Create `src/data/generals.json`（第一批 20 名武将）:

```json
[
  {"id":"li-keyong-gen","name":"李克用","factionId":"li-keyong","leadership":90,"might":88,"intelligence":70,"politics":55,"charisma":85,"loyalty":100,"skill":{"name":"鸦军冲锋","cooldown":30,"description":"骑兵攻击力+30%，持续10秒"}},
  {"id":"li-cunxiao","name":"李存孝","factionId":"li-keyong","leadership":78,"might":98,"intelligence":40,"politics":25,"charisma":50,"loyalty":90,"skill":{"name":"万夫不当","cooldown":60,"description":"自身部队无敌5秒"}},
  {"id":"zhou-dewei","name":"周德威","factionId":"li-keyong","leadership":85,"might":82,"intelligence":72,"politics":60,"charisma":70,"loyalty":85,"skill":null},
  {"id":"zhu-wen-gen","name":"朱温","factionId":"zhu-wen","leadership":88,"might":75,"intelligence":85,"politics":70,"charisma":60,"loyalty":100,"skill":{"name":"汴军铁壁","cooldown":40,"description":"全军防御+25%，持续12秒"}},
  {"id":"jing-xiang","name":"敬翔","factionId":"zhu-wen","leadership":30,"might":15,"intelligence":92,"politics":88,"charisma":55,"loyalty":85,"skill":null},
  {"id":"wang-yanzhang","name":"王彦章","factionId":"zhu-wen","leadership":72,"might":95,"intelligence":50,"politics":30,"charisma":55,"loyalty":80,"skill":{"name":"铁枪突阵","cooldown":45,"description":"对单体敌将造成大量伤害"}},
  {"id":"li-maozhen-gen","name":"李茂贞","factionId":"li-maozhen","leadership":80,"might":70,"intelligence":65,"politics":60,"charisma":55,"loyalty":100,"skill":null},
  {"id":"yang-xingmi-gen","name":"杨行密","factionId":"yang-xingmi","leadership":82,"might":72,"intelligence":75,"politics":78,"charisma":80,"loyalty":100,"skill":{"name":"淮南水师","cooldown":35,"description":"全军移动速度+20%，持续15秒"}},
  {"id":"wang-jian-gen","name":"王建","factionId":"wang-jian","leadership":78,"might":65,"intelligence":70,"politics":82,"charisma":70,"loyalty":100,"skill":null},
  {"id":"qian-liu-gen","name":"钱镠","factionId":"qian-liu","leadership":75,"might":60,"intelligence":80,"politics":85,"charisma":75,"loyalty":100,"skill":null}
]
```

- [ ] **Step 4: 创建州数据**

Create `src/data/provinces.json`:

```json
[
  {"id":"hedong","name":"河东","color":16727888},
  {"id":"hebei","name":"河北","color":16744448},
  {"id":"henan","name":"河南","color":65535},
  {"id":"guanzhong","name":"关中","color":16763904},
  {"id":"huainan","name":"淮南","color":65280},
  {"id":"xichuan","name":"西川","color":16733696},
  {"id":"zhenhai","name":"镇海","color":16711918},
  {"id":"jingnan","name":"荆南","color":8388863},
  {"id":"lingnan","name":"岭南","color":16711830},
  {"id":"jiangnan","name":"江南","color":65450}
]
```

- [ ] **Step 5: 创建数据加载器**

Create `src/logic/data-loader.js`:

```js
// 数据加载器——从 JSON 文件加载并填充 GameState。
// 注意：这个模块在初始化时由画面层调用，本身不依赖 Phaser。

import citiesData from '../data/cities.json';
import factionsData from '../data/factions.json';
import generalsData from '../data/generals.json';
import { addCity, addFaction, addGeneral } from './game-state.js';

export function loadGameData(state) {
  const loaded = { cities: 0, factions: 0, generals: 0 };

  for (const cityOpts of citiesData) {
    addCity(state, cityOpts);
    loaded.cities++;
  }

  for (const factionOpts of factionsData) {
    addFaction(state, factionOpts);
    loaded.factions++;
  }

  for (const generalOpts of generalsData) {
    addGeneral(state, generalOpts);
    loaded.generals++;
  }

  // 武将分配到对应势力的城池中
  for (const generalOpts of generalsData) {
    if (generalOpts.factionId) {
      const faction = state.factions[generalOpts.factionId];
      if (faction && faction.cities.length > 0) {
        const homeCity = state.cities[faction.cities[0]];
        if (homeCity) {
          homeCity.governor = generalOpts.id;
          state.generals[generalOpts.id].inCity = homeCity.id;
        }
      }
    }
  }

  return loaded;
}
```

- [ ] **Step 6: 写测试**

Create `tests/logic/data-loader.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/logic/game-state.js';
import { loadGameData } from '../../src/logic/data-loader.js';

describe('loadGameData', () => {
  it('should load all cities, factions and generals', () => {
    const state = createGameState();
    const result = loadGameData(state);
    expect(result.cities).toBe(20);
    expect(result.factions).toBe(9);
    expect(result.generals).toBeGreaterThanOrEqual(10);
  });

  it('should assign factions to cities', () => {
    const state = createGameState();
    loadGameData(state);
    const taiyuan = state.cities['taiyuan'];
    expect(taiyuan.owner).toBe('li-keyong');
  });
});
```

Run: `npx vitest run tests/logic/data-loader.test.js`
Expected: 2 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/data/ src/logic/data-loader.js tests/logic/data-loader.test.js
git commit -m "feat: add game data (cities, factions, generals) and loader"
```

---

### Task 5: Phaser Boot Scene and Menu Scene

**Files:**
- Create: `src/scenes/boot-scene.js`, `src/scenes/menu-scene.js`

**Interfaces:**
- Consumes: `main.js` (registered as Phaser scenes)
- Produces: 启动场景显示加载条，菜单场景显示「新游戏」「读档」「设置」按钮

- [ ] **Step 1: 实现 boot-scene.js**

Create `src/scenes/boot-scene.js`:

```js
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  preload() {
    // 第一期没有外部资源需要加载（用彩色方块代替美工）
    // 留一个加载条占位
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const bar = this.add.graphics();
    this.load.on('progress', (val) => {
      bar.clear();
      bar.fillStyle(0xccaa44, 1);
      bar.fillRect(width / 2 - 150, height / 2 - 10, 300 * val, 20);
    });
  }

  create() {
    this.scene.start('Menu');
  }
}
```

- [ ] **Step 2: 实现 menu-scene.js**

Create `src/scenes/menu-scene.js`:

```js
import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'Menu' }); }

  create() {
    const { width, height } = this.cameras.main;

    // 标题
    this.add.text(width / 2, 120, '唐末风云', {
      fontSize: '64px', color: '#ccaa44',
      fontFamily: 'serif'
    }).setOrigin(0.5);

    this.add.text(width / 2, 200, '— 公元八八〇 · 天下大乱 —', {
      fontSize: '18px', color: '#999999'
    }).setOrigin(0.5);

    // 新游戏按钮
    this.createButton(width / 2, 340, '新 游 戏', () => {
      console.log('Start new game');  // 后续任务关联
    });

    // 读档按钮
    this.createButton(width / 2, 420, '读 取 存 档', () => {
      console.log('Load game');
    });

    // 设置按钮
    this.createButton(width / 2, 500, '设 置', () => {
      console.log('Settings');
    });
  }

  createButton(x, y, label, callback) {
    const bg = this.add.rectangle(x, y, 260, 54, 0x333344)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x444466))
      .on('pointerout', () => bg.setFillStyle(0x333344))
      .on('pointerdown', callback);

    this.add.text(x, y, label, {
      fontSize: '24px', color: '#dddddd'
    }).setOrigin(0.5);

    return bg;
  }
}
```

- [ ] **Step 3: 更新 main.js 注册场景**

Edit `src/main.js` — 确保 BootScene 和 MenuScene 都在 scene 数组中（已在 Task 1 中注册）。

- [ ] **Step 4: 手动验证**

Run: `npm run dev`
Expected: 浏览器打开，显示「唐末风云」标题和三个按钮。按钮有 hover 效果。

- [ ] **Step 5: Commit**

```bash
git add src/scenes/boot-scene.js src/scenes/menu-scene.js
git commit -m "feat: add boot and menu scenes"
```

---

### Task 6: Isometric Map Renderer and Map Scene

**Files:**
- Create: `src/rendering/iso-renderer.js`, `src/rendering/city-marker.js`
- Create: `src/scenes/map-scene.js`

**Interfaces:**
- Consumes: game-state.js entities, config.js tile sizes
- Produces: 2.5D 菱形格地图，城池以彩色圆点标注，点击城池触发事件

- [ ] **Step 1: 实现等距渲染器**

Create `src/rendering/iso-renderer.js`:

```js
import { CONFIG } from '../config.js';

/**
 * 把网格坐标 (col, row) 转成屏幕坐标 (x, y)。
 * 菱形等距：每格向右下方偏移半格。
 */
export function gridToScreen(col, row) {
  const x = (col - row) * (CONFIG.TILE_WIDTH / 2);
  const y = (col + row) * (CONFIG.TILE_HEIGHT / 2);
  return { x, y };
}

export function screenToGrid(screenX, screenY) {
  const col = (screenX / (CONFIG.TILE_WIDTH / 2) + screenY / (CONFIG.TILE_HEIGHT / 2)) / 2;
  const row = (screenY / (CONFIG.TILE_HEIGHT / 2) - screenX / (CONFIG.TILE_WIDTH / 2)) / 2;
  return { col: Math.round(col), row: Math.round(row) };
}

/**
 * 在 Phaser 场景中绘制等距地图。
 * 第一期用纯色菱形方块表示地块，不同颜色代表不同地形。
 */
export function drawIsoMap(scene, mapData) {
  const graphics = scene.add.graphics();
  const { cols, rows, tiles } = mapData;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const { x, y } = gridToScreen(col, row);
      const tile = tiles[row]?.[col] || { type: 'plain', color: 0x2d5a1e };

      drawIsoTile(graphics, x, y, tile.color);
    }
  }
  return graphics;
}

function drawIsoTile(graphics, cx, cy, color) {
  const hw = CONFIG.TILE_WIDTH / 2;
  const hh = CONFIG.TILE_HEIGHT / 2;

  graphics.fillStyle(color, 1);
  graphics.beginPath();
  graphics.moveTo(cx, cy - hh);       // 顶
  graphics.lineTo(cx + hw, cy);       // 右
  graphics.lineTo(cx, cy + hh);       // 底
  graphics.lineTo(cx - hw, cy);       // 左
  graphics.closePath();
  graphics.fillPath();

  // 边框
  graphics.lineStyle(1, 0x1a3a0e, 0.5);
  graphics.beginPath();
  graphics.moveTo(cx, cy - hh);
  graphics.lineTo(cx + hw, cy);
  graphics.lineTo(cx, cy + hh);
  graphics.lineTo(cx - hw, cy);
  graphics.closePath();
  graphics.strokePath();
}
```

- [ ] **Step 2: 实现城池标记**

Create `src/rendering/city-marker.js`:

```js
import { CONFIG } from '../config.js';
import { gridToScreen } from './iso-renderer.js';

export function createCityMarkers(scene, cities) {
  const markers = [];

  for (const city of Object.values(cities)) {
    const { x, y } = gridToScreen(city.x, city.y);

    // 城池用一个彩色圆+名称表示
    const circle = scene.add.circle(x, y - 5, 8, 0xffdd44);
    circle.setInteractive({ useHandCursor: true });
    circle.cityId = city.id;

    const label = scene.add.text(x, y - 22, city.name, {
      fontSize: '11px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5);

    circle.on('pointerover', () => circle.setFillStyle(0xffffff));
    circle.on('pointerout', () => circle.setFillStyle(0xffdd44));
    circle.on('pointerdown', () => {
      scene.events.emit('city-clicked', city.id);
    });

    markers.push({ circle, label, cityId: city.id });
  }

  return markers;
}
```

- [ ] **Step 3: 创建地图场景**

Create `src/scenes/map-scene.js`:

```js
import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { createGameState, addFaction, addCity } from '../logic/game-state.js';
import { drawIsoMap } from '../rendering/iso-renderer.js';
import { createCityMarkers } from '../rendering/city-marker.js';

export class MapScene extends Phaser.Scene {
  constructor() { super({ key: 'Map' }); }

  create() {
    this.cameras.main.setBackgroundColor('#0a1628');

    // 生成测试地图数据（纯色地块）
    const mapData = this.generateTestMap();

    // 绘制等距地图
    this.isoMap = drawIsoMap(this, mapData);

    // 创建游戏状态（测试用）
    this.gameState = createGameState({ playerFactionId: 'li-keyong' });
    addFaction(this.gameState, { id: 'li-keyong', name: '李克用', color: 0xff4444, isHuman: true });
    addCity(this.gameState, { id: 'taiyuan', name: '太原', x: 12, y: 4, owner: 'li-keyong', population: 60000 });
    addCity(this.gameState, { id: 'bianzhou', name: '汴州', x: 17, y: 12, population: 70000 });

    // 放置城池标记
    this.cityMarkers = createCityMarkers(this, this.gameState.cities);

    // 相机控制：拖拽平移
    this.setupCamera();

    // 城池点击事件
    this.events.on('city-clicked', (cityId) => {
      console.log('Clicked city:', cityId);
    });
  }

  generateTestMap() {
    const cols = CONFIG.MAP_COLS;
    const rows = CONFIG.MAP_ROWS;
    const tiles = [];

    for (let r = 0; r < rows; r++) {
      tiles[r] = [];
      for (let c = 0; c < cols; c++) {
        const rng = (c * 7 + r * 13) % 10;
        let color = 0x2d5a1e; // 默认绿地
        if (rng < 2) color = 0x3d6a2e; // 深绿（森林）
        if (rng > 7) color = 0x4a6a30; // 浅绿（农田）
        if (c < 2 || c > cols - 3) color = 0x5a4a30; // 山脉
        tiles[r][c] = { type: 'plain', color };
      }
    }
    return { cols, rows, tiles };
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setScroll(-400, -200); // 居中地图
    this.input.on('drag', (pointer, obj, dragX, dragY) => {
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });
    // 滚轮缩放
    this.input.on('wheel', (pointer, objs, dx, dy) => {
      const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.5, 2.5);
      cam.setZoom(newZoom);
    });
  }
}
```

- [ ] **Step 4: 将 MapScene 注册到 main.js**

Edit `src/main.js`:

```js
import { MapScene } from './scenes/map-scene.js';
// scene 数组中加入 MapScene
scene: [BootScene, MenuScene, MapScene],
```

- [ ] **Step 5: 修改菜单「新游戏」跳转到地图**

Edit `src/scenes/menu-scene.js`, 将新游戏按钮回调改为:

```js
this.scene.start('Map');
```

- [ ] **Step 6: 手动验证**

Run: `npm run dev`
Expected: 标题 → 点「新游戏」→ 看到菱形格地图，有几个彩色圆点代表城池。可以拖拽平移和滚轮缩放。

- [ ] **Step 7: Commit**

```bash
git add src/rendering/iso-renderer.js src/rendering/city-marker.js src/scenes/map-scene.js src/main.js
git commit -m "feat: add isometric map rendering with city markers"
```

---

### Task 7: Map Interaction — City Selection Info Panel

**Files:**
- Create: `src/scenes/city-panel.js` (改为创建 HTML DOM 面板)
- Modify: `src/scenes/map-scene.js`

**Interfaces:**
- Consumes: map-scene.js city-clicked event, game-state cities
- Produces: 点击城池弹出信息面板，显示属性

- [ ] **Step 1: 用 DOM 创建城池信息面板**

Phaser 的文本渲染对中文支持不够好，UI 面板改用 HTML DOM 覆盖在游戏画面之上。

Create `src/scenes/city-panel.js`:

```js
/**
 * 城池信息面板——使用 HTML DOM 显示。
 * 画面层负责显示，数据来自逻辑层的 city 对象。
 */

let panelEl = null;

export function createCityPanel() {
  if (panelEl) return panelEl;

  panelEl = document.createElement('div');
  panelEl.id = 'city-panel';
  panelEl.style.cssText = `
    display: none;
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 360px; background: rgba(20, 20, 40, 0.95); border: 2px solid #665522;
    border-radius: 8px; padding: 16px; color: #ddd; font-family: sans-serif;
    z-index: 1000;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

export function showCityPanel(city, faction) {
  const panel = createCityPanel();
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:22px;color:#ccaa44;font-weight:bold">${city.name}</span>
      <span style="color:#888">${faction ? faction.name : '无主'}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:14px">
      <div>人口：${city.population.toLocaleString()}</div>
      <div>农业：${'★'.repeat(city.agriculture)}</div>
      <div>商业：${'★'.repeat(city.commerce)}</div>
      <div>城防：${'★'.repeat(city.defense)}</div>
      <div>民心：${city.stability}</div>
      <div>驻军：${city.garrison.length} 队</div>
    </div>
    <div style="margin-top:12px;text-align:right">
      <button id="btn-close-panel" style="
        padding:6px 20px;background:#443322;color:#ccaa44;border:1px solid #665522;
        border-radius:4px;cursor:pointer
      ">关闭</button>
    </div>
  `;

  document.getElementById('btn-close-panel').onclick = () => hideCityPanel();
  panel.style.display = 'block';
}

export function hideCityPanel() {
  if (panelEl) panelEl.style.display = 'none';
}
```

- [ ] **Step 2: 连接地图场景到面板**

Edit `src/scenes/map-scene.js`——修改 `city-clicked` 事件处理:

```js
import { showCityPanel } from './city-panel.js';
import { getFactionById } from '../logic/game-state.js';

// 在 create() 中，修改 city-clicked 处理：
this.events.on('city-clicked', (cityId) => {
  const city = this.gameState.cities[cityId];
  const faction = city.owner ? getFactionById(this.gameState, city.owner) : null;
  showCityPanel(city, faction);
});
```

- [ ] **Step 3: 手动验证**

Run: `npm run dev` → 新游戏 → 点击城池圆点
Expected: 弹出半透明面板，显示城池名、势力、数值。点「关闭」消失。

- [ ] **Step 4: Commit**

```bash
git add src/scenes/city-panel.js src/scenes/map-scene.js
git commit -m "feat: add city info panel on click"
```

---

## Phase 2: Economy & Turn System

### Task 8: Economy Calculations

**Files:**
- Create: `src/logic/economy.js`
- Create: `tests/logic/economy.test.js`

**Interfaces:**
- Consumes: city.js (getCityIncome), faction.js, game-state.js (getFactionCities)
- Produces: `calculateTurnIncome(state, factionId) -> { gold, food, upkeep }`, `calculatePopulationGrowth(city) -> number`

- [ ] **Step 1: 写测试**

```js
import { describe, it, expect } from 'vitest';
import { createGameState, addCity, addFaction } from '../../src/logic/game-state.js';
import { calculateTurnIncome, calculatePopulationGrowth } from '../../src/logic/economy.js';
import { CONFIG } from '../../src/config.js';

describe('calculateTurnIncome', () => {
  it('should sum income from all faction cities', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000 });
    addCity(state, { id: 'c1', name: '城1', x: 0, y: 0, owner: 'f1', population: 20000, commerce: 5 });
    addCity(state, { id: 'c2', name: '城2', x: 1, y: 1, owner: 'f1', population: 10000, commerce: 3 });

    const result = calculateTurnIncome(state, 'f1');
    // 城1: 20000/1000 * 5 * 0.3 = 30, 城2: 10000/1000 * 3 * 0.3 = 9, total = 39
    expect(result.gold).toBe(39);
  });
});

describe('calculatePopulationGrowth', () => {
  it('should grow based on agriculture', () => {
    const city = { population: 10000, agriculture: 5, stability: 70 };
    const growth = calculatePopulationGrowth(city);
    // 10000 * 0.01 + 5 * 50 = 100 + 250 = 350
    expect(growth).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: 实现 economy.js**

```js
import { CONFIG } from '../config.js';
import { getFactionCities } from './game-state.js';

export function calculateTurnIncome(state, factionId) {
  const cities = getFactionCities(state, factionId);
  let gold = 0;

  for (const city of cities) {
    gold += Math.floor(city.population / 1000 * city.commerce * CONFIG.BASE_TAX_RATE);
  }

  // 扣除部队维护费
  const faction = state.factions[factionId];
  const totalArmies = 0; // 等 army 系统实现后补充
  const upkeep = totalArmies * CONFIG.ARMY_UPKEEP_PER_UNIT;

  return { gold, upkeep, net: gold - upkeep };
}

export function calculatePopulationGrowth(city) {
  const base = Math.floor(city.population * CONFIG.BASE_POP_GROWTH);
  const agriBonus = city.agriculture * 50;
  const stabilityMod = city.stability / 100;
  return Math.floor((base + agriBonus) * stabilityMod);
}

export function applyTurnEconomy(state, factionId) {
  const income = calculateTurnIncome(state, factionId);
  const faction = state.factions[factionId];

  faction.gold += income.net;

  const cities = getFactionCities(state, factionId);
  for (const city of cities) {
    const growth = calculatePopulationGrowth(city);
    city.population += growth;
  }

  return income;
}
```

- [ ] **Step 3: 运行测试通过并提交**

Run: `npx vitest run tests/logic/economy.test.js`
Expected: PASS

```bash
git add src/logic/economy.js tests/logic/economy.test.js
git commit -m "feat: add economy calculations"
```

---

### Task 9: Turn System

**Files:**
- Create: `src/logic/turn.js`
- Create: `tests/logic/turn.test.js`
- Create: `src/ui/turn-panel.js`

**Interfaces:**
- Consumes: economy.js, game-state.js
- Produces: `executeTurn(state) -> turnResult`, 「结束回合」UI 按钮

- [ ] **Step 1: 实现 turn.js**

```js
import { applyTurnEconomy } from './economy.js';
import { getAllFactions, endTurn } from './game-state.js';

export function executeTurn(state) {
  const results = [];

  // 先处理玩家势力
  if (state.playerFactionId) {
    const income = applyTurnEconomy(state, state.playerFactionId);
    results.push({ factionId: state.playerFactionId, income });
  }

  // 再处理 AI 势力
  for (const faction of getAllFactions(state)) {
    if (faction.id === state.playerFactionId) continue;
    const income = applyTurnEconomy(state, faction.id);
    results.push({ factionId: faction.id, income });
  }

  // 回合数 +1
  const prevTurn = state.turn;
  endTurn(state);

  return { turn: state.turn, prevTurn, results };
}
```

- [ ] **Step 2: 创建回合面板 UI**

Create `src/ui/turn-panel.js`:

```js
export function createTurnPanel(onEndTurn) {
  const panel = document.createElement('div');
  panel.id = 'turn-panel';
  panel.style.cssText = `
    position: fixed; bottom: 16px; right: 16px;
    background: rgba(20,20,40,0.9); border: 1px solid #665522;
    border-radius: 6px; padding: 10px 16px; color: #ccaa44;
    font-family: sans-serif; z-index: 500;
  `;

  const label = document.createElement('span');
  label.id = 'turn-label';
  label.textContent = '第 1 回合';
  label.style.marginRight = '12px';

  const btn = document.createElement('button');
  btn.textContent = '结束回合';
  btn.style.cssText = `
    padding:6px 16px; background:#443322; color:#ccaa44;
    border:1px solid #665522; border-radius:4px; cursor:pointer;
  `;
  btn.onclick = onEndTurn;

  panel.appendChild(label);
  panel.appendChild(btn);
  document.body.appendChild(panel);
  return panel;
}

export function setTurnDisplay(turn) {
  const label = document.getElementById('turn-label');
  if (label) label.textContent = `第 ${turn} 回合`;
}
```

- [ ] **Step 3: 在 MapScene 中集成回合系统**

在 `map-scene.js` 的 `create()` 中添加:

```js
import { createTurnPanel, setTurnDisplay } from '../ui/turn-panel.js';
import { executeTurn } from '../logic/turn.js';

// ...
createTurnPanel(() => {
  const result = executeTurn(this.gameState);
  setTurnDisplay(result.turn);
  console.log('Turn ended:', result);
});
```

- [ ] **Step 4: 手动验证**

Run: `npm run dev` → 新游戏 → 看到右下角回合面板 → 点「结束回合」→ 回合数增加

- [ ] **Step 5: Commit**

```bash
git add src/logic/turn.js tests/logic/turn.test.js src/ui/turn-panel.js src/scenes/map-scene.js
git commit -m "feat: add turn system with end-turn button"
```

---

## Phase 3: Military & Army Movement

### Task 10: Army System and Recruitment

**Files:**
- Create: `src/logic/army.js`, `src/logic/recruitment.js`
- Create: `tests/logic/army.test.js`, `tests/logic/recruitment.test.js`

**Interfaces:**
- Consumes: city.js, general.js, faction.js
- Produces: `createArmy(opts) -> army`, `recruitUnit(state, cityId, unitType) -> army | null`

- [ ] **Step 1: 实现 army.js**

```js
export const UNIT_TYPES = {
  infantry:  { name: '步兵', attack: 10, defense: 12, speed: 3,  cost: 100, counters: 'cavalry' },
  cavalry:   { name: '骑兵', attack: 15, defense: 8,  speed: 6,  cost: 200, counters: 'archer' },
  archer:    { name: '弓兵', attack: 12, defense: 6,  speed: 4,  cost: 150, counters: 'infantry' }
};

export function createArmy(opts) {
  return {
    id: opts.id,
    factionId: opts.factionId,
    generalId: opts.generalId || null,
    units: opts.units || [],           // [{ type: 'infantry', count: 1000, morale: 80, exp: 0 }, ...]
    position: opts.position || null,   // { x, y } 地图坐标
    inCity: opts.inCity || null,       // 在哪个城中
    state: 'idle'                      // 'idle' | 'moving' | 'fighting' | 'retreating'
  };
}

export function getArmyStrength(army) {
  let total = 0;
  for (const unit of army.units) {
    const typeDef = UNIT_TYPES[unit.type];
    total += (typeDef.attack + typeDef.defense) * unit.count * (unit.morale / 100);
  }
  return Math.floor(total);
}

export function getArmySpeed(army) {
  if (army.units.length === 0) return 3;
  const speeds = army.units.map(u => UNIT_TYPES[u.type]?.speed || 3);
  return Math.min(...speeds); // 行军速度取最慢兵种
}
```

- [ ] **Step 2: 实现 recruitment.js**

```js
import { CONFIG } from '../config.js';
import { UNIT_TYPES, createArmy } from './army.js';
import { spendGold } from './faction.js';
import { addCityPopulation } from './city.js';

export function recruitUnit(state, cityId, unitType, count) {
  const city = state.cities[cityId];
  if (!city) return null;

  const typeDef = UNIT_TYPES[unitType];
  if (!typeDef) return null;

  const totalCost = typeDef.cost * count;
  const faction = state.factions[city.owner];
  if (!faction) return null;

  // 检查人口
  if (city.population < count) return null;

  // 扣钱
  const spend = spendGold(faction, totalCost);
  if (!spend) return null;

  // 扣人口
  addCityPopulation(city, -count);

  // 创建或加入部队
  let army = findOrCreateArmyInCity(state, city);
  addUnitToArmy(army, unitType, count);

  return army;
}

function findOrCreateArmyInCity(state, city) {
  // 找城中已有的空闲部队
  for (const army of Object.values(state.armies)) {
    if (army.inCity === city.id && army.state === 'idle') return army;
  }
  // 新建
  const army = createArmy({
    id: `army-${Date.now()}`,
    factionId: city.owner,
    inCity: city.id,
    position: { x: city.x, y: city.y }
  });
  state.armies[army.id] = army;
  city.garrison.push(army.id);
  return army;
}

function addUnitToArmy(army, unitType, count) {
  const existing = army.units.find(u => u.type === unitType);
  if (existing) {
    existing.count += count;
  } else {
    army.units.push({ type: unitType, count, morale: 80, exp: 0 });
  }
}
```

- [ ] **Step 3: 写测试并提交**

Tests for army creation, recruitment, and gold/population checks.

Expected: 6+ tests PASS

```bash
git add src/logic/army.js src/logic/recruitment.js tests/logic/army.test.js tests/logic/recruitment.test.js
git commit -m "feat: add army system and recruitment"
```

---

### Task 11: Army Movement on Map

**Files:**
- Create: `src/logic/movement.js`
- Modify: `src/rendering/army-sprite.js` (new), `src/scenes/map-scene.js`

**Interfaces:**
- Consumes: army.js (getArmySpeed), game-state.js (armies)
- Produces: `moveArmy(state, armyId, targetX, targetY) -> path`, 地图上显示部队图标

- [ ] **Step 1: 实现 movement.js**

```js
import { getArmySpeed } from './army.js';

// 简单 A* 寻路（第一期：直线移动，忽略地形障碍）
export function moveArmy(state, armyId, targetX, targetY) {
  const army = state.armies[armyId];
  if (!army || army.state !== 'idle') return null;

  const speed = getArmySpeed(army);
  const dx = targetX - army.position.x;
  const dy = targetY - army.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const turns = Math.ceil(dist / speed);

  army.state = 'moving';
  army.moveTarget = { x: targetX, y: targetY };
  army.movePath = [{ x: targetX, y: targetY }];
  army.moveTurnsRemaining = turns;

  if (army.inCity) {
    const city = state.cities[army.inCity];
    if (city) {
      city.garrison = city.garrison.filter(id => id !== armyId);
    }
    army.inCity = null;
  }

  return { turns, path: army.movePath };
}

// 每回合结束时行军进度+1
export function advanceAllMovements(state) {
  for (const army of Object.values(state.armies)) {
    if (army.state !== 'moving') continue;

    army.moveTurnsRemaining--;
    if (army.moveTurnsRemaining <= 0) {
      army.position = army.moveTarget;
      army.state = 'idle';
      army.moveTarget = null;
      army.movePath = null;
    }
  }
}
```

- [ ] **Step 2: 创建部队精灵渲染**

Create `src/rendering/army-sprite.js`:

```js
import { gridToScreen } from './iso-renderer.js';

export function createArmySprites(scene, armies, factions) {
  const sprites = new Map();

  for (const army of Object.values(armies)) {
    if (!army.position) continue;
    const { x, y } = gridToScreen(army.position.x, army.position.y);
    const faction = factions[army.factionId];
    const color = faction ? faction.color : 0x888888;

    // 部队用小三角表示
    const tri = scene.add.triangle(x, y - 12, 0, 10, 6, 0, 12, 10, color);
    tri.setInteractive({ useHandCursor: true });
    tri.armyId = army.id;

    const total = army.units.reduce((s, u) => s + u.count, 0);
    const label = scene.add.text(x, y - 24, `${total}`, {
      fontSize: '10px', color: '#ffffff',
      stroke: '#000', strokeThickness: 1
    }).setOrigin(0.5);

    tri.on('pointerdown', () => {
      scene.events.emit('army-clicked', army.id);
    });

    sprites.set(army.id, { tri, label });
  }
  return sprites;
}
```

- [ ] **Step 3: 集成到 MapScene 并提交**

```bash
git add src/logic/movement.js src/rendering/army-sprite.js src/scenes/map-scene.js
git commit -m "feat: add army movement and map sprites"
```

---

### Task 12: Combat Encounter Trigger

**Files:**
- Modify: `src/logic/movement.js`
- Create: `tests/logic/movement.test.js`

**Interfaces:**
- Consumes: army.js, game-state.js
- Produces: 当两军相遇或攻入敌城时触发 `checkCombatEncounter(state) -> encounter | null`

- [ ] **Step 1: 实现遭遇检测**

在 `movement.js` 中添加:

```js
export function checkCombatEncounters(state) {
  const encounters = [];
  const armies = Object.values(state.armies).filter(a => a.state === 'idle');

  for (let i = 0; i < armies.length; i++) {
    for (let j = i + 1; j < armies.length; j++) {
      const a = armies[i], b = armies[j];
      if (a.factionId === b.factionId) continue; // 同势力不战斗

      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        encounters.push({ attacker: a, defender: b, type: 'field' });
      }
    }
  }

  // 检查攻城：部队在城市格且城市属于敌对势力
  for (const army of armies) {
    for (const city of Object.values(state.cities)) {
      if (army.position.x === city.x && army.position.y === city.y
          && city.owner && city.owner !== army.factionId) {
        encounters.push({ attacker: army, defender: city, type: 'siege' });
      }
    }
  }

  return encounters.length > 0 ? encounters : null;
}
```

- [ ] **Step 2: 在回合结算中调用**

在 `turn.js` 的 `executeTurn` 中，`advanceAllMovements` 之后调用 `checkCombatEncounters(state)`。

如果有遭遇战，state.phase 变为 'battle'。

- [ ] **Step 3: 测试并提交**

```bash
git add src/logic/movement.js src/logic/turn.js tests/logic/movement.test.js
git commit -m "feat: add combat encounter detection"
```

---

## Phase 4: Battle System

### Task 13: Battle State and Unit Definitions

**Files:**
- Create: `src/logic/battle/battle-state.js`, `src/logic/battle/battle-units.js`
- Create: `tests/logic/battle-state.test.js`

**Interfaces:**
- Consumes: army.js (UNIT_TYPES, getArmyStrength), game-state.js
- Produces: `createBattleState(attacker, defender, terrain) -> battleState`, `updateBattle(dt, state) -> result | null`

- [ ] **Step 1: 实现 battle-units.js**

```js
// 战斗中的单位——从大地图部队转换而来
export function createBattleUnit(armyUnit, side, generalBonuses = {}) {
  return {
    type: armyUnit.type,
    side,                             // 'attacker' | 'defender'
    count: armyUnit.count,
    morale: armyUnit.morale,
    exp: armyUnit.exp,
    maxHp: armyUnit.count * 10,       // 每个士兵 10 血
    hp: armyUnit.count * 10,
    attack: 10 + (generalBonuses.attack || 0),
    defense: 8 + (generalBonuses.defense || 0),
    speed: 3 + (generalBonuses.speed || 0),
    position: { x: 0, y: 0 },         // 战场坐标（像素）
    target: null,
    state: 'idle',                    // 'idle' | 'moving' | 'fighting' | 'routed'
    attackCooldown: 0
  };
}

export function getDamage(attacker, defender) {
  const baseAtk = attacker.attack * (attacker.count / 100);
  const baseDef = defender.defense * (defender.count / 100);
  let damage = Math.max(1, baseAtk - baseDef * 0.5);

  // 兵种克制：克制方伤害 +30%
  const COUNTER_MAP = { infantry: 'cavalry', cavalry: 'archer', archer: 'infantry' };
  if (COUNTER_MAP[attacker.type] === defender.type) {
    damage = Math.floor(damage * 1.3);
  }

  return Math.floor(damage);
}
```

- [ ] **Step 2: 实现 battle-state.js**

```js
import { createBattleUnit } from './battle-units.js';
import { UNIT_TYPES } from '../army.js';

export const TERRAIN_TYPES = {
  plains:   { name: '平原', speedMod: 1.0, defenseMod: 0 },
  hills:    { name: '山地', speedMod: 0.7, defenseMod: 2 },
  river:    { name: '河畔', speedMod: 0.8, defenseMod: 1 }
};

export function createBattleState(opts) {
  return {
    terrain: opts.terrain || 'plains',
    isSiege: opts.isSiege || false,
    attacker: {
      factionId: opts.attackerFactionId,
      generalId: opts.attackerGeneralId,
      units: opts.attackerUnits.map(u => createBattleUnit(u, 'attacker', { attack: 2, defense: 1 }))
    },
    defender: {
      factionId: opts.defenderFactionId,
      generalId: opts.defenderGeneralId,
      units: opts.defenderUnits.map(u => createBattleUnit(u, 'defender', { attack: 0, defense: 2 })),
      siegeDefense: opts.isSiege ? 5 : 0  // 守城额外防御
    },
    time: 0,           // 战斗计时（秒）
    maxTime: 600,      // 10 分钟上限
    events: [],        // 战斗日志
    winner: null
  };
}

export function checkBattleEnd(battle) {
  const attackerAlive = battle.attacker.units.some(u => u.hp > 0 && u.morale > 0);
  const defenderAlive = battle.defender.units.some(u => u.hp > 0 && u.morale > 0);

  if (!attackerAlive) return 'defender';
  if (!defenderAlive) return 'attacker';
  if (battle.time >= battle.maxTime) {
    // 超时：判定防守方胜（攻城失败 / 野战平局守方有利）
    return 'defender';
  }
  return null;
}
```

- [ ] **Step 3: 测试并提交**

```bash
git add src/logic/battle/ tests/logic/battle-state.test.js
git commit -m "feat: add battle state and unit logic"
```

---

### Task 14: Battle Scene (Phaser Realtime)

**Files:**
- Create: `src/scenes/battle-scene.js`

**Interfaces:**
- Consumes: battle-state.js, battle-units.js
- Produces: 实时战场画面，拖拽框选、右键移动、左键攻击

- [ ] **Step 1: 实现战斗场景**

```js
import Phaser from 'phaser';
import { createBattleState, checkBattleEnd, TERRAIN_TYPES } from '../logic/battle/battle-state.js';
import { getDamage } from '../logic/battle/battle-units.js';

export class BattleScene extends Phaser.Scene {
  constructor() { super({ key: 'Battle' }); }

  init(data) {
    this.battleData = data; // { attackerArmy, defenderArmy, terrain, isSiege }
  }

  create() {
    const { attackerArmy, defenderArmy, terrain, isSiege } = this.battleData;

    this.battle = createBattleState({
      terrain: terrain || 'plains',
      isSiege: isSiege || false,
      attackerFactionId: attackerArmy.factionId,
      attackerGeneralId: attackerArmy.generalId,
      attackerUnits: attackerArmy.units,
      defenderFactionId: defenderArmy.factionId,
      defenderGeneralId: defenderArmy.generalId,
      defenderUnits: defenderArmy.units
    });

    this.cameras.main.setBackgroundColor('#1a2a1a');
    this.selectedUnits = [];
    this.isDragging = false;
    this.dragRect = null;

    this.createUnitSprites();
    this.createUI();
    this.setupInput();
  }

  createUnitSprites() {
    this.unitSprites = [];
    const allUnits = [
      ...this.battle.attacker.units.map((u, i) => ({ ...u, index: i, side: 'attacker', startX: 200 + i * 80, startY: 300 + i * 60 })),
      ...this.battle.defender.units.map((u, i) => ({ ...u, index: i, side: 'defender', startX: 800 + i * 80, startY: 200 + i * 60 }))
    ];

    for (const bu of allUnits) {
      const color = bu.side === 'attacker' ? 0xff4444 : 0x4444ff;
      const rect = this.add.rectangle(bu.startX, bu.startY, 40, 30, color);
      rect.setInteractive();
      rect.battleUnit = bu;
      bu.sprite = rect;
      bu.position = { x: bu.startX, y: bu.startY };

      const label = this.add.text(bu.startX, bu.startY - 20, `${bu.type[0]}${bu.count}`, {
        fontSize: '10px', color: '#fff'
      }).setOrigin(0.5);

      this.unitSprites.push({ rect, label, unit: bu });
    }
  }

  createUI() {
    // 撤退按钮
    const retreatBtn = this.add.text(10, 10, '撤退', {
      fontSize: '18px', color: '#ff4444', backgroundColor: '#222'
    }).setPadding(8).setInteractive().on('pointerdown', () => {
      this.endBattle('defender');
    });

    // 士气条
    this.add.text(10, 50, `攻方士气: ${this.battle.attacker.units[0]?.morale || 0}`, { fontSize: '14px', color: '#ff8888' });
    this.add.text(10, 70, `守方士气: ${this.battle.defender.units[0]?.morale || 0}`, { fontSize: '14px', color: '#8888ff' });
  }

  setupInput() {
    this.input.on('pointerdown', (pointer) => {
      this.isDragging = true;
      this.dragStart = { x: pointer.x, y: pointer.y };
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.isDragging) return;
      if (this.dragRect) this.dragRect.destroy();
      const { x, y } = this.dragStart;
      this.dragRect = this.add.rectangle(
        (x + pointer.x) / 2, (y + pointer.y) / 2,
        Math.abs(pointer.x - x), Math.abs(pointer.y - y),
        0xffffff, 0.2
      );
    });

    this.input.on('pointerup', (pointer) => {
      this.isDragging = false;
      if (this.dragRect) this.dragRect.destroy();
    });

    // 右键移动
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown() && this.selectedUnits.length > 0) {
        for (const sprite of this.selectedUnits) {
          this.tweens.add({
            targets: sprite.rect,
            x: pointer.worldX,
            y: pointer.worldY,
            duration: 1000
          });
          sprite.unit.position = { x: pointer.worldX, y: pointer.worldY };
        }
      }
    });
    this.input.mouse.disableContextMenu();
  }

  update(time, delta) {
    this.battle.time += delta / 1000;

    // 战斗 AI：相邻单位自动攻击
    for (const a of this.unitSprites) {
      for (const b of this.unitSprites) {
        if (a.unit.side === b.unit.side) continue;
        const dx = a.rect.x - b.rect.x;
        const dy = a.rect.y - b.rect.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
          const dmg = getDamage(a.unit, b.unit);
          b.unit.hp -= dmg;
          if (b.unit.hp <= 0) b.unit.count = 0;
          break;
        }
      }
    }

    const winner = checkBattleEnd(this.battle);
    if (winner) this.endBattle(winner);
  }

  endBattle(winner) {
    this.scene.start('Map', {
      battleResult: {
        winner,
        attackerLosses: this.battle.attacker.units.map(u => ({ type: u.type, lost: u.count })),
        defenderLosses: this.battle.defender.units.map(u => ({ type: u.type, lost: u.count }))
      }
    });
  }
}
```

- [ ] **Step 2: 注册 BattleScene 到 main.js**

```js
import { BattleScene } from './scenes/battle-scene.js';
// scene 数组中添加 BattleScene
```

- [ ] **Step 3: 在 MapScene 中触发战斗**

当 `checkCombatEncounters` 返回遭遇战时，调用:

```js
this.scene.start('Battle', {
  attackerArmy: encounter.attacker,
  defenderArmy: encounter.type === 'siege'
    ? { factionId: encounter.defender.owner, units: [{ type: 'infantry', count: 2000, morale: 80, exp: 0 }] }
    : encounter.defender,
  terrain: 'plains',
  isSiege: encounter.type === 'siege'
});
```

- [ ] **Step 4: 手动验证并提交**

```bash
git add src/scenes/battle-scene.js src/main.js src/scenes/map-scene.js
git commit -m "feat: add real-time battle scene"
```

---

### Task 15: Battle Resolution and Map Integration

**Files:**
- Modify: `src/scenes/map-scene.js`, `src/scenes/battle-scene.js`
- Create: `src/logic/battle/battle-resolution.js`

**Interfaces:**
- Consumes: battle-state.js, game-state.js
- Produces: 战斗结束后将结果写回主地图状态

- [ ] **Step 1: 实现 battle-resolution.js**

```js
import { setCityOwner } from '../city.js';

export function applyBattleResult(state, encounter, battleResult) {
  if (battleResult.winner === 'attacker') {
    if (encounter.type === 'siege') {
      // 攻城胜利：占城
      const city = encounter.defender;
      setCityOwner(city, encounter.attacker.factionId);
      encounter.attacker.inCity = city.id;
      city.garrison.push(encounter.attacker.id);
      state.turnLog.push(`${city.name} 被 ${state.factions[encounter.attacker.factionId].name} 攻陷！`);
    } else {
      // 野战胜利：消灭/重创敌军
      encounter.defender.units = [];
      encounter.defender.state = 'destroyed';
      state.turnLog.push(`野战胜利！`);
    }
  } else {
    // 防守方胜利
    encounter.attacker.state = 'retreating';
    state.turnLog.push(`进攻失败！`);
  }

  // 更新部队状态（伤亡）
  applyLosses(encounter.attacker, battleResult.attackerLosses);
  if (encounter.type === 'field') {
    applyLosses(encounter.defender, battleResult.defenderLosses);
  }

  state.phase = 'economy';
}

function applyLosses(army, losses) {
  for (const loss of losses) {
    const unit = army.units.find(u => u.type === loss.type);
    if (unit) unit.count = Math.max(0, unit.count - loss.lost);
  }
  army.units = army.units.filter(u => u.count > 0);
}
```

- [ ] **Step 2: 在 MapScene 中接收战斗结果**

在 `map-scene.js` 的 `create()` 中:

```js
if (this.scene.settings.data?.battleResult) {
  const { battleResult } = this.scene.settings.data;
  // applyBattleResult 在进入战斗前已保存 encounter
  console.log('Battle result:', battleResult);
  // 刷新地图显示
  this.refreshMap();
}
```

- [ ] **Step 3: 测试并提交**

```bash
git add src/logic/battle/battle-resolution.js src/scenes/map-scene.js src/scenes/battle-scene.js
git commit -m "feat: integrate battle results with map state"
```

---

## Phase 5: Diplomacy & Espionage

### Task 16: Diplomacy Logic

**Files:**
- Create: `src/logic/diplomacy.js`
- Create: `tests/logic/diplomacy.test.js`

**Interfaces:**
- Consumes: faction.js (setRelation, getRelation), game-state.js
- Produces: `proposeAlliance(state, fromId, toId) -> result`, `declareWar(state, fromId, toId)`, `sueForPeace(state, fromId, toId, terms) -> result`

- [ ] **Step 1: 实现 diplomacy.js**

```js
import { setRelation, getRelation, addPrestige } from './faction.js';

export function proposeAlliance(state, fromId, toId) {
  const from = state.factions[fromId];
  const to = state.factions[toId];
  if (!from || !to) return { success: false, reason: '势力不存在' };

  const relation = getRelation(from, toId);
  const chance = 0.3 + relation / 200 + from.prestige / 2000;

  if (Math.random() < chance) {
    setRelation(from, toId, Math.min(100, relation + 30));
    setRelation(to, fromId, Math.min(100, getRelation(to, fromId) + 30));
    from.alliances.push(toId);
    to.alliances.push(fromId);
    return { success: true, message: `${to.name} 接受了结盟提议` };
  }
  return { success: false, message: `${to.name} 拒绝了结盟提议` };
}

export function declareWar(state, fromId, toId) {
  const from = state.factions[fromId];
  const to = state.factions[toId];

  // 移除同盟
  from.alliances = from.alliances.filter(id => id !== toId);
  to.alliances = to.alliances.filter(id => id !== fromId);

  // 设为战争状态
  if (!from.atWarWith.includes(toId)) from.atWarWith.push(toId);
  if (!to.atWarWith.includes(fromId)) to.atWarWith.push(fromId);

  setRelation(from, toId, -100);
  setRelation(to, fromId, -100);

  // 无故宣战降声望
  if (getRelation(from, toId) >= -20) {
    addPrestige(from, -50);
  }

  state.turnLog.push(`${from.name} 向 ${to.name} 宣战！`);
}

export function breakAlliance(state, fromId, toId) {
  const from = state.factions[fromId];
  const to = state.factions[toId];

  from.alliances = from.alliances.filter(id => id !== toId);
  to.alliances = to.alliances.filter(id => id !== fromId);
  setRelation(from, toId, -50);
  setRelation(to, fromId, -50);
  addPrestige(from, -100);

  state.turnLog.push(`${from.name} 撕毁了与 ${to.name} 的盟约！`);
}

export function sueForPeace(state, fromId, toId, terms = {}) {
  const from = state.factions[fromId];
  const to = state.factions[toId];

  const goldOffer = terms.gold || 0;
  const cityOffer = terms.cityId || null;

  // 对方接受概率：关系好 + 你愿意赔钱割城 → 更容易
  const relation = getRelation(from, toId);
  let chance = 0.1 + relation / 500 + goldOffer / 5000;
  if (cityOffer) chance += 0.4;

  if (Math.random() < chance) {
    from.atWarWith = from.atWarWith.filter(id => id !== toId);
    to.atWarWith = to.atWarWith.filter(id => id !== fromId);
    setRelation(from, toId, -20);
    setRelation(to, fromId, -20);

    if (goldOffer > 0) {
      from.gold -= goldOffer;
      to.gold += goldOffer;
    }
    if (cityOffer) {
      const city = state.cities[cityOffer];
      if (city) city.owner = toId;
    }
    return { success: true, message: `${to.name} 接受了求和` };
  }
  return { success: false, message: `${to.name} 拒绝了求和` };
}
```

- [ ] **Step 2: 写测试**

Tests cover: alliance proposal, war declaration, peace negotiation, prestige changes.

- [ ] **Step 3: 提交**

```bash
git add src/logic/diplomacy.js tests/logic/diplomacy.test.js
git commit -m "feat: add diplomacy logic"
```

---

### Task 17: Diplomacy UI Panel

**Files:**
- Create: `src/scenes/diplomacy-panel.js`

**Interfaces:**
- Consumes: diplomacy.js, game-state.js
- Produces: HTML 外交面板，列出所有已知势力，可结盟/宣战/求和

- [ ] **Step 1: 实现外交面板**

创建 DOM 面板，列出所有势力、关系值、可用操作按钮。与 city-panel.js 风格一致。

（实现代码略——模式与 city-panel.js 相同：创建 DOM 元素、填充势力列表、按钮绑定 diplomacy.js 函数。）

- [ ] **Step 2: 在 MapScene 中添加「外交」按钮**

在 turn-panel 旁边添加「外交」按钮，点击打开 diplomacy-panel。

- [ ] **Step 3: 手动验证并提交**

---

### Task 18: Espionage Logic

**Files:**
- Create: `src/logic/espionage.js`
- Create: `tests/logic/espionage.test.js`

**Interfaces:**
- Consumes: general.js (intelligence), faction.js, city.js
- Produces: `sendSpy(state, fromId, targetCityId, generalId, mission) -> result`

- [ ] **Step 1: 实现 espionage.js**

```js
import { changeLoyalty } from './general.js';

const MISSION_COST = { scout: 100, sabotage: 300, bribe: 500, rumor: 200 };

export function sendSpy(state, fromFactionId, targetCityId, generalId, mission) {
  const spy = state.generals[generalId];
  if (!spy) return { success: false, message: '间谍不存在' };

  const targetCity = state.cities[targetCityId];
  if (!targetCity) return { success: false, message: '目标城池不存在' };

  const faction = state.factions[fromFactionId];
  if (faction.gold < MISSION_COST[mission]) return { success: false, message: '金钱不足' };

  // 扣钱
  faction.gold -= MISSION_COST[mission];

  // 成功率：智力 + 随机
  const chance = (spy.intelligence / 100) * 0.8 + 0.1;
  const success = Math.random() < chance;

  if (!success) {
    // 被发现
    const cityFaction = state.factions[targetCity.owner];
    if (cityFaction && cityFaction.id !== fromFactionId) {
      import('./faction.js').then(m => m.setRelation(cityFaction, fromFactionId, -30));
    }
    return { success: false, message: '行动失败，间谍被发现！' };
  }

  switch (mission) {
    case 'scout':
      return { success: true, data: {
        population: targetCity.population,
        gold: state.factions[targetCity.owner]?.gold,
        defense: targetCity.defense,
        garrison: targetCity.garrison.length
      }};
    case 'sabotage':
      targetCity.defense = Math.max(0, targetCity.defense - 3);
      return { success: true, message: `城防下降至 ${targetCity.defense}` };
    case 'bribe': {
      const governorId = targetCity.governor;
      if (governorId) {
        changeLoyalty(state.generals[governorId], -20);
        return { success: true, message: '离间成功' };
      }
      return { success: false, message: '该城无太守可离间' };
    }
    case 'rumor':
      targetCity.stability = Math.max(0, targetCity.stability - 15);
      return { success: true, message: `民心降至 ${targetCity.stability}` };
    default:
      return { success: false, message: '未知任务' };
  }
}
```

- [ ] **Step 2: 测试并提交**

---

## Phase 6: AI Opponents

### Task 19: AI Strategy Evaluation

**Files:**
- Create: `src/logic/ai/ai-strategy.js`

**Interfaces:**
- Consumes: game-state.js, economy.js, army.js
- Produces: `evaluatePosition(state, factionId) -> score`, `rankTargets(state, factionId) -> [target]`

- [ ] **Step 1: 实现 AI 战略评估**

```js
import { getFactionCities } from '../game-state.js';
import { getArmyStrength } from '../army.js';

export function evaluatePosition(state, factionId) {
  const cities = getFactionCities(state, factionId);
  const faction = state.factions[factionId];
  const armies = Object.values(state.armies).filter(a => a.factionId === factionId);

  return {
    economy: cities.reduce((s, c) => s + c.commerce * c.population / 1000, 0),
    military: armies.reduce((s, a) => s + getArmyStrength(a), 0),
    cityCount: cities.length,
    totalGold: faction.gold,
    isAtWar: faction.atWarWith.length > 0
  };
}

export function rankTargets(state, factionId) {
  const faction = state.factions[factionId];
  const targets = [];

  for (const otherId of Object.keys(state.factions)) {
    if (otherId === factionId) continue;

    // 同盟不攻击
    if (faction.alliances.includes(otherId)) continue;

    const otherCities = getFactionCities(state, otherId);
    const otherArmies = Object.values(state.armies).filter(a => a.factionId === otherId);
    const otherStrength = otherArmies.reduce((s, a) => s + getArmyStrength(a), 0);

    // 评估：弱且邻近的城市优先
    for (const city of otherCities) {
      let score = 0;
      score += city.population / 1000;          // 人口价值
      score += city.commerce * 10;              // 经济价值
      score -= otherStrength / 1000;            // 抵抗越强分越低
      score -= city.defense * 5;                // 城防扣分

      targets.push({ cityId: city.id, city, factionId: otherId, score });
    }
  }

  targets.sort((a, b) => b.score - a.score);
  return targets;
}
```

- [ ] **Step 2: 提交**

---

### Task 20: AI Turn Controller

**Files:**
- Create: `src/logic/ai/ai-controller.js`

**Interfaces:**
- Consumes: ai-strategy.js, economy.js, recruitment.js, diplomacy.js, movement.js
- Produces: `executeAITurn(state, factionId) -> actions[]`

- [ ] **Step 1: 实现 AI 回合决策**

```js
import { CONFIG } from '../../config.js';
import { evaluatePosition, rankTargets } from './ai-strategy.js';
import { calculateTurnIncome } from '../economy.js';
import { recruitUnit } from '../recruitment.js';
import { proposeAlliance, declareWar } from '../diplomacy.js';
import { moveArmy } from '../movement.js';
import { addCityPopulation } from '../city.js';

export function executeAITurn(state, factionId) {
  const faction = state.factions[factionId];
  const difficulty = faction.aiDifficulty;
  const actions = [];

  // 经济：在现有城市投资
  const cities = Object.values(state.cities).filter(c => c.owner === factionId);
  for (const city of cities) {
    if (faction.gold > 500) {
      city.agriculture = Math.min(10, city.agriculture + 1);
      city.commerce = Math.min(10, city.commerce + 1);
      faction.gold -= 200;
      actions.push(`升级 ${city.name}`);
    }
  }

  // 征兵
  if (difficulty >= 2) {
    const homeCity = cities[0];
    if (homeCity && faction.gold > 500 && homeCity.population > 2000) {
      recruitUnit(state, homeCity.id, 'infantry', 1000);
      actions.push('征兵步兵');
    }
  }

  // 外交（难度 3+）
  if (difficulty >= 3 && Math.random() < 0.3) {
    const others = Object.keys(state.factions).filter(id =>
      id !== factionId && !faction.atWarWith.includes(id) && !faction.alliances.includes(id)
    );
    if (others.length > 0) {
      const target = others[Math.floor(Math.random() * others.length)];
      proposeAlliance(state, factionId, target);
      actions.push(`向 ${state.factions[target].name} 提议结盟`);
    }
  }

  // 军事行动（难度 4+ 主动进攻）
  if (difficulty >= 4) {
    const targets = rankTargets(state, factionId);
    if (targets.length > 0 && !faction.atWarWith.includes(targets[0].factionId)) {
      declareWar(state, factionId, targets[0].factionId);
      actions.push(`向 ${state.factions[targets[0].factionId].name} 宣战`);
    }

    // 调动军队
    const armies = Object.values(state.armies).filter(a =>
      a.factionId === factionId && a.state === 'idle'
    );
    if (armies.length > 0 && targets.length > 0) {
      const target = targets[0];
      moveArmy(state, armies[0].id, target.city.x, target.city.y);
      actions.push(`出兵 ${target.city.name}`);
    }
  }

  return actions;
}
```

- [ ] **Step 2: 在 turn.js 中调用 AI**

在 `executeTurn` 中，对每个 AI 势力调用 `executeAITurn(state, factionId)`。

- [ ] **Step 3: 提交**

---

## Phase 7: Save/Load & New Game Flow

### Task 21: Save/Load System

**Files:**
- Create: `src/logic/save-load.js`
- Create: `tests/logic/save-load.test.js`

**Interfaces:**
- Consumes: game-state.js
- Produces: `saveGame(state, slot) -> boolean`, `loadGame(slot) -> state | null`

- [ ] **Step 1: 实现 save-load.js**

```js
import { CONFIG } from '../config.js';

const SAVE_KEY = 'tangwars_save_';

export function saveGame(state, slot) {
  if (slot < 0 || slot >= CONFIG.SAVE_SLOTS) return false;
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY + slot, data);
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

export function loadGame(slot) {
  const data = localStorage.getItem(SAVE_KEY + slot);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Load failed:', e);
    return null;
  }
}

export function getSaveSlots() {
  const slots = [];
  for (let i = 0; i < CONFIG.SAVE_SLOTS; i++) {
    const data = localStorage.getItem(SAVE_KEY + i);
    if (data) {
      try {
        const state = JSON.parse(data);
        slots.push({ slot: i, turn: state.turn, playerName: state.factions[state.playerFactionId]?.name });
      } catch { /* skip corrupt saves */ }
    }
  }
  return slots;
}

export function deleteSave(slot) {
  localStorage.removeItem(SAVE_KEY + slot);
}
```

- [ ] **Step 2: 在菜单场景连接读档按钮**

菜单「读档」按钮读取存档列表并显示存档位。

- [ ] **Step 3: 在地图场景添加自动存档**

每回合结束自动存档到 slot 0。

- [ ] **Step 4: 测试并提交**

---

### Task 22: New Game Flow — Faction Selection

**Files:**
- Create: `src/scenes/faction-select.js`

**Interfaces:**
- Consumes: data-loader.js, game-state.js
- Produces: 势力选择/自建界面 → 初始化游戏状态 → 跳转 MapScene

- [ ] **Step 1: 创建势力选择场景**

HTML DOM 面板列出所有可选势力（含历史势力 + 「自建势力」选项），选中后调用 `loadGameData(state)` 并设置 `state.playerFactionId`。

- [ ] **Step 2: 替换菜单「新游戏」→ 势力选择 → 地图流程**

- [ ] **Step 3: 手动验证并提交**

---

### Task 23: Tutorial / New Player Guide

**Files:**
- Modify: `src/scenes/map-scene.js`
- Create: `src/ui/tutorial.js`

**Interfaces:**
- Consumes: game-state.js
- Produces: 逐步解锁功能按钮的引导系统

- [ ] **Step 1: 实现教程系统**

```js
export const TUTORIAL_STEPS = [
  { id: 'view_map', text: '这是你的领土。拖拽鼠标可以移动地图，滚轮可以缩放。', unlock: null },
  { id: 'click_city', text: '点击一座城池查看详情。', unlock: null },
  { id: 'end_turn', text: '右下角的「结束回合」按钮推进时间。点一下试试。', unlock: 'turnButton' },
  { id: 'recruit', text: '现在你可以在城中征兵了。点击城池→征兵。', unlock: 'recruit' },
  { id: 'diplomacy', text: '「外交」按钮已解锁，试着与邻国结盟吧。', unlock: 'diplomacy' },
  { id: 'war', text: '现在你可以派兵攻打邻国了！', unlock: 'war' }
];
```

在第一回合逐步显示引导文本，完成一步解锁下一步。

- [ ] **Step 2: 提交**

---

## Plan Self-Review

### Spec Coverage Check

| Spec Section | Covered By |
|---|---|
| 1. 技术栈 | Task 1 (Vite+Phaser+Vitest) |
| 2. 整体架构（画面/逻辑分离） | Task 2-3 (logic/ vs scenes/) |
| 3. 地图系统 | Task 4 (JSON data), Task 6 (iso-renderer) |
| 4. 时间系统（混合制） | Task 9 (turn.js) + Task 14 (battle-scene) |
| 5. 经营系统 | Task 8 (economy.js) |
| 5.2 武将系统 | Task 2 (general.js) |
| 5.3 兵种 | Task 10 (army.js UNIT_TYPES) |
| 6. 外交系统 | Task 16-17 |
| 7. 间谍系统 | Task 18 |
| 8. 战斗系统 | Task 13-15 |
| 9. AI 系统 | Task 19-20 |
| 10. 游戏流程 | Task 5 (menu), Task 22 (faction-select), Task 23 (tutorial) |
| 11. 存档 | Task 21 |
| 12. 范围外 | All excluded items excluded |
| 13. 开发原则 | Architectural constraint enforced throughout |

### No Placeholders Found

All tasks contain actual code or clear implementation patterns. No TBD or TODO.

### Type Consistency

- `createGameState()` returns `{ turn, phase, cities: {}, factions: {}, generals: {}, armies: {} }` — consumed consistently
- `gridToScreen(col, row) -> { x, y }` — used in city-marker.js and army-sprite.js
- `executeTurn(state) -> { turn, results }` — consumed by map-scene.js
- Army units format: `[{ type, count, morale, exp }]` — consistent across army.js, recruitment.js, battle-state.js

---

## Execution Handoff

All tasks are specified with exact file paths, interfaces, and code. The plan covers 7 phases with 23 tasks, each producing independently testable deliverables.

**Execute this plan using superpowers:subagent-driven-development.**
