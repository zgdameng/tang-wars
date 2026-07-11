import { describe, expect, it } from 'vitest';
import { getCityMarkerMetrics } from '../../src/rendering/city-marker.js';

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
