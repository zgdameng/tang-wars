import { describe, expect, it } from 'vitest';
import { getBattlePalette, getFormationOffsets, getRidgeTrianglePoints } from '../../src/rendering/battle-visuals.js';

describe('getBattlePalette', () => {
  it('uses a heavy palette for a hill battlefield', () => {
    expect(getBattlePalette('hills')).toEqual({
      sky: 0x4A5145,
      ground: 0x5A513A,
      ridge: 0x342F25,
      dust: 0xB8A77D,
    });
  });
});

describe('getFormationOffsets', () => {
  it('places a five-soldier formation around its banner', () => {
    expect(getFormationOffsets()).toEqual([
      { x: -18, y: 8 }, { x: -9, y: 2 }, { x: 0, y: 8 },
      { x: 9, y: 2 }, { x: 18, y: 8 },
    ]);
  });
});

describe('getRidgeTrianglePoints', () => {
  it('mirrors the right ridge with coordinates instead of a display flip', () => {
    expect(getRidgeTrianglePoints('right')).toEqual([
      { x: 430, y: 180 },
      { x: 220, y: 0 },
      { x: 0, y: 180 },
    ]);
  });
});
