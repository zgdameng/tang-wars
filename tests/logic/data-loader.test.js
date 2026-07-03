import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/logic/game-state.js';
import { loadGameData } from '../../src/logic/data-loader.js';

describe('loadGameData', () => {
  it('should load 20 cities, 9 factions, and 10 generals', () => {
    const state = createGameState();
    const result = loadGameData(state);

    expect(result.cities).toBe(20);
    expect(result.factions).toBe(9);
    expect(result.generals).toBe(10);
  });

  it('should set player faction to the one marked isHuman', () => {
    const state = createGameState();
    loadGameData(state);

    expect(state.playerFactionId).toBe('li-keyong');
    const player = state.factions['li-keyong'];
    expect(player.isHuman).toBe(true);
  });

  it('should assign cities to their owners', () => {
    const state = createGameState();
    loadGameData(state);

    const taiyuan = state.cities['taiyuan'];
    expect(taiyuan.owner).toBe('li-keyong');
    expect(taiyuan.population).toBe(60000);

    // 无主城襄阳
    const xiangyang = state.cities['xiangyang'];
    expect(xiangyang.owner).toBeNull();
  });

  it('should add city ids to faction city list', () => {
    const state = createGameState();
    loadGameData(state);

    const liKeyong = state.factions['li-keyong'];
    expect(liKeyong.cities).toContain('taiyuan');
    expect(liKeyong.cities).toContain('hezhong');
    expect(liKeyong.cities).toContain('luzhou');
    expect(liKeyong.cities.length).toBe(3);
  });

  it('should assign generals to their faction home city as governor', () => {
    const state = createGameState();
    loadGameData(state);

    const liKeyongGen = state.generals['li-keyong-gen'];
    expect(liKeyongGen.factionId).toBe('li-keyong');
    expect(liKeyongGen.inCity).toBe('taiyuan');

    const taiyuan = state.cities['taiyuan'];
    expect(taiyuan.governor).toBe('li-keyong-gen');
  });

  it('should add general ids to faction general list', () => {
    const state = createGameState();
    loadGameData(state);

    const liKeyong = state.factions['li-keyong'];
    expect(liKeyong.generals).toContain('li-keyong-gen');
    expect(liKeyong.generals).toContain('li-cunxiao');
    expect(liKeyong.generals).toContain('zhou-dewei');
    expect(liKeyong.generals.length).toBe(3);
  });

  it('should set up relations between all factions as neutral (0)', () => {
    const state = createGameState();
    loadGameData(state);

    const liKeyong = state.factions['li-keyong'];
    const zhuWen = state.factions['zhu-wen'];
    expect(liKeyong.relations['zhu-wen']).toBe(0);
    expect(zhuWen.relations['li-keyong']).toBe(0);
  });
});
