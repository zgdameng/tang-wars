import { describe, it, expect } from 'vitest';
import { createBattleUnit, getDamage } from '../../src/logic/battle/battle-units.js';
import { createBattleState, checkBattleEnd } from '../../src/logic/battle/battle-state.js';

describe('createBattleUnit', () => {
  it('should convert army unit to battle unit', () => {
    const bu = createBattleUnit(
      { type: 'infantry', count: 100, morale: 80, exp: 0 },
      'attacker'
    );

    expect(bu.type).toBe('infantry');
    expect(bu.side).toBe('attacker');
    expect(bu.count).toBe(100);
    expect(bu.maxHp).toBe(1000);  // 100 × 10
    expect(bu.hp).toBe(1000);
    expect(bu.morale).toBe(80);
  });

  it('should apply general bonuses', () => {
    const bu = createBattleUnit(
      { type: 'cavalry', count: 50, morale: 90, exp: 0 },
      'attacker',
      { attack: 5, defense: 3 }
    );

    expect(bu.attack).toBe(20);  // 15 base + 5
    expect(bu.defense).toBe(11); // 8 base + 3
  });
});

describe('getDamage', () => {
  it('should calculate base damage', () => {
    const attacker = createBattleUnit(
      { type: 'infantry', count: 100, morale: 80, exp: 0 },
      'attacker'
    );
    const defender = createBattleUnit(
      { type: 'infantry', count: 100, morale: 80, exp: 0 },
      'defender'
    );

    const dmg = getDamage(attacker, defender);
    // (10+2) * 1 - (12+2) * 1 * 0.5 = 12 - 7 = 5
    expect(dmg).toBeGreaterThan(0);
  });

  it('should apply 30% bonus for counter relationship', () => {
    // 步兵克骑兵
    const infantry = createBattleUnit(
      { type: 'infantry', count: 100, morale: 80, exp: 0 },
      'attacker'
    );
    const cavalry = createBattleUnit(
      { type: 'cavalry', count: 100, morale: 80, exp: 0 },
      'defender'
    );

    const dmgVsCav = getDamage(infantry, cavalry);      // 步兵打骑兵 = 克制
    const dmgVsInf = getDamage(infantry, infantry);     // 步兵打步兵 = 无克制

    expect(dmgVsCav).toBeGreaterThan(dmgVsInf);
  });
});

describe('createBattleState', () => {
  it('should create a battle with attacker and defender', () => {
    const battle = createBattleState({
      terrain: 'plains',
      isSiege: false,
      attackerFactionId: 'f1',
      defenderFactionId: 'f2',
      attackerUnits: [
        { type: 'infantry', count: 100, morale: 80, exp: 0 }
      ],
      defenderUnits: [
        { type: 'cavalry', count: 80, morale: 85, exp: 0 }
      ]
    });

    expect(battle.terrain).toBe('plains');
    expect(battle.attacker.factionId).toBe('f1');
    expect(battle.defender.factionId).toBe('f2');
    expect(battle.attacker.units).toHaveLength(1);
    expect(battle.defender.units).toHaveLength(1);
    expect(battle.winner).toBeNull();
    expect(battle.time).toBe(0);
  });

  it('should give siege defender bonus', () => {
    const siege = createBattleState({
      terrain: 'plains', isSiege: true,
      attackerFactionId: 'f1', defenderFactionId: 'f2',
      attackerUnits: [{ type: 'infantry', count: 100, morale: 80, exp: 0 }],
      defenderUnits: [{ type: 'infantry', count: 50, morale: 80, exp: 0 }]
    });

    expect(siege.defender.siegeBonus).toBe(5);
  });
});

describe('checkBattleEnd', () => {
  it('should return null when both sides have units', () => {
    const battle = createBattleState({
      terrain: 'plains', isSiege: false,
      attackerFactionId: 'f1', defenderFactionId: 'f2',
      attackerUnits: [{ type: 'infantry', count: 100, morale: 80, exp: 0 }],
      defenderUnits: [{ type: 'infantry', count: 50, morale: 80, exp: 0 }]
    });

    expect(checkBattleEnd(battle)).toBeNull();
  });

  it('should return defender if all attackers dead', () => {
    const battle = createBattleState({
      terrain: 'plains', isSiege: false,
      attackerFactionId: 'f1', defenderFactionId: 'f2',
      attackerUnits: [{ type: 'infantry', count: 10, morale: 80, exp: 0 }],
      defenderUnits: [{ type: 'infantry', count: 50, morale: 80, exp: 0 }]
    });
    battle.attacker.units[0].count = 0;

    expect(checkBattleEnd(battle)).toBe('defender');
  });

  it('should return defender on timeout', () => {
    const battle = createBattleState({
      terrain: 'plains', isSiege: false,
      attackerFactionId: 'f1', defenderFactionId: 'f2',
      attackerUnits: [{ type: 'infantry', count: 10, morale: 80, exp: 0 }],
      defenderUnits: [{ type: 'infantry', count: 50, morale: 80, exp: 0 }]
    });
    battle.time = 999;

    expect(checkBattleEnd(battle)).toBe('defender');
  });

  it('should return attacker if defender routed (morale 0)', () => {
    const battle = createBattleState({
      terrain: 'plains', isSiege: false,
      attackerFactionId: 'f1', defenderFactionId: 'f2',
      attackerUnits: [{ type: 'infantry', count: 10, morale: 80, exp: 0 }],
      defenderUnits: [{ type: 'infantry', count: 50, morale: 0, exp: 0 }]
    });

    expect(checkBattleEnd(battle)).toBe('attacker');
  });
});
