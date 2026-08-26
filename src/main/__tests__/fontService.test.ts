const getFontsMock = jest.fn();

jest.mock('font-list', () => ({ getFonts: getFontsMock }));

describe('fontService', () => {
  beforeEach(() => {
    jest.resetModules();
    getFontsMock.mockReset();
  });

  it('trims, removes empty and duplicate font families, then sorts them', async () => {
    const { normalizeSystemFontNames } = await import('../fontService');

    expect(normalizeSystemFontNames([' Segoe UI ', '', 'Arial', 'Segoe UI', '  '])).toEqual([
      'Arial',
      'Segoe UI',
    ]);
  });

  it('caches successful native font enumeration', async () => {
    getFontsMock.mockResolvedValue(['Segoe UI', 'Arial']);
    const { listSystemFonts } = await import('../fontService');

    const first = listSystemFonts();
    const second = listSystemFonts();

    expect(first).toBe(second);
    await expect(first).resolves.toEqual(['Arial', 'Segoe UI']);
    expect(getFontsMock).toHaveBeenCalledTimes(1);
  });

  it('times out a hung enumeration and allows a later retry', async () => {
    jest.useFakeTimers();
    try {
      getFontsMock
        .mockReturnValueOnce(new Promise(() => undefined))
        .mockResolvedValueOnce(['Arial']);
      const { listSystemFonts } = await import('../fontService');

      const timedOut = listSystemFonts();
      jest.advanceTimersByTime(15_000);
      await expect(timedOut).rejects.toThrow('timed out');
      await expect(listSystemFonts()).resolves.toEqual(['Arial']);
      expect(getFontsMock).toHaveBeenCalledTimes(2);
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });
});
