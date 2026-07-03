/**
 * AI 战略评估工具。
 * 分析势力实力、邻国威胁，决定扩张/防守/发展。
 */

/** 评估一个势力的综合实力（兵力 + 经济折合） */
export function evaluateStrength(state, factionId) {
  const faction = state.factions[factionId];
  if (!faction) return 0;

  let military = 0;
  for (const army of Object.values(state.armies)) {
    if (army.factionId !== factionId) continue;
    for (const unit of army.units) {
      military += unit.count;
    }
  }

  // 金币也算实力（可征兵）：每 1000 金币折合 1 点
  const economy = Math.floor(faction.gold / 1000);

  return military + economy;
}

/** 获取与某势力相邻的敌对势力列表 */
export function getNeighbors(state, factionId) {
  const faction = state.factions[factionId];
  if (!faction) return [];

  const myCities = faction.cities.map(id => state.cities[id]).filter(Boolean);
  const neighbors = new Set();

  for (const city of myCities) {
    // 遍历所有城池找相邻（距离 ≤ 3 格算邻接）
    for (const other of Object.values(state.cities)) {
      if (other.id === city.id) continue;
      const dx = Math.abs(city.x - other.x);
      const dy = Math.abs(city.y - other.y);
      if (dx + dy <= 3 && other.owner && other.owner !== factionId) {
        neighbors.add(other.owner);
      }
    }
  }

  return [...neighbors];
}

/** 决定 AI 本回合的策略目标 */
export function decideGoal(state, factionId, difficulty) {
  const faction = state.factions[factionId];
  const myStrength = evaluateStrength(state, factionId);
  const neighbors = getNeighbors(state, factionId);

  // 评估邻国中谁的兵力最弱
  let weakestNeighbor = null;
  let weakestStr = Infinity;
  const atWarNeighbors = neighbors.filter(nid => faction.atWarWith.includes(nid));

  for (const nid of neighbors) {
    const ns = evaluateStrength(state, nid);
    if (ns < weakestStr) {
      weakestStr = ns;
      weakestNeighbor = nid;
    }
  }

  // 低难度偏防守，高难度偏进攻
  if (difficulty <= 2) {
    return { action: 'develop', reason: '稳固内政' };
  }

  if (atWarNeighbors.length > 0) {
    return { action: 'attack', target: atWarNeighbors[0], reason: '继续作战' };
  }

  if (weakestNeighbor && myStrength > weakestStr * 1.3) {
    return { action: 'attack', target: weakestNeighbor, reason: '趁虚而入' };
  }

  return { action: difficulty >= 4 ? 'expand' : 'develop', reason: '养精蓄锐' };
}
