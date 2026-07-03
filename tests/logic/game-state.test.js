import { describe, it, expect } from 'vitest';
import {
  createGameState, addCity, addFaction, addGeneral,
  getCityById, getFactionById, getGeneralById,
  getPlayerFaction, getPlayerCities, getAllFactions,
  getFactionCities, endTurn, getEntities
} from '../../src/logic/game-state.js';

describe('createGameState', () => {
  it('should create empty state', () => {
    const state = createGameState();
    expect(state.turn).toBe(1);
    expect(state.phase).toBe('economy');
    expect(state.cities).toEqual({});
    expect(state.factions).toEqual({});
    expect(state.playerFactionId).toBeNull();
  });
});

describe('addCity', () => {
  it('should add city to state', () => {
    const state = createGameState();
    addCity(state, { id: 'c1', name: '城1', x: 5, y: 3 });
    expect(getCityById(state, 'c1').name).toBe('城1');
  });
});

describe('addFaction', () => {
  it('should add faction and set relations', () => {
    const state = createGameState();
    const f1 = addFaction(state, { id: 'f1', name: '势力1', color: 0xff0000 });
    const f2 = addFaction(state, { id: 'f2', name: '势力2', color: 0x0000ff });
    expect(f1.relations['f2']).toBe(0);
    expect(f2.relations['f1']).toBe(0);
  });
});

describe('addGeneral', () => {
  it('should add general to state', () => {
    const state = createGameState();
    addGeneral(state, { id: 'g1', name: '武将1', factionId: 'f1' });
    const g = getGeneralById(state, 'g1');
    expect(g).not.toBeNull();
    expect(g.name).toBe('武将1');
  });

  it('should register general in faction', () => {
    const state = createGameState();
    const f = addFaction(state, { id: 'f1', name: '势力1', color: 0xff0000 });
    addGeneral(state, { id: 'g1', name: '武将1', factionId: 'f1' });
    expect(f.generals).toContain('g1');
  });
});

describe('getPlayerFaction', () => {
  it('should return player faction when set', () => {
    const state = createGameState({ playerFactionId: 'f1' });
    addFaction(state, { id: 'f1', name: '势力1', color: 0xff0000 });
    const pf = getPlayerFaction(state);
    expect(pf).not.toBeNull();
    expect(pf.id).toBe('f1');
  });

  it('should return null when no player faction', () => {
    const state = createGameState();
    expect(getPlayerFaction(state)).toBeNull();
  });
});

describe('getPlayerCities', () => {
  it('should return cities owned by player faction', () => {
    const state = createGameState({ playerFactionId: 'f1' });
    addFaction(state, { id: 'f1', name: '势力1', color: 0xff0000 });
    addCity(state, { id: 'c1', name: '城1', x: 0, y: 0, owner: 'f1' });
    addCity(state, { id: 'c2', name: '城2', x: 1, y: 1, owner: 'f2' });
    const cities = getPlayerCities(state);
    expect(cities).toHaveLength(1);
    expect(cities[0].id).toBe('c1');
  });

  it('should return empty array when no player faction', () => {
    const state = createGameState();
    expect(getPlayerCities(state)).toEqual([]);
  });
});

describe('getAllFactions', () => {
  it('should return all factions in state', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '势力1', color: 0xff0000 });
    addFaction(state, { id: 'f2', name: '势力2', color: 0x0000ff });
    const all = getAllFactions(state);
    expect(all).toHaveLength(2);
  });
});

describe('getFactionCities', () => {
  it('should return cities for a given faction', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '势力1', color: 0xff0000 });
    addCity(state, { id: 'c1', name: '城1', x: 0, y: 0, owner: 'f1' });
    addCity(state, { id: 'c2', name: '城2', x: 1, y: 1, owner: 'f1' });
    const cities = getFactionCities(state, 'f1');
    expect(cities).toHaveLength(2);
  });

  it('should return empty array for unknown faction', () => {
    const state = createGameState();
    expect(getFactionCities(state, 'unknown')).toEqual([]);
  });
});

describe('endTurn', () => {
  it('should advance turn and reset phase', () => {
    const state = createGameState();
    state.phase = 'battle';
    state.turnLog = ['event1'];
    endTurn(state);
    expect(state.turn).toBe(2);
    expect(state.phase).toBe('economy');
    expect(state.turnLog).toEqual([]);
  });
});

describe('getEntities', () => {
  it('should return all entities from state', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '势力1', color: 0xff0000 });
    addCity(state, { id: 'c1', name: '城1', x: 0, y: 0, owner: 'f1' });
    addGeneral(state, { id: 'g1', name: '武将1', factionId: 'f1' });
    const entities = getEntities(state);
    expect(entities.cities).toBe(state.cities);
    expect(entities.factions).toBe(state.factions);
    expect(entities.generals).toBe(state.generals);
    expect(entities.armies).toBe(state.armies);
    expect(Object.keys(entities.cities)).toHaveLength(1);
    expect(Object.keys(entities.factions)).toHaveLength(1);
    expect(Object.keys(entities.generals)).toHaveLength(1);
  });
});
