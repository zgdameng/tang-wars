import { describe, expect, it } from 'vitest';
import { getCityMarkerMetrics, getCityTowerMetrics } from '../../src/rendering/city-marker.js';

describe('getCityMarkerMetrics', () => {
  it('keeps the enlarged city, tap area and label aligned', () => {
    expect(getCityMarkerMetrics()).toEqual({
      scale: 1.65,
      hitWidth: 108,
      hitHeight: 82,
      labelOffsetY: -78,
    });
  });
});

describe('getCityTowerMetrics', () => {
  it('keeps defensive towers large enough to read on the world map', () => {
    expect(getCityTowerMetrics()).toEqual({
      width: 14,
      height: 22,
      battlementHeight: 5,
    });
  });
});
