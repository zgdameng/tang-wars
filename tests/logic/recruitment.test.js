import { describe, it, expect } from 'vitest';
import { createGameState, addCity, addFaction } from '../../src/logic/game-state.js';
import { recruitUnit } from '../../src/logic/recruitment.js';

function makeState() {
  const state = createGameState();
  addFaction(state, { id: 'f1', name: '测试', color: 0xff0000, gold: 5000 });
  addCity(state, {
    id: 'c1', name: '大城', x: 0, y: 0, owner: 'f1',
    population: 50000, commerce: 5
  });
  return state;
}

describe('recruitUnit', () => {
  it('should create an army with a recruited unit', () => {
    const state = makeState();
    const army = recruitUnit(state, 'c1', 'infantry', 20);

    expect(army).not.toBeNull();
    expect(army.factionId).toBe('f1');
    expect(army.units).toHaveLength(1);
    expect(army.units[0].type).toBe('infantry');
    expect(army.units[0].count).toBe(20);
    expect(army.inCity).toBe('c1');
  });

  it('should deduct gold for recruitment', () => {
    const state = makeState();
    const beforeGold = state.factions['f1'].gold;
    // 步兵 cost = 100 per unit, 1000 * 100 = 100000? Wait, let me check
    // Actually cost is per unit: UNIT_TYPES.infantry.cost = 100
    // totalCost = 100 * 1000 = 100000
    // That's too expensive. Let me check the plan...
    // In the plan: cost: 100 for infantry, but count=1000 means 100 * 1000 = 100000
    // Gold default is 5000, so this would fail with null

    // Hmm, let me check the gold. Default faction gold is 5000.
    // If cost per soldier is 100, then recruiting 10 soldiers costs 1000.
    // Let me recruit a small number first.
    const army = recruitUnit(state, 'c1', 'infantry', 10);

    expect(army).not.toBeNull();
    expect(state.factions['f1'].gold).toBe(beforeGold - 10 * 100); // 5000 - 1000 = 4000
  });

  it('should deduct population for recruitment', () => {
    const state = makeState();
    const beforePop = state.cities['c1'].population;

    recruitUnit(state, 'c1', 'infantry', 20);
    expect(state.cities['c1'].population).toBe(beforePop - 20);
  });

  it('should return null when faction cannot afford', () => {
    const state = makeState();
    state.factions['f1'].gold = 10;

    const army = recruitUnit(state, 'c1', 'cavalry', 100);
    expect(army).toBeNull();
  });

  it('should return null when city lacks population', () => {
    const state = makeState();
    state.cities['c1'].population = 100;

    const army = recruitUnit(state, 'c1', 'infantry', 500);
    expect(army).toBeNull();
  });

  it('should add army to state armies and city garrison', () => {
    const state = makeState();
    const army = recruitUnit(state, 'c1', 'infantry', 20);

    expect(state.armies[army.id]).toBeDefined();
    expect(state.cities['c1'].garrison).toContain(army.id);
  });
});
