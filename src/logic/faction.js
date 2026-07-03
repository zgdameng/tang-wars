import { CONFIG } from '../config.js';

export function createFaction(opts) {
  return {
    id: opts.id,
    name: opts.name,
    color: opts.color,
    gold: opts.gold ?? 5000,
    prestige: opts.prestige ?? 500,
    generals: opts.generals || [],    // [generalId, ...]
    cities: opts.cities || [],        // [cityId, ...]
    alliances: [],                    // [factionId, ...]
    atWarWith: [],                    // [factionId, ...]
    relations: {},                    // { factionId: number (-100..100) }
    isHuman: opts.isHuman ?? false,
    aiDifficulty: opts.aiDifficulty ?? 3
  };
}

export function addGold(faction, amount) {
  faction.gold += amount;
  return faction;
}

export function spendGold(faction, amount) {
  if (faction.gold < amount) return null;
  faction.gold -= amount;
  return faction;
}

export function setRelation(faction, otherId, value) {
  faction.relations[otherId] = Math.max(
    CONFIG.RELATION_MIN,
    Math.min(CONFIG.RELATION_MAX, value)
  );
  return faction;
}

export function getRelation(faction, otherId) {
  return faction.relations[otherId] || 0;
}

export function addPrestige(faction, amount) {
  faction.prestige = Math.min(CONFIG.PRESTIGE_MAX, faction.prestige + amount);
  return faction;
}
