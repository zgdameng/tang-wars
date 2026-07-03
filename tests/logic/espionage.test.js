import { describe, it, expect } from 'vitest';
import { createGameState, addCity, addFaction, addGeneral } from '../../src/logic/game-state.js';
import { spyScout, spySabotage, spySowDiscord, spySpreadRumors } from '../../src/logic/espionage.js';

function makeState() {
  const state = createGameState();
  addFaction(state, { id: 'f1', name: '我方', color: 0xff0000, gold: 5000 });
  addFaction(state, { id: 'f2', name: '敌方', color: 0x0000ff, gold: 5000 });
  addCity(state, {
    id: 'c1', name: '敌城', x: 5, y: 5, owner: 'f2',
    population: 30000, agriculture: 5, commerce: 6, defense: 4, stability: 70
  });
  addGeneral(state, { id: 'g1', name: '守将', factionId: 'f2', inCity: 'c1', loyalty: 85, intelligence: 50 });
  return state;
}

describe('spyScout', () => {
  it('should reveal city info when successful', () => {
    const state = makeState();
    // 用我方第一个武将做间谍
    addGeneral(state, { id: 'spy', name: '探子', factionId: 'f1', intelligence: 80 });

    const result = spyScout(state, 'f1', 'spy', 'c1');
    expect(result.success).toBeDefined();
    expect(result.message).toBeDefined();
    // 高智力间谍成功率较高
    if (result.success) {
      expect(result.info).toBeDefined();
      expect(result.info.population).toBe(30000);
    }
  });

  it('should deduct gold for spy mission', () => {
    const state = makeState();
    addGeneral(state, { id: 'spy', name: '探子', factionId: 'f1', intelligence: 80 });
    const beforeGold = state.factions['f1'].gold;

    spyScout(state, 'f1', 'spy', 'c1');
    expect(state.factions['f1'].gold).toBeLessThan(beforeGold);
  });
});

describe('spySabotage', () => {
  it('should reduce city defense on success', () => {
    const state = makeState();
    addGeneral(state, { id: 'spy', name: '细作', factionId: 'f1', intelligence: 90 });

    const result = spySabotage(state, 'f1', 'spy', 'c1');

    if (result.success) {
      expect(state.cities['c1'].defense).toBeLessThan(4);
    }
    expect(result.message).toBeDefined();
  });
});

describe('spySowDiscord', () => {
  it('should attempt to reduce general loyalty', () => {
    const state = makeState();
    addGeneral(state, { id: 'spy', name: '说客', factionId: 'f1', intelligence: 85, charisma: 70 });

    const result = spySowDiscord(state, 'f1', 'spy', 'g1');

    if (result.success) {
      expect(state.generals['g1'].loyalty).toBeLessThan(85);
    }
  });
});

describe('spySpreadRumors', () => {
  it('should attempt to reduce city stability', () => {
    const state = makeState();
    addGeneral(state, { id: 'spy', name: '谣传者', factionId: 'f1', intelligence: 80 });

    const result = spySpreadRumors(state, 'f1', 'spy', 'c1');

    if (result.success) {
      expect(state.cities['c1'].stability).toBeLessThan(70);
    }
  });
});
