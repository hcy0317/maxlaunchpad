import { renderHook } from '@testing-library/react';

import type { AppSettings } from '../../../shared/types';
import { buildFontFamilyCssValue, useFontFamily } from '../useFontFamily';

let settings: Pick<AppSettings, 'fontFamily'> = { fontFamily: '' };

jest.mock('../../state/store', () => ({
  useAppState: () => ({ settings }),
}));

describe('useFontFamily', () => {
  beforeEach(() => {
    settings = { fontFamily: '' };
    document.documentElement.removeAttribute('style');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('escapes user-editable font settings as a single CSS family value', () => {
    expect(buildFontFamilyCssValue(' A "Font"\\Name\n ')).toBe(
      '"A \\"Font\\"\\\\Name", var(--system-font-family)',
    );
  });

  it('applies the selected family to base and existing modern styles', () => {
    settings = { fontFamily: '汉仪文黑-65W' };

    const { rerender } = renderHook(() => useFontFamily());

    expect(document.documentElement.style.getPropertyValue('--app-font-family')).toBe(
      '"汉仪文黑-65W", var(--system-font-family)',
    );
    expect(document.documentElement.style.getPropertyValue('--ml-font')).toBe(
      '"汉仪文黑-65W", var(--system-font-family)',
    );

    settings = { fontFamily: '' };
    rerender();

    expect(document.documentElement.style.getPropertyValue('--app-font-family')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--ml-font')).toBe('');
  });
});
