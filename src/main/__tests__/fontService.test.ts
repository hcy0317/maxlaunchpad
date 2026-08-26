import { normalizeSystemFontNames } from '../fontService';

describe('normalizeSystemFontNames', () => {
  it('trims, removes empty and duplicate font families, then sorts them', () => {
    expect(normalizeSystemFontNames([' Segoe UI ', '', 'Arial', 'Segoe UI', '  '])).toEqual([
      'Arial',
      'Segoe UI',
    ]);
  });
});
