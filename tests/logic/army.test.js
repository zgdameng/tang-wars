import { describe, it, expect } from 'vitest';
import { createArmy, getArmyStrength, getArmySpeed, UNIT_TYPES } from '../../src/logic/army.js';

describe('UNIT_TYPES', () => {
  it('should have three unit types', () => {
    expect(Object.keys(UNIT_TYPES)).toHaveLength(3);
    expect(UNIT_TYPES.infantry).toBeDefined();
    expect(UNIT_TYPES.cavalry).toBeDefined();
    expect(UNIT_TYPES.archer).toBeDefined();
  });

  it('should form a circular counter system (rock-paper-scissors)', () => {
    // 步兵克骑兵，骑兵克弓兵，弓兵克步兵
    expect(UNIT_TYPES.infantry.counters).toBe('cavalry');
    expect(UNIT_TYPES.cavalry.counters).toBe('archer');
    expect(UNIT_TYPES.archer.counters).toBe('infantry');
  });
});

describe('createArmy', () => {
  it('should create an army with required properties', () => {
    const army = createArmy({
      id: 'army-1',
      factionId: 'li-keyong',
      position: { x: 12, y: 4 }
    });

    expect(army.id).toBe('army-1');
    expect(army.factionId).toBe('li-keyong');
    expect(army.units).toEqual([]);
    expect(army.state).toBe('idle');
    expect(army.position).toEqual({ x: 12, y: 4 });
    expect(army.inCity).toBeNull();
  });

  it('should accept optional general and city', () => {
    const army = createArmy({
      id: 'army-2',
      factionId: 'zhu-wen',
      generalId: 'zhu-wen-gen',
      inCity: 'bianzhou'
    });

    expect(army.generalId).toBe('zhu-wen-gen');
    expect(army.inCity).toBe('bianzhou');
  });
});

describe('getArmyStrength', () => {
  it('should calculate total strength from units', () => {
    const army = createArmy({ id: 'a1', factionId: 'f1' });
    army.units = [
      { type: 'infantry', count: 1000, morale: 80, exp: 0 },
      { type: 'cavalry', count: 500, morale: 90, exp: 0 }
    ];
    // 步兵: (10+12) * 1000 * 0.8 = 17600
    // 骑兵: (15+8) * 500 * 0.9 = 10350
    // 合计: 27950
    const strength = getArmyStrength(army);
    expect(strength).toBe(27950);
  });

  it('should return 0 for empty army', () => {
    const army = createArmy({ id: 'a1', factionId: 'f1' });
    expect(getArmyStrength(army)).toBe(0);
  });
});

describe('getArmySpeed', () => {
  it('should return speed of slowest unit', () => {
    const army = createArmy({ id: 'a1', factionId: 'f1' });
    army.units = [
      { type: 'infantry', count: 1000, morale: 80, exp: 0 },  // speed 3
      { type: 'cavalry', count: 500, morale: 80, exp: 0 }      // speed 6
    ];
    expect(getArmySpeed(army)).toBe(3);
  });

  it('should return default speed 3 for empty army', () => {
    const army = createArmy({ id: 'a1', factionId: 'f1' });
    expect(getArmySpeed(army)).toBe(3);
  });
});
