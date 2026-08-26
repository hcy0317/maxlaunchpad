import { useEffect } from 'react';

import { useAppState } from '../state/store';

export function buildFontFamilyCssValue(fontFamily: string | null | undefined): string | null {
  const normalized = fontFamily?.trim();
  if (!normalized) return null;

  const escaped = normalized
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n\f]+/g, ' ');
  return `"${escaped}", var(--system-font-family)`;
}

export function useFontFamily(): void {
  const fontFamily = useAppState().settings?.fontFamily;

  useEffect(() => {
    const root = document.documentElement;
    const cssValue = buildFontFamilyCssValue(fontFamily);

    if (cssValue) {
      root.style.setProperty('--app-font-family', cssValue);
      // Existing user copies of modern.css use this variable directly.
      root.style.setProperty('--ml-font', cssValue);
    } else {
      root.style.removeProperty('--app-font-family');
      root.style.removeProperty('--ml-font');
    }

    return () => {
      root.style.removeProperty('--app-font-family');
      root.style.removeProperty('--ml-font');
    };
  }, [fontFamily]);
}
