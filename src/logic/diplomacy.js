import { setRelation, getRelation, addPrestige } from './faction.js';

/**
 * 提议结盟。
 * 成功率 = 基础 30% + 关系值/200 + 声望/2000
 *
 * @returns {{ success: boolean, message: string }}
 */
export function proposeAlliance(state, fromId, toId) {
  const from = state.factions[fromId];
  const to = state.factions[toId];
  if (!from || !to) return { success: false, message: '势力不存在' };

  if (from.atWarWith.includes(toId)) {
    return { success: false, message: '双方处于战争状态，无法结盟' };
  }

  const relation = getRelation(from, toId);
  const chance = 0.3 + relation / 200 + from.prestige / 2000;

  if (Math.random() < chance) {
    setRelation(from, toId, Math.min(100, relation + 30));
    setRelation(to, fromId, Math.min(100, getRelation(to, fromId) + 30));
    from.alliances.push(toId);
    to.alliances.push(fromId);
    return { success: true, message: `${to.name} 接受了结盟提议` };
  }
  return { success: false, message: `${to.name} 婉拒了结盟提议` };
}

/**
 * 宣战：撕毁盟约，设为敌对，降声望。
 */
export function declareWar(state, fromId, toId) {
  const from = state.factions[fromId];
  const to = state.factions[toId];
  if (!from || !to) return;

  // 移除现有盟约
  from.alliances = from.alliances.filter(id => id !== toId);
  to.alliances = to.alliances.filter(id => id !== fromId);

  // 设置战争状态
  if (!from.atWarWith.includes(toId)) from.atWarWith.push(toId);
  if (!to.atWarWith.includes(fromId)) to.atWarWith.push(fromId);

  // 无故宣战？（检查宣战前的关系，再跌到谷底）
  const wasNeutral = getRelation(from, toId) >= -20;

  setRelation(from, toId, -100);
  setRelation(to, fromId, -100);

  if (wasNeutral) {
    addPrestige(from, -50);
  }

  state.turnLog.push(`${from.name} 向 ${to.name} 宣战！`);
}

/**
 * 撕毁盟约：取消结盟，关系恶化，大幅降声望。
 */
export function breakAlliance(state, fromId, toId) {
  const from = state.factions[fromId];
  const to = state.factions[toId];
  if (!from || !to) return;

  from.alliances = from.alliances.filter(id => id !== toId);
  to.alliances = to.alliances.filter(id => id !== fromId);
  setRelation(from, toId, -50);
  setRelation(to, fromId, -50);
  addPrestige(from, -100);

  state.turnLog.push(`${from.name} 撕毁了与 ${to.name} 的盟约！失信于天下。`);
}

/**
 * 求和：结束战争状态。
 * 对方接受概率 = 10% + 关系/500 + 赔款/5000 + 割城+40%
 *
 * @param {object} terms - { gold?, cityId? }
 * @returns {{ success: boolean, message: string }}
 */
export function sueForPeace(state, fromId, toId, terms = {}) {
  const from = state.factions[fromId];
  const to = state.factions[toId];
  if (!from || !to) return { success: false, message: '势力不存在' };

  const goldOffer = terms.gold || 0;
  const cityOffer = terms.cityId || null;

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
