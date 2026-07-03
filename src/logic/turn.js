import { applyTurnEconomy } from './economy.js';
import { getAllFactions, endTurn } from './game-state.js';
import { advanceAllMovements, checkCombatEncounters } from './movement.js';
import { executeAITurn } from './ai/ai-controller.js';

/**
 * 执行一回合结算：所有势力收钱涨人口，回合数+1。
 *
 * 生活类比：就像玩大富翁掷完一次骰子后，银行发工资、收房租的程序。
 * 玩家和 AI 都走这套，不分先后。
 *
 * @param {object} state - GameState
 * @returns {{ turn: number, prevTurn: number, results: Array }}
 */
export function executeTurn(state) {
  const results = [];

  // 处理所有势力：人类只跑经济，AI 跑完整决策
  for (const faction of getAllFactions(state)) {
    if (faction.isHuman) {
      const income = applyTurnEconomy(state, faction.id);
      results.push({ factionId: faction.id, income });
    } else {
      executeAITurn(state, faction.id);
      results.push({ factionId: faction.id });
    }
  }

  // 行军推进：每回合所有移动中的部队前进一步
  advanceAllMovements(state);

  // 检查是否有遭遇战（野战或攻城）
  const encounters = checkCombatEncounters(state);
  if (encounters) {
    state.encounters = encounters;
    state.phase = 'battle';
  }

  const prevTurn = state.turn;
  endTurn(state);

  return { turn: state.turn, prevTurn, results, encounters };
}
