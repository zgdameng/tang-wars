import { UNIT_TYPES } from '../army.js';

/**
 * 战斗中的兵种单位——从大地图部队转换而来。
 * 每个士兵 10 点血，士气独立计算。
 *
 * @param {object} armyUnit - { type, count, morale, exp }
 * @param {string} side - 'attacker' | 'defender'
 * @param {object} bonuses - { attack?, defense? } 武将加成
 * @returns {object}
 */
export function createBattleUnit(armyUnit, side, bonuses = {}) {
  const def = UNIT_TYPES[armyUnit.type];
  return {
    type: armyUnit.type,
    side,
    count: armyUnit.count,
    morale: armyUnit.morale,
    exp: armyUnit.exp || 0,
    // 每个士兵 10 点血，总血量 = 人数 × 10
    maxHp: armyUnit.count * 10,
    hp: armyUnit.count * 10,
    // 基础攻防 + 武将加成
    attack: def.attack + (bonuses.attack || 0),
    defense: def.defense + (bonuses.defense || 0),
    speed: def.speed,
    position: { x: 0, y: 0 },
    target: null,
    state: 'idle',           // 'idle' | 'moving' | 'fighting' | 'routed'
    attackCooldown: 0
  };
}

/**
 * 计算一次攻击造成的伤害。
 * 公式：攻方攻击力 × (兵数/100) - 守方防御力 × (兵数/100) × 0.5
 * 克制方伤害 +30%（环形克制：步>骑>弓>步）
 *
 * @param {object} attacker - BattleUnit
 * @param {object} defender - BattleUnit
 * @returns {number} 伤害值（最小为 1）
 */
export function getDamage(attacker, defender) {
  const atkPower = attacker.attack * (attacker.count / 100);
  const defPower = defender.defense * (defender.count / 100);
  let damage = Math.max(1, atkPower - defPower * 0.5);

  // 兵种克制检查
  const counterTarget = UNIT_TYPES[attacker.type]?.counters;
  if (counterTarget === defender.type) {
    damage = Math.floor(damage * 1.3);
  }

  return Math.floor(damage);
}
