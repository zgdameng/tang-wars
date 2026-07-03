import { describe, it, expect } from 'vitest';
import { createCity, getCityPopulation, setCityPopulation } from '../../src/logic/city.js';

describe('createCity', () => {
  it('should create a city with required properties', () => {
    const c = createCity({ id: 'taiyuan', name: '太原', x: 10, y: 5, owner: 'li-keyong' });
    expect(c.id).toBe('taiyuan');
    expect(c.name).toBe('太原');
    expect(c.owner).toBe('li-keyong');
    expect(c.population).toBeGreaterThan(0);
    expect(c.agriculture).toBeGreaterThanOrEqual(0);
    expect(c.commerce).toBeGreaterThanOrEqual(0);
    expect(c.defense).toBe(0);
    expect(c.garrison).toEqual([]);
    expect(c.governor).toBeNull();
  });

  it('should accept custom initial values', () => {
    const c = createCity({
      id: 'test', name: '测试', x: 0, y: 0,
      population: 50000, agriculture: 5, commerce: 8
    });
    expect(c.population).toBe(50000);
    expect(c.agriculture).toBe(5);
    expect(c.commerce).toBe(8);
  });
});

describe('setCityPopulation', () => {
  it('should not allow negative population', () => {
    const c = createCity({ id: 'test', name: '测试', x: 0, y: 0, population: 1000 });
    const result = setCityPopulation(c, -500);
    expect(result.population).toBe(0);
  });
});
