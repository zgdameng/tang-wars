import { createBattleUnit } from './battle-units.js';

/** 地形对战斗的影响 */
export const TERRAIN_MODS = {
  plains:   { name: '平原', speedMod: 1.0, defenseMod: 0 },
  hills:    { name: '山地', speedMod: 0.7, defenseMod: 2 },
  river:    { name: '河畔', speedMod: 0.8, defenseMod: 1 }
};

/**
 * 创建一场战斗的状态。
 *
 * 生活类比：棋盘上两军相遇→摆开战场→双方列阵→开始厮杀。
 *
 * @param {object} opts
 * @param {string} opts.terrain - 'plains' | 'hills' | 'river'
 * @param {boolean} opts.isSiege - 是否攻城战
 * @param {string} opts.attackerFactionId
 * @param {string} opts.defenderFactionId
 * @param {Array} opts.attackerUnits - 大地图部队 units
 * @param {Array} opts.defenderUnits - 大地图部队 units
 * @returns {object}
 */
export function createBattleState(opts) {
  return {
    terrain: opts.terrain || 'plains',
    isSiege: opts.isSiege || false,
    attacker: {
      factionId: opts.attackerFactionId,
      generalId: opts.attackerGeneralId || null,
      // 攻方有小幅攻击加成
      units: opts.attackerUnits.map(u =>
        createBattleUnit(u, 'attacker', { attack: 2, defense: 0 })
      )
    },
    defender: {
      factionId: opts.defenderFactionId,
      generalId: opts.defenderGeneralId || null,
      // 守方有小幅防御加成
      units: opts.defenderUnits.map(u =>
        createBattleUnit(u, 'defender', { attack: 0, defense: 2 })
      ),
      siegeBonus: opts.isSiege ? 5 : 0  // 守城方额外防御
    },
    time: 0,           // 已战斗时间（秒）
    maxTime: 45,       // 45 秒上限，超时判守方胜（模拟时间，实际约 15-45 秒）
    events: [],
    winner: null
  };
}

/**
 * 判断战斗是否结束。
 *
 * @returns {string|null} 'attacker' | 'defender' | null（未结束）
 */
export function checkBattleEnd(battle) {
  // 用 count（兵数）判断存活，因为战斗中只扣 count 不扣 hp
  const atkAlive = battle.attacker.units.some(
    u => u.count > 0 && u.morale > 0
  );
  const defAlive = battle.defender.units.some(
    u => u.count > 0 && u.morale > 0
  );

  if (!atkAlive) return 'defender';
  if (!defAlive) return 'attacker';

  // 超时 45 秒（模拟时间），奔袭不利攻方，判守方胜
  if (battle.time >= battle.maxTime) return 'defender';

  return null;
}
