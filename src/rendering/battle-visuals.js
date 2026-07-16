export function getBattlePalette(terrain) {
  if (terrain === 'hills') {
    return {
      sky: 0x4A5145,
      ground: 0x5A513A,
      ridge: 0x342F25,
      dust: 0xB8A77D,
    };
  }

  if (terrain === 'river') {
    return {
      sky: 0x4E5B60,
      ground: 0x465B4D,
      ridge: 0x263C40,
      dust: 0x9EA88E,
    };
  }

  return {
    sky: 0x6B725C,
    ground: 0x778047,
    ridge: 0x3C482F,
    dust: 0xB9A574,
  };
}

export function getFormationOffsets() {
  return [
    { x: -18, y: 8 }, { x: -9, y: 2 }, { x: 0, y: 8 },
    { x: 9, y: 2 }, { x: 18, y: 8 },
  ];
}

export function getRidgeTrianglePoints(side) {
  if (side === 'right') {
    return [
      { x: 430, y: 180 },
      { x: 220, y: 0 },
      { x: 0, y: 180 },
    ];
  }

  return [
    { x: 0, y: 180 },
    { x: 210, y: 0 },
    { x: 430, y: 180 },
  ];
}

export function getBattleFormationOffsets(side) {
  const direction = side === 'attacker' ? 1 : -1;
  return [
    -82, -64, -46, 46, 64,
    -76, -58, -40, 40, 58,
    -70, -52, -34, 34, 52,
  ].map((x, index) => ({
    x: x * direction,
    y: 32 + Math.floor(index / 5) * 15,
  }));
}

export function getBattleDustOffsets() {
  return [
    { x: -66, y: 58, alpha: 0.18 },
    { x: -38, y: 64, alpha: 0.14 },
    { x: -8, y: 60, alpha: 0.20 },
    { x: 20, y: 66, alpha: 0.12 },
    { x: 48, y: 59, alpha: 0.18 },
    { x: 72, y: 65, alpha: 0.10 },
  ];
}
