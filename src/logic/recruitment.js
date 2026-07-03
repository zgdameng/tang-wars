import { UNIT_TYPES, createArmy } from './army.js';
import { spendGold } from './faction.js';
import { addCityPopulation } from './city.js';

/**
 * 在一座城征兵。
 *
 * 扣钱 → 扣人口 → 创建/补充部队。
 * 如果城里已有空闲部队，新兵加入进去；否则新建一支部队。
 *
 * @param {object} state - GameState
 * @param {string} cityId - 征兵城池 ID
 * @param {string} unitType - 'infantry' | 'cavalry' | 'archer'
 * @param {number} count - 征兵人数
 * @returns {object|null} army 或 null（失败）
 */
export function recruitUnit(state, cityId, unitType, count) {
  const city = state.cities[cityId];
  if (!city) return null;

  const typeDef = UNIT_TYPES[unitType];
  if (!typeDef) return null;

  if (city.population < count) return null;

  const faction = state.factions[city.owner];
  if (!faction) return null;

  // 扣钱
  const totalCost = typeDef.cost * count;
  const spent = spendGold(faction, totalCost);
  if (!spent) return null;

  // 扣人口
  addCityPopulation(city, -count);

  // 找或建部队
  const army = findOrCreateArmyInCity(state, city);
  addUnitToArmy(army, unitType, count);

  return army;
}

/** 在城中找一支空闲部队，没有就新建 */
function findOrCreateArmyInCity(state, city) {
  for (const army of Object.values(state.armies)) {
    if (army.inCity === city.id && army.state === 'idle') {
      return army;
    }
  }

  const army = createArmy({
    id: `army-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    factionId: city.owner,
    inCity: city.id,
    position: { x: city.x, y: city.y }
  });
  state.armies[army.id] = army;
  city.garrison.push(army.id);
  return army;
}

/** 给部队加一个兵种编组，如果已有同类就合并 */
function addUnitToArmy(army, unitType, count) {
  const existing = army.units.find(u => u.type === unitType);
  if (existing) {
    existing.count += count;
  } else {
    army.units.push({ type: unitType, count, morale: 80, exp: 0 });
  }
}
