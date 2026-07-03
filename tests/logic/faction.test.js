import { describe, it, expect } from 'vitest';
import { createFaction, addGold, spendGold } from '../../src/logic/faction.js';

describe('createFaction', () => {
  it('should create a faction with default values', () => {
    const f = createFaction({ id: 'li-keyong', name: '李克用', color: 0xff4444 });
    expect(f.id).toBe('li-keyong');
    expect(f.name).toBe('李克用');
    expect(f.gold).toBeGreaterThan(0);
    expect(f.prestige).toBe(500);
    expect(f.relations).toEqual({});
    expect(f.isHuman).toBe(false);
  });
});

describe('gold operations', () => {
  it('should spend gold successfully when enough gold', () => {
    const f = createFaction({ id: 'test', name: '测试', color: 0xffffff, gold: 1000 });
    const result = spendGold(f, 300);
    expect(result).not.toBeNull();
    expect(f.gold).toBe(700);
  });

  it('should return null when cannot afford', () => {
    const f = createFaction({ id: 'test', name: '测试', color: 0xffffff });
    f.gold = 10;
    const result = spendGold(f, 20);
    expect(result).toBeNull();
  });
});
