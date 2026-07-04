// 数据加载器——从 JSON 文件读取初始剧本，装进 GameState。
// 这个模块在游戏初始化时调用，本身不依赖 Phaser。

import citiesData from '../data/cities.json';
import factionsData from '../data/factions.json';
import generalsData from '../data/generals.json';
import { addCity, addFaction, addGeneral } from './game-state.js';

/**
 * 把 JSON 数据全部装进游戏状态，一步到位。
 *
 * @param {object} state - createGameState() 的返回值
 * @returns {{ cities: number, factions: number, generals: number }}
 */
export function loadGameData(state) {
  // 先装势力（addCity 需要 faction 已存在才能关联 owner）
  for (const f of factionsData) {
    addFaction(state, f);
    // 标记玩家势力
    if (f.isHuman && state.playerFactionId === null) {
      state.playerFactionId = f.id;
    }
  }

  // 再装城池（会关联 owner 到已存在的 faction）
  for (const c of citiesData) {
    addCity(state, c);
  }

  // 最后装武将
  for (const g of generalsData) {
    addGeneral(state, g);
  }

  // 将武将分配到所属势力的首城，首个武将当太守
  const governorAssigned = {}; // 记录每个势力是否已安排太守
  for (const g of generalsData) {
    if (!g.factionId) continue;
    const faction = state.factions[g.factionId];
    if (!faction || faction.cities.length === 0) continue;
    const homeCity = state.cities[faction.cities[0]];
    if (!homeCity) continue;
    state.generals[g.id].inCity = homeCity.id;
    // 只让第一个武将当太守
    if (!governorAssigned[g.factionId]) {
      homeCity.governor = g.id;
      governorAssigned[g.factionId] = true;
    }
  }

  return {
    cities: Object.keys(state.cities).length,
    factions: Object.keys(state.factions).length,
    generals: Object.keys(state.generals).length
  };
}
