import { describe, it, expect } from 'vitest';
import { createGameState, addCity, addFaction } from '../../src/logic/game-state.js';
import { executeTurn } from '../../src/logic/turn.js';

describe('executeTurn', () => {
  it('should advance turn number by 1', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000, isHuman: true });

    const result = executeTurn(state);
    expect(result.turn).toBe(2);
    expect(result.prevTurn).toBe(1);
    expect(state.turn).toBe(2);
  });

  it('should add income to faction gold', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000, isHuman: true });
    addCity(state, { id: 'c1', name: '富城', x: 0, y: 0, owner: 'f1', population: 20000, commerce: 5 });
    const startingGold = state.factions['f1'].gold;

    executeTurn(state);
    // 收入：20000/1000 * 5 * 0.3 = 30
    expect(state.factions['f1'].gold).toBe(startingGold + 30);
  });

  it('should increase population in cities', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000, isHuman: true });
    addCity(state, { id: 'c1', name: '大城', x: 0, y: 0, owner: 'f1', population: 20000, agriculture: 5, stability: 100 });
    const beforePop = state.cities['c1'].population;

    executeTurn(state);
    expect(state.cities['c1'].population).toBeGreaterThan(beforePop);
  });

  it('should process all factions, not just the player', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '玩家', color: 0xff0000, isHuman: true });
    addFaction(state, { id: 'f2', name: 'AI', color: 0x0000ff, isHuman: true });
    addCity(state, { id: 'c1', name: '城1', x: 0, y: 0, owner: 'f1', population: 10000, commerce: 3 });
    addCity(state, { id: 'c2', name: '城2', x: 1, y: 1, owner: 'f2', population: 10000, commerce: 3 });

    const f1Start = state.factions['f1'].gold;
    const f2Start = state.factions['f2'].gold;

    executeTurn(state);
    expect(state.factions['f1'].gold).toBeGreaterThanOrEqual(f1Start);
    expect(state.factions['f2'].gold).toBeGreaterThanOrEqual(f2Start);
  });

  it('should reset phase to economy after turn', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000, isHuman: true });
    state.phase = 'military';

    executeTurn(state);
    expect(state.phase).toBe('economy');
  });

  it('should clear turn log', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000, isHuman: true });
    state.turnLog.push('某事件');

    executeTurn(state);
    expect(state.turnLog).toEqual([]);
  });
});
