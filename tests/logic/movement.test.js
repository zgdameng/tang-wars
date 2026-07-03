import { describe, it, expect } from 'vitest';
import { createGameState, addCity, addFaction } from '../../src/logic/game-state.js';
import { createArmy } from '../../src/logic/army.js';
import { moveArmy, advanceAllMovements, checkCombatEncounters } from '../../src/logic/movement.js';

function makeStateWithArmy() {
  const state = createGameState();
  addFaction(state, { id: 'f1', name: '测试', color: 0xff0000 });
  addCity(state, { id: 'c1', name: '太原', x: 12, y: 4, owner: 'f1', population: 60000 });
  const army = createArmy({
    id: 'army-1', factionId: 'f1',
    position: { x: 12, y: 4 }, inCity: 'c1'
  });
  army.units = [{ type: 'infantry', count: 100, morale: 80, exp: 0 }];
  state.armies[army.id] = army;
  state.cities['c1'].garrison.push(army.id);
  return { state, army };
}

describe('moveArmy', () => {
  it('should set army to moving state and calculate turns', () => {
    const { state, army } = makeStateWithArmy();

    const result = moveArmy(state, 'army-1', 15, 4);

    expect(result).not.toBeNull();
    expect(result.turns).toBeGreaterThan(0);
    expect(army.state).toBe('moving');
    expect(army.moveTarget).toEqual({ x: 15, y: 4 });
  });

  it('should remove army from city garrison when leaving', () => {
    const { state } = makeStateWithArmy();

    moveArmy(state, 'army-1', 15, 4);

    expect(state.cities['c1'].garrison).not.toContain('army-1');
    expect(state.armies['army-1'].inCity).toBeNull();
  });

  it('should return null for non-existent army', () => {
    const { state } = makeStateWithArmy();
    expect(moveArmy(state, 'bad-id', 5, 5)).toBeNull();
  });

  it('should return null if army is already moving', () => {
    const { state } = makeStateWithArmy();
    moveArmy(state, 'army-1', 15, 4);
    const second = moveArmy(state, 'army-1', 20, 10);
    expect(second).toBeNull();
  });
});

describe('advanceAllMovements', () => {
  it('should decrease remaining turns each call', () => {
    const { state } = makeStateWithArmy();
    const result = moveArmy(state, 'army-1', 15, 4);
    const beforeTurns = result.turns;
    const beforeRemaining = state.armies['army-1'].moveTurnsRemaining;

    advanceAllMovements(state);
    expect(state.armies['army-1'].moveTurnsRemaining).toBe(beforeRemaining - 1);
  });

  it('should arrive at target when turns reach 0', () => {
    const { state } = makeStateWithArmy();
    moveArmy(state, 'army-1', 15, 4);

    // 一直推进直到到达
    let arrived = false;
    for (let i = 0; i < 20; i++) {
      advanceAllMovements(state);
      if (state.armies['army-1'].state === 'idle') {
        arrived = true;
        break;
      }
    }

    expect(arrived).toBe(true);
    expect(state.armies['army-1'].position).toEqual({ x: 15, y: 4 });
    expect(state.armies['army-1'].moveTarget).toBeNull();
  });
});

describe('checkCombatEncounters', () => {
  it('should detect field battle when two hostile armies meet', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '我方', color: 0xff0000 });
    addFaction(state, { id: 'f2', name: '敌方', color: 0x0000ff });

    const a1 = createArmy({ id: 'a1', factionId: 'f1', position: { x: 5, y: 5 } });
    const a2 = createArmy({ id: 'a2', factionId: 'f2', position: { x: 5, y: 5 } });
    state.armies['a1'] = a1;
    state.armies['a2'] = a2;

    const encounters = checkCombatEncounters(state);
    expect(encounters).not.toBeNull();
    expect(encounters).toHaveLength(1);
    expect(encounters[0].type).toBe('field');
  });

  it('should return null when no armies are adjacent', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '我方', color: 0xff0000 });
    addFaction(state, { id: 'f2', name: '敌方', color: 0x0000ff });

    const a1 = createArmy({ id: 'a1', factionId: 'f1', position: { x: 5, y: 5 } });
    const a2 = createArmy({ id: 'a2', factionId: 'f2', position: { x: 20, y: 20 } });
    state.armies['a1'] = a1;
    state.armies['a2'] = a2;

    expect(checkCombatEncounters(state)).toBeNull();
  });

  it('should not trigger battle between same-faction armies', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '我方', color: 0xff0000 });

    const a1 = createArmy({ id: 'a1', factionId: 'f1', position: { x: 5, y: 5 } });
    const a2 = createArmy({ id: 'a2', factionId: 'f1', position: { x: 5, y: 5 } });
    state.armies['a1'] = a1;
    state.armies['a2'] = a2;

    expect(checkCombatEncounters(state)).toBeNull();
  });

  it('should detect siege when army enters enemy city', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '我方', color: 0xff0000 });
    addFaction(state, { id: 'f2', name: '敌方', color: 0x0000ff });
    addCity(state, { id: 'c1', name: '敌城', x: 5, y: 5, owner: 'f2', population: 20000 });

    const a1 = createArmy({ id: 'a1', factionId: 'f1', position: { x: 5, y: 5 } });
    state.armies['a1'] = a1;

    const encounters = checkCombatEncounters(state);
    expect(encounters).not.toBeNull();
    const siege = encounters.find(e => e.type === 'siege');
    expect(siege).toBeDefined();
    expect(siege.defender.id).toBe('c1');
  });
});
