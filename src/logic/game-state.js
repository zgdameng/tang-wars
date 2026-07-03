import { createCity } from './city.js';
import { createFaction, setRelation } from './faction.js';
import { createGeneral } from './general.js';

/**
 * GameState 是整个游戏的"数据库"。
 * 所有实体（城池、势力、武将、部队）都存在这里，通过 ID 查找。
 * 画面层通过 getEntities() 获取当前快照来渲染。
 */

export function createGameState(opts = {}) {
  return {
    turn: opts.turn || 1,
    phase: 'economy',             // 'economy' | 'military' | 'battle' | 'ai'
    cities: {},                   // { cityId: city }
    factions: {},                 // { factionId: faction }
    generals: {},                 // { generalId: general }
    armies: {},                   // { armyId: army }
    playerFactionId: opts.playerFactionId || null,
    battleState: null,            // 战斗中才有值
    turnLog: []                   // 本回合发生的事件记录
  };
}

export function addCity(state, opts) {
  const city = createCity(opts);
  state.cities[city.id] = city;
  if (city.owner) {
    const faction = state.factions[city.owner];
    if (faction) faction.cities.push(city.id);
  }
  return city;
}

export function addFaction(state, opts) {
  const faction = createFaction(opts);
  const existingIds = Object.keys(state.factions);
  state.factions[faction.id] = faction;
  for (const otherId of existingIds) {
    setRelation(faction, otherId, 0);
    setRelation(state.factions[otherId], faction.id, 0);
  }
  return faction;
}

export function addGeneral(state, opts) {
  const general = createGeneral(opts);
  state.generals[general.id] = general;
  if (general.factionId) {
    const faction = state.factions[general.factionId];
    if (faction) faction.generals.push(general.id);
  }
  return general;
}

export function getCityById(state, id) {
  return state.cities[id] || null;
}

export function getFactionById(state, id) {
  return state.factions[id] || null;
}

export function getGeneralById(state, id) {
  return state.generals[id] || null;
}

export function getPlayerFaction(state) {
  return state.factions[state.playerFactionId] || null;
}

export function getPlayerCities(state) {
  const faction = getPlayerFaction(state);
  if (!faction) return [];
  return faction.cities.map(id => state.cities[id]).filter(Boolean);
}

export function getAllFactions(state) {
  return Object.values(state.factions);
}

export function getFactionCities(state, factionId) {
  const faction = state.factions[factionId];
  if (!faction) return [];
  return faction.cities.map(id => state.cities[id]).filter(Boolean);
}

export function endTurn(state) {
  state.turn += 1;
  state.phase = 'economy';
  state.turnLog = [];
  return state;
}

export function getEntities(state) {
  return {
    cities: state.cities,
    factions: state.factions,
    generals: state.generals,
    armies: state.armies
  };
}
