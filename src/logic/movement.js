import { getArmySpeed } from './army.js';

/**
 * 派一支部队行军到目标坐标。
 *
 * 生活类比：好比下棋时把棋子从一格挪到另一格——距离越远、兵越慢，花的回合越多。
 *
 * @param {object} state - GameState
 * @param {string} armyId
 * @param {number} targetX
 * @param {number} targetY
 * @returns {{ turns: number, path: Array } | null}
 */
export function moveArmy(state, armyId, targetX, targetY) {
  const army = state.armies[armyId];
  if (!army || army.state !== 'idle') return null;

  const speed = getArmySpeed(army);
  const dx = targetX - army.position.x;
  const dy = targetY - army.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const turns = Math.max(1, Math.ceil(dist / speed));

  army.state = 'moving';
  army.moveTarget = { x: targetX, y: targetY };
  army.movePath = [{ x: targetX, y: targetY }];
  army.moveTurnsRemaining = turns;

  // 出城：从驻军列表中移除
  if (army.inCity) {
    const city = state.cities[army.inCity];
    if (city) {
      city.garrison = city.garrison.filter(id => id !== armyId);
    }
    army.inCity = null;
  }

  return { turns, path: army.movePath };
}

/**
 * 每回合结束时调用：所有行军中的部队前进一回合。
 * 到地方了就恢复 idle 状态，坐标更新为目标位置。
 */
export function advanceAllMovements(state) {
  for (const army of Object.values(state.armies)) {
    if (army.state !== 'moving') continue;

    army.moveTurnsRemaining--;

    if (army.moveTurnsRemaining <= 0) {
      army.position = { ...army.moveTarget };
      army.state = 'idle';
      army.moveTarget = null;
      army.movePath = null;
      army.moveTurnsRemaining = 0;
    }
  }
}

/**
 * 检查是否有两军相遇或攻城的情况。
 * 在每回合行军推进后调用。
 *
 * @returns {Array|null} encounters 或 null（无遭遇战）
 */
export function checkCombatEncounters(state) {
  const encounters = [];
  const armies = Object.values(state.armies).filter(
    a => a.state === 'idle' && a.position
  );

  // 野战：两支部队在同一格且不同势力
  for (let i = 0; i < armies.length; i++) {
    for (let j = i + 1; j < armies.length; j++) {
      const a = armies[i];
      const b = armies[j];
      if (a.factionId === b.factionId) continue;

      if (a.position.x === b.position.x && a.position.y === b.position.y) {
        encounters.push({ type: 'field', attacker: a, defender: b });
      }
    }
  }

  // 攻城：部队在敌城坐标上
  for (const army of armies) {
    for (const city of Object.values(state.cities)) {
      if (!city.owner) continue;
      if (city.owner === army.factionId) continue;

      if (army.position.x === city.x && army.position.y === city.y) {
        encounters.push({ type: 'siege', attacker: army, defender: city });
      }
    }
  }

  return encounters.length > 0 ? encounters : null;
}
