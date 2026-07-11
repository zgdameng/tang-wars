import { describe, expect, it } from 'vitest';
import { getTerrainPalette } from '../../src/rendering/map-bitmap.js';

describe('getTerrainPalette', () => {
  it('uses the approved heavy palette for plains, loess and mountains', () => {
    expect(getTerrainPalette(15)).toEqual([93, 118, 59]);
    expect(getTerrainPalette(70)).toEqual([137, 111, 64]);
    expect(getTerrainPalette(170)).toEqual([151, 142, 120]);
  });
});
