import { CONFIG } from '../config.js';

/**
 * 创建一个城池对象。
 * 用工厂函数而非 class——每一座城就是一个普通数据对象，方便存档和测试。
 *
 * @param {Object} opts
 * @param {string} opts.id       - 唯一标识，如 'taiyuan'
 * @param {string} opts.name     - 显示名，如 '太原'
 * @param {number} opts.x        - 地图坐标 X（等距网格列号）
 * @param {number} opts.y        - 地图坐标 Y（等距网格行号）
 * @param {string} [opts.owner]  - 所属势力 ID，null 表示无主
 * @param {number} [opts.population=10000]
 * @param {number} [opts.agriculture=3]
 * @param {number} [opts.commerce=3]
 * @param {number} [opts.defense=0]
 * @param {number} [opts.stability=70] - 民心 (0-100)
 */
export function createCity(opts = {}) {
  if (opts.id == null) throw new Error('createCity: missing required field "id"');
  if (opts.name == null) throw new Error('createCity: missing required field "name"');
  if (opts.x == null) throw new Error('createCity: missing required field "x"');
  if (opts.y == null) throw new Error('createCity: missing required field "y"');

  return {
    id: opts.id,
    name: opts.name,
    x: opts.x,
    y: opts.y,
    owner: opts.owner || null,
    population: opts.population ?? 10000,
    agriculture: opts.agriculture ?? 3,
    commerce: opts.commerce ?? 3,
    defense: opts.defense ?? 0,
    stability: opts.stability ?? 70,
    province: opts.province || '',
    desc: opts.desc || '',
    garrison: [],           // [armyId, ...]
    governor: null,         // generalId 或 null
    underSiege: false       // 是否被围攻
  };
}

export function getCityPopulation(city) {
  return city.population;
}

export function setCityPopulation(city, amount) {
  city.population = Math.max(0, amount);
  return city;
}

export function addCityPopulation(city, amount) {
  return setCityPopulation(city, city.population + amount);
}

export function getCityIncome(city) {
  return Math.floor(city.population / 1000 * city.commerce * CONFIG.BASE_TAX_RATE);
}

export function getCityMaxGarrison(city) {
  return Math.floor(city.population / 2000);
}

export function setCityOwner(city, factionId) {
  city.owner = factionId;
  city.stability = CONFIG.NEW_OWNER_STABILITY; // 易主后民心重置
  return city;
}

export function setCityGovernor(city, generalId) {
  city.governor = generalId;
  return city;
}
