import { CONFIG } from '../config.js';
import { getFactionCities } from './game-state.js';

/**
 * 计算一个势力本回合的金币收入。
 *
 * 公式：Σ(每座城的人口/1000 × 商业值 × 税率)
 * 例如：2万人口、商业5的城 → 20 × 5 × 0.3 = 30 金币/回合
 *
 * @param {object} state - GameState
 * @param {string} factionId
 * @returns {{ gold: number, upkeep: number, net: number }}
 */
export function calculateTurnIncome(state, factionId) {
  const cities = getFactionCities(state, factionId);
  let gold = 0;

  for (const city of cities) {
    gold += Math.floor(city.population / 1000 * city.commerce * CONFIG.BASE_TAX_RATE);
  }

  // 部队维护费（等 army 系统做好后补充计数）
  const totalArmies = 0;
  const upkeep = totalArmies * CONFIG.ARMY_UPKEEP_PER_UNIT;

  return { gold, upkeep, net: gold - upkeep };
}

/**
 * 计算一座城本回合的人口增长。
 *
 * 公式：(人口 × 基础增长率 + 农业 × 50) × 民心修正
 * 民心 0 时完全停长，民心 100 时全速增长。
 *
 * @param {{ population: number, agriculture: number, stability: number }} city
 * @returns {number}
 */
export function calculatePopulationGrowth(city) {
  const base = Math.floor(city.population * CONFIG.BASE_POP_GROWTH);
  const agriBonus = city.agriculture * 50;
  // 用整数运算避免 0.1+0.2=0.3000...004 这种浮点误差
  const stability = Math.max(0, city.stability);
  return Math.floor((base + agriBonus) * stability / 100);
}

/**
 * 对一个势力执行本回合经济结算：
 * 把收入加进金库，所有城人口增长。
 *
 * @param {object} state
 * @param {string} factionId
 * @returns {{ gold: number, net: number, popGrowth: number }}
 */
export function applyTurnEconomy(state, factionId) {
  const income = calculateTurnIncome(state, factionId);
  const faction = state.factions[factionId];
  if (!faction) return { gold: 0, net: 0, popGrowth: 0 };

  faction.gold += income.net;

  const cities = getFactionCities(state, factionId);
  let totalPopGrowth = 0;
  for (const city of cities) {
    const growth = calculatePopulationGrowth(city);
    city.population += growth;
    totalPopGrowth += growth;
  }

  return { gold: income.gold, net: income.net, popGrowth: totalPopGrowth };
}
