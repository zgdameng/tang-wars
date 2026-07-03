import { spendGold } from './faction.js';
import { changeLoyalty } from './general.js';

const SPY_COST = 300; // 每次间谍行动基础花费

/**
 * 刺探敌城——显示城里兵力、钱粮、城防等详细信息。
 * 成功率 = 间谍智力 - 守将智力 + 50（基础）
 */
export function spyScout(state, factionId, spyGeneralId, targetCityId) {
  const faction = state.factions[factionId];
  const spy = state.generals[spyGeneralId];
  const city = state.cities[targetCityId];
  if (!faction || !spy || !city) return { success: false, message: '目标不存在' };

  if (!spendGold(faction, SPY_COST)) {
    return { success: false, message: '经费不足，无法派遣间谍' };
  }

  const defenderIntel = city.governor
    ? state.generals[city.governor]?.intelligence || 30
    : 20;
  const chance = (spy.intelligence - defenderIntel + 50) / 100;

  if (Math.random() < Math.max(0.1, Math.min(0.95, chance))) {
    return {
      success: true,
      message: `成功刺探 ${city.name}！`,
      info: {
        name: city.name,
        population: city.population,
        agriculture: city.agriculture,
        commerce: city.commerce,
        defense: city.defense,
        stability: city.stability,
        garrison: city.garrison.length
      }
    };
  }

  // 失败可能被发现
  relationDamage(state, factionId, city.owner);
  return { success: false, message: '间谍被抓获！外交关系恶化。' };
}

/**
 * 破坏敌城——降低城防或民心。
 * 成功：城防 -2（最低为 0）
 */
export function spySabotage(state, factionId, spyGeneralId, targetCityId) {
  const faction = state.factions[factionId];
  const spy = state.generals[spyGeneralId];
  const city = state.cities[targetCityId];
  if (!faction || !spy || !city) return { success: false, message: '目标不存在' };

  if (!spendGold(faction, SPY_COST)) {
    return { success: false, message: '经费不足' };
  }

  const chance = spy.intelligence / 100;

  if (Math.random() < Math.max(0.15, Math.min(0.9, chance))) {
    city.defense = Math.max(0, city.defense - 2);
    return { success: true, message: `成功破坏 ${city.name} 的城防！` };
  }

  relationDamage(state, factionId, city.owner);
  return { success: false, message: '破坏行动失败，间谍被擒。' };
}

/**
 * 离间敌将——降低目标武将忠诚度。
 * 成功：忠诚 -15（最低为 0）
 * 成功率受间谍智力+魅力和目标智力影响
 */
export function spySowDiscord(state, factionId, spyGeneralId, targetGeneralId) {
  const faction = state.factions[factionId];
  const spy = state.generals[spyGeneralId];
  const target = state.generals[targetGeneralId];
  if (!faction || !spy || !target) return { success: false, message: '目标不存在' };

  if (!spendGold(faction, SPY_COST + 200)) {
    return { success: false, message: '经费不足' };
  }

  const chance = (spy.intelligence + spy.charisma - target.intelligence / 2) / 150;

  if (Math.random() < Math.max(0.1, Math.min(0.85, chance))) {
    changeLoyalty(target, -15);
    return {
      success: true,
      message: `成功离间 ${target.name}，忠诚度下降！`
    };
  }

  return { success: false, message: `离间 ${target.name} 失败，对方不为所动。` };
}

/**
 * 散布谣言——降低目标城民心。
 * 成功：民心 -10（最低为 0）
 */
export function spySpreadRumors(state, factionId, spyGeneralId, targetCityId) {
  const faction = state.factions[factionId];
  const spy = state.generals[spyGeneralId];
  const city = state.cities[targetCityId];
  if (!faction || !spy || !city) return { success: false, message: '目标不存在' };

  if (!spendGold(faction, SPY_COST)) {
    return { success: false, message: '经费不足' };
  }

  const chance = spy.intelligence / 100;

  if (Math.random() < Math.max(0.15, Math.min(0.85, chance))) {
    city.stability = Math.max(0, city.stability - 10);
    return { success: true, message: `谣言在 ${city.name} 散播开来，民心下降。` };
  }

  return { success: false, message: '谣言未能传开。' };
}

/** 间谍失败被发现：外交关系恶化 */
function relationDamage(state, factionId, targetOwnerId) {
  if (!targetOwnerId) return;
  const from = state.factions[factionId];
  const to = state.factions[targetOwnerId];
  if (!from || !to) return;
  from.relations[targetOwnerId] = Math.max(-100, (from.relations[targetOwnerId] || 0) - 10);
  to.relations[factionId] = Math.max(-100, (to.relations[factionId] || 0) - 10);
}
