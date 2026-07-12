import { describe, expect, it } from 'vitest';
import { getCityPanelTheme } from '../../src/scenes/city-panel.js';

describe('getCityPanelTheme', () => {
  it('uses the approved state-office ledger palette', () => {
    expect(getCityPanelTheme()).toEqual({
      ink: '#2B241B',
      paper: '#E9DEC6',
      vermilion: '#9E3025',
      bronze: '#7A5A33',
    });
  });
});
