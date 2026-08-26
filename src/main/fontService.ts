import { getFonts } from 'font-list';

let cachedFonts: Promise<string[]> | null = null;

export function normalizeSystemFontNames(fonts: string[]): string[] {
  return [...new Set(fonts.map((font) => font.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function listSystemFonts(): Promise<string[]> {
  cachedFonts ??= getFonts({ disableQuoting: true })
    .then(normalizeSystemFontNames)
    .catch((error: unknown) => {
      cachedFonts = null;
      throw error;
    });
  return cachedFonts;
}
