import { describe, expect, it } from 'vitest';
import {
  getCityMarkerMetrics,
  getCityTowerMetrics,
  setCityMarkersVisible,
} from '../../src/rendering/city-marker.js';
import { setArmyMarkersVisible } from '../../src/rendering/army-marker.js';
import { setTurnPanelVisible } from '../../src/ui/turn-panel.js';

describe('marker visibility controls', () => {
  it('exports controls for city markers, army markers, and the turn panel', () => {
    expect(setCityMarkersVisible).toBeTypeOf('function');
    expect(setArmyMarkersVisible).toBeTypeOf('function');
    expect(setTurnPanelVisible).toBeTypeOf('function');
  });
});

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
