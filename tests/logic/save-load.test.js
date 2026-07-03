import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameState, addCity, addFaction } from '../../src/logic/game-state.js';
import { saveGame, loadGame, listSaves, deleteSave } from '../../src/logic/save-load.js';

// 模拟浏览器 localStorage（Vitest 跑在 Node 里，没有这个）
const store = {};
vi.stubGlobal('localStorage', {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = val; },
  removeItem: (key) => { delete store[key]; }
});

// 用测试专用 key 避免污染真实存档
const TEST_KEY = 'tang-wars-test-saves';

beforeEach(() => {
  // 每次测试前清空模拟存储
  Object.keys(store).forEach(k => delete store[k]);
});

describe('saveGame', () => {
  it('should save and return slot info', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '测试', color: 0xff0000 });
    addCity(state, { id: 'c1', name: '城', x: 0, y: 0, owner: 'f1', population: 10000 });

    const result = saveGame(state, 1, '测试存档', TEST_KEY);
    expect(result.success).toBe(true);
    expect(result.slot).toBe(1);
    expect(result.name).toBe('测试存档');
    expect(result.turn).toBe(1);
  });

  it('should save actual game data that can be loaded back', () => {
    const state = createGameState();
    addFaction(state, { id: 'f1', name: '势力', color: 0xff0000, gold: 8888 });
    addCity(state, { id: 'c1', name: '长安', x: 6, y: 10, owner: 'f1', population: 50000 });

    saveGame(state, 1, '存档', TEST_KEY);
    const loaded = loadGame(1, TEST_KEY);

    expect(loaded).not.toBeNull();
    expect(loaded.turn).toBe(1);
    expect(loaded.factions['f1'].name).toBe('势力');
    expect(loaded.factions['f1'].gold).toBe(8888);
    expect(loaded.cities['c1'].name).toBe('长安');
    expect(loaded.cities['c1'].population).toBe(50000);
  });
});

describe('listSaves', () => {
  it('should return array of save slots', () => {
    const state = createGameState();
    saveGame(state, 1, '存档一', TEST_KEY);
    saveGame(state, 3, '存档三', TEST_KEY);

    const list = listSaves(TEST_KEY);
    expect(list).toHaveLength(2);
    expect(list[0].slot).toBe(1);
    expect(list[0].name).toBe('存档一');
    expect(list[1].slot).toBe(3);
  });
});

describe('deleteSave', () => {
  it('should remove a save slot', () => {
    const state = createGameState();
    saveGame(state, 1, '删我', TEST_KEY);
    deleteSave(1, TEST_KEY);

    const loaded = loadGame(1, TEST_KEY);
    expect(loaded).toBeNull();
  });
});

describe('loadGame', () => {
  it('should return null for empty slot', () => {
    const result = loadGame(99, TEST_KEY);
    expect(result).toBeNull();
  });
});
