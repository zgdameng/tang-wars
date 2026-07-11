import { describe, expect, it } from 'vitest';
import { getRiverLayers, getTerrainPalette } from '../../src/rendering/map-bitmap.js';

describe('getTerrainPalette', () => {
  it('uses the approved heavy palette for plains, loess and mountains', () => {
    expect(getTerrainPalette(15)).toEqual([93, 118, 59]);
    expect(getTerrainPalette(70)).toEqual([137, 111, 64]);
    expect(getTerrainPalette(170)).toEqual([151, 142, 120]);
  });
});

describe('getRiverLayers', () => {
  it('builds a dark bank, blue-grey water and narrow highlight', () => {
    const layers = getRiverLayers(18);

    expect(layers[0]).toEqual({ color: 'rgba(31, 45, 43, 0.48)', width: 34 });
    expect(layers[1]).toEqual({ color: '#3d7187', width: 18 });
    expect(layers[2].color).toBe('rgba(188, 213, 205, 0.34)');
    expect(layers[2].width).toBeCloseTo(3.24, 6);
  });
});
