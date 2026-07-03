import { CONFIG } from '../config.js';

const DEFAULT_KEY = 'tang-wars-saves';

/**
 * 存档系统：把游戏状态存到浏览器 localStorage。
 *
 * 生活类比：就像玩单机游戏时按"保存"，下次打开能继续玩。
 * localStorage 是浏览器给每个网站配的小储物柜，关掉网页数据还在。
 */

/**
 * 保存游戏到指定存档位。
 *
 * @param {object} state - GameState
 * @param {number} slot - 1~5
 * @param {string} name - 存档名
 * @param {string} [key] - localStorage key（测试用）
 * @returns {{ success: boolean, slot: number, name: string, turn: number }}
 */
export function saveGame(state, slot, name, key = DEFAULT_KEY) {
  if (slot < 1 || slot > CONFIG.SAVE_SLOTS) {
    return { success: false, slot, name, turn: state.turn,
      error: `存档位必须在 1~${CONFIG.SAVE_SLOTS} 之间` };
  }

  // 只存纯数据，不存函数和引用
  const saveData = {
    slot,
    name,
    turn: state.turn,
    phase: state.phase,
    playerFactionId: state.playerFactionId,
    cities: state.cities,
    factions: state.factions,
    generals: state.generals,
    armies: state.armies,
    turnLog: state.turnLog,
    savedAt: new Date().toISOString()
  };

  try {
    const allSaves = loadAllSaves(key);
    allSaves[slot] = saveData;
    localStorage.setItem(key, JSON.stringify(allSaves));
    return { success: true, slot, name, turn: state.turn };
  } catch (e) {
    return { success: false, slot, name, turn: state.turn,
      error: '保存失败：' + e.message };
  }
}

/**
 * 读取指定存档位的游戏数据。
 *
 * @returns {object|null} 游戏状态 或 null
 */
export function loadGame(slot, key = DEFAULT_KEY) {
  const allSaves = loadAllSaves(key);
  return allSaves[slot] || null;
}

/**
 * 列出所有存档的摘要信息。
 *
 * @returns {Array<{slot: number, name: string, turn: number, savedAt: string}>}
 */
export function listSaves(key = DEFAULT_KEY) {
  const allSaves = loadAllSaves(key);
  return Object.values(allSaves)
    .filter(Boolean)
    .map(s => ({
      slot: s.slot,
      name: s.name,
      turn: s.turn,
      savedAt: s.savedAt
    }))
    .sort((a, b) => a.slot - b.slot);
}

/**
 * 删除一个存档位。
 */
export function deleteSave(slot, key = DEFAULT_KEY) {
  const allSaves = loadAllSaves(key);
  delete allSaves[slot];
  localStorage.setItem(key, JSON.stringify(allSaves));
}

/** 读取全部存档 */
function loadAllSaves(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
