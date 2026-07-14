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
