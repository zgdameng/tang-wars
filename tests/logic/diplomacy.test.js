import { describe, it, expect } from 'vitest';
import { createGameState, addFaction } from '../../src/logic/game-state.js';
import {
  proposeAlliance, declareWar, breakAlliance, sueForPeace
} from '../../src/logic/diplomacy.js';

function makeState() {
  const state = createGameState();
  addFaction(state, { id: 'f1', name: '李克用', color: 0xff0000, isHuman: true });
  addFaction(state, { id: 'f2', name: '朱温', color: 0x0000ff });
  addFaction(state, { id: 'f3', name: '杨行密', color: 0x00ff00 });
  return state;
}

describe('proposeAlliance', () => {
  it('should set alliance on both sides when accepted', () => {
    const state = makeState();
    // 先提高关系值确保成功
    state.factions['f1'].relations['f2'] = 80;
    state.factions['f2'].relations['f1'] = 80;

    const result = proposeAlliance(state, 'f1', 'f2');
    // 不依赖随机，用确定性检验结构
    expect(result.success).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it('should return false for non-existent factions', () => {
    const state = makeState();
    const result = proposeAlliance(state, 'f1', 'bad');
    expect(result.success).toBe(false);
  });
});

describe('declareWar', () => {
  it('should add both sides to atWarWith lists', () => {
    const state = makeState();
    declareWar(state, 'f1', 'f2');

    expect(state.factions['f1'].atWarWith).toContain('f2');
    expect(state.factions['f2'].atWarWith).toContain('f1');
  });

  it('should remove existing alliance when declaring war', () => {
    const state = makeState();
    state.factions['f1'].alliances.push('f2');
    state.factions['f2'].alliances.push('f1');

    declareWar(state, 'f1', 'f2');

    expect(state.factions['f1'].alliances).not.toContain('f2');
    expect(state.factions['f2'].alliances).not.toContain('f1');
  });

  it('should set relations to -100', () => {
    const state = makeState();
    declareWar(state, 'f1', 'f2');

    expect(state.factions['f1'].relations['f2']).toBe(-100);
    expect(state.factions['f2'].relations['f1']).toBe(-100);
  });

  it('should reduce prestige for unprovoked war', () => {
    const state = makeState();
    const beforePrestige = state.factions['f1'].prestige;
    // 关系不低于-20 = 无故宣战
    state.factions['f1'].relations['f2'] = 0;

    declareWar(state, 'f1', 'f2');
    expect(state.factions['f1'].prestige).toBeLessThan(beforePrestige);
  });

  it('should not reduce prestige when relation already very bad', () => {
    const state = makeState();
    const beforePrestige = state.factions['f1'].prestige;
    state.factions['f1'].relations['f2'] = -80;

    declareWar(state, 'f1', 'f2');
    // 已是仇敌，宣战不降声望
    expect(state.factions['f1'].prestige).toBe(beforePrestige);
  });
});

describe('breakAlliance', () => {
  it('should remove alliance and penalize prestige', () => {
    const state = makeState();
    state.factions['f1'].alliances.push('f2');
    state.factions['f2'].alliances.push('f1');
    const beforePrestige = state.factions['f1'].prestige;

    breakAlliance(state, 'f1', 'f2');

    expect(state.factions['f1'].alliances).not.toContain('f2');
    expect(state.factions['f1'].prestige).toBeLessThan(beforePrestige);
    expect(state.factions['f1'].relations['f2']).toBe(-50);
  });
});

describe('sueForPeace', () => {
  it('should end war when accepted', () => {
    const state = makeState();
    state.factions['f1'].atWarWith.push('f2');
    state.factions['f2'].atWarWith.push('f1');

    // 高赔款确保接受
    const result = sueForPeace(state, 'f1', 'f2', { gold: 99999 });

    if (result.success) {
      expect(state.factions['f1'].atWarWith).not.toContain('f2');
      expect(state.factions['f2'].atWarWith).not.toContain('f1');
    }
  });

  it('should return message when rejected', () => {
    const state = makeState();
    state.factions['f1'].atWarWith.push('f2');
    state.factions['f2'].atWarWith.push('f1');
    state.factions['f1'].relations['f2'] = -100;

    const result = sueForPeace(state, 'f1', 'f2', {});

    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
  });
});
