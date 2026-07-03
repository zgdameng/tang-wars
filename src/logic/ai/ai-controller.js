import { CONFIG } from '../../config.js';
import { applyTurnEconomy } from '../economy.js';
import { recruitUnit } from '../recruitment.js';
import { decideGoal } from './ai-strategy.js';
import { declareWar } from '../diplomacy.js';

/**
 * 为单个 AI 势力执行一回合决策。
 *
 * 生活类比：好比电脑版大富翁中，AI 选手会在自己回合时自动买地盖房。
 *
 * @param {object} state - GameState
 * @param {string} factionId
 */
export function executeAITurn(state, factionId) {
  const faction = state.factions[factionId];
  if (!faction || faction.isHuman) return;

  const diff = faction.aiDifficulty || 3;
  const efficiency = CONFIG.AI_ECONOMY_EFFICIENCY[diff - 1] || 1.0;

  // 1. 经济（效率受难度影响）
  const income = applyTurnEconomy(state, factionId);
  // 低难度的 AI 收入打折
  if (efficiency < 1) {
    const lost = Math.floor(income.gold * (1 - efficiency));
    faction.gold -= lost;
  }

  // 2. 征兵（有钱就招兵）
  for (const cityId of faction.cities) {
    const city = state.cities[cityId];
    if (!city) continue;

    // 高难度 AI 征兵更积极
    const budget = Math.floor(faction.gold * (0.3 + diff * 0.1));
    if (budget < 200) continue;

    const possible = Math.min(
      Math.floor(budget / 100),
      Math.floor(city.population * 0.05) // 最多征 5% 人口
    );
    if (possible >= 10) {
      recruitUnit(state, cityId, 'infantry', possible);
    }
  }

  // 3. 战略决策
  const goal = decideGoal(state, factionId, diff);

  // 4. 高难度 AI：对玩家用间谍
  if (diff >= 4 && state.playerFactionId) {
    const playerCities = state.factions[state.playerFactionId]?.cities || [];
    if (playerCities.length > 0) {
      const target = state.cities[playerCities[0]];
      if (target && faction.gold > 500 && Math.random() < 0.3) {
        // 简易间谍行为：直接降民心（不消耗武将）
        target.stability = Math.max(0, target.stability - 5);
        state.turnLog.push(`${faction.name} 的间谍在 ${target.name} 散布谣言。`);
        faction.gold -= 300;
      }
    }
  }

  // 5. 对弱邻宣战（难度 3+）
  if (goal.action === 'attack' && goal.target && diff >= 3) {
    const targetFaction = state.factions[goal.target];
    if (targetFaction && !faction.atWarWith.includes(goal.target)) {
      declareWar(state, factionId, goal.target);
    }
  }

  state.turnLog.push(`${faction.name}：${goal.reason}`);
}
