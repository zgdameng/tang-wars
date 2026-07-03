import { setCityOwner } from '../city.js';

/**
 * 把战斗结果写回大地图状态。
 * 胜利→占城或消灭敌军，失败→损兵撤退。
 *
 * @param {object} state - GameState
 * @param {object} encounter - 遭遇战信息（含 type, attacker, defender）
 * @param {object} battleResult - { winner, attackerLosses, defenderLosses }
 */
export function applyBattleResult(state, encounter, battleResult) {
  const { winner } = battleResult;

  if (winner === 'attacker') {
    if (encounter.type === 'siege') {
      // 攻城胜利：占城
      const city = encounter.defender;
      const oldOwner = city.owner;
      setCityOwner(city, encounter.attacker.factionId);
      // 攻方部队入城
      const army = state.armies[encounter.attacker.id];
      if (army) {
        army.inCity = city.id;
        city.garrison.push(army.id);
      }
      state.turnLog.push(
        `${state.factions[encounter.attacker.factionId]?.name} 攻陷了 ${city.name}！`
      );
      // 原势力失去此城
      if (oldOwner && state.factions[oldOwner]) {
        state.factions[oldOwner].cities = state.factions[oldOwner].cities.filter(
          id => id !== city.id
        );
      }
    } else {
      // 野战胜利：消灭敌军
      const defArmy = state.armies[encounter.defender.id];
      if (defArmy) {
        defArmy.units = [];
        defArmy.state = 'destroyed';
      }
      state.turnLog.push('野战大捷！敌军被击溃。');
    }
  } else {
    // 防御方胜利：攻方撤退
    const atkArmy = state.armies[encounter.attacker.id];
    if (atkArmy) {
      atkArmy.state = 'retreating';
    }
    state.turnLog.push('进攻受挫，部队败退。');
  }

  // 应用双方伤亡
  applyLosses(encounter.attacker, battleResult.attackerLosses);
  if (encounter.type === 'field' && encounter.defender.id) {
    applyLosses(encounter.defender, battleResult.defenderLosses);
  }

  state.phase = 'economy';
  state.encounters = null;
}

function applyLosses(army, losses) {
  if (!army || !army.units) return;
  for (const loss of losses) {
    const unit = army.units.find(u => u.type === loss.type);
    if (unit) {
      unit.count = Math.max(0, unit.count - loss.lost);
    }
  }
  army.units = army.units.filter(u => u.count > 0);
  if (army.units.length === 0) {
    army.state = 'destroyed';
  }
}
