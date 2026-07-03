/**
 * 兵种定义和部队逻辑。
 *
 * 三种基础兵种：
 * 步兵 — 攻防均衡，便宜，克骑兵
 * 骑兵 — 高攻高速，贵，克弓兵
 * 弓兵 — 远程攻击，脆，克步兵
 * 克制关系：步兵 > 骑兵 > 弓兵 > 步兵（环形）
 */

export const UNIT_TYPES = {
  infantry: {
    name: '步兵', attack: 10, defense: 12, speed: 3,
    cost: 100, counters: 'cavalry'
  },
  cavalry: {
    name: '骑兵', attack: 15, defense: 8, speed: 6,
    cost: 200, counters: 'archer'
  },
  archer: {
    name: '弓兵', attack: 12, defense: 6, speed: 4,
    cost: 150, counters: 'infantry'
  }
};

/**
 * 创建一支部队。
 * 部队是行军/战斗的基本单位，包含若干兵种编组。
 *
 * @param {{ id, factionId, position?, generalId?, inCity?, units? }} opts
 * @returns {object} army
 */
export function createArmy(opts) {
  return {
    id: opts.id,
    factionId: opts.factionId,
    generalId: opts.generalId || null,
    units: opts.units || [],        // [{ type, count, morale, exp }, ...]
    position: opts.position || null, // { x, y } 地图坐标
    inCity: opts.inCity || null,     // 驻守城池 ID
    state: 'idle',                   // 'idle' | 'moving' | 'fighting' | 'retreating'
    moveTarget: null,
    movePath: null,
    moveTurnsRemaining: 0
  };
}

/**
 * 计算一支部队的综合战斗力。
 * 公式：Σ(兵种攻防和 × 人数 × 士气系数)
 * 士气 100 = 满战斗力，士气 0 = 无战斗力
 */
export function getArmyStrength(army) {
  let total = 0;
  for (const unit of army.units) {
    const def = UNIT_TYPES[unit.type];
    if (!def) continue;
    total += (def.attack + def.defense) * unit.count * (unit.morale / 100);
  }
  return Math.floor(total);
}

/**
 * 获取部队行军速度 = 最慢兵种的速度。
 * 生活类比：大家排队走，走得最快也得等最慢的人。
 */
export function getArmySpeed(army) {
  if (army.units.length === 0) return 3;
  const speeds = army.units.map(u => UNIT_TYPES[u.type]?.speed || 3);
  return Math.min(...speeds);
}
