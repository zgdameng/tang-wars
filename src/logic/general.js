/**
 * 武将对象。
 * 属性范围 1-100，总值决定武将品质。
 */

export function createGeneral(opts) {
  return {
    id: opts.id,
    name: opts.name,
    factionId: opts.factionId || null,
    leadership: opts.leadership || 50,   // 统率
    might: opts.might || 50,             // 武力
    intelligence: opts.intelligence || 50, // 智力
    politics: opts.politics || 50,       // 政治
    charisma: opts.charisma || 50,       // 魅力
    loyalty: opts.loyalty ?? 80,         // 忠诚度
    inCity: opts.inCity || null,         // 当前所在城池 ID
    leadingArmy: null,                   // 当前统领的部队 ID
    skill: opts.skill || null            // 技能 { name, cooldown, effect }
  };
}

export function getCommandLimit(general) {
  // 统率决定带兵上限：每点统率带 100 兵
  return general.leadership * 100;
}

export function changeLoyalty(general, amount) {
  general.loyalty = Math.max(0, Math.min(100, general.loyalty + amount));
  return general;
}

export function isRebellious(general) {
  return general.loyalty < 30;
}
