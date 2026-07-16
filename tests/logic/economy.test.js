import { describe, it, expect } from 'vitest';
import { createGameState, addCity, addFaction } from '../../src/logic/game-state.js';
import { calculateTurnIncome, calculatePopulationGrowth, upgradeCityDevelopment } from '../../src/logic/economy.js';

describe('calculateTurnIncome', () => {
  it('should sum income from all faction cities', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000 });
    addCity(state, { id: 'c1', name: '大城', x: 0, y: 0, owner: 'f1', population: 20000, commerce: 5 });
    addCity(state, { id: 'c2', name: '小城', x: 1, y: 1, owner: 'f1', population: 10000, commerce: 3 });

    const result = calculateTurnIncome(state, 'f1');
    // 大城: 20000/1000 * 5 * 0.3 = 30
    // 小城: 10000/1000 * 3 * 0.3 = 9
    // 合计: 39
    expect(result.gold).toBe(39);
  });

  it('should return zero gold for faction with no cities', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000 });

    const result = calculateTurnIncome(state, 'f1');
    expect(result.gold).toBe(0);
  });
});

describe('calculatePopulationGrowth', () => {
  it('should grow based on agriculture', () => {
    const city = { population: 10000, agriculture: 5, stability: 70 };
    const growth = calculatePopulationGrowth(city);
    // 基础: 10000 * 0.01 = 100, 农业奖励: 5 * 50 = 250
    // 民心修正: 70/100 = 0.7
    // (100 + 250) * 0.7 = 245
    expect(growth).toBe(245);
  });

  it('should grow slowly when stability is low', () => {
    const unhappyCity = { population: 10000, agriculture: 5, stability: 10 };
    const happyCity = { population: 10000, agriculture: 5, stability: 100 };
    expect(calculatePopulationGrowth(unhappyCity))
      .toBeLessThan(calculatePopulationGrowth(happyCity));
  });

  it('should return 0 when stability is 0', () => {
    const city = { population: 10000, agriculture: 5, stability: 0 };
    expect(calculatePopulationGrowth(city)).toBe(0);
  });
});

describe('upgradeCityDevelopment', () => {
  it('spends faction gold and raises the selected city development', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000, gold: 1000 });
    addCity(state, { id: 'c1', name: '大城', x: 0, y: 0, owner: 'f1', agriculture: 3 });

    expect(upgradeCityDevelopment(state, 'c1', 'agriculture')).toEqual({ cost: 400, level: 4 });
    expect(state.factions.f1.gold).toBe(600);
  });
});
