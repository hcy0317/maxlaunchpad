import { getFonts } from 'font-list';

let cachedFonts: Promise<string[]> | null = null;
const FONT_LIST_TIMEOUT_MS = 15_000;

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`System font enumeration timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function normalizeSystemFontNames(fonts: string[]): string[] {
  return [...new Set(fonts.map((font) => font.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function listSystemFonts(): Promise<string[]> {
  cachedFonts ??= withTimeout(getFonts({ disableQuoting: true }), FONT_LIST_TIMEOUT_MS)
    .then(normalizeSystemFontNames)
    .catch((error: unknown) => {
      cachedFonts = null;
      throw error;
    });
  return cachedFonts;
}
