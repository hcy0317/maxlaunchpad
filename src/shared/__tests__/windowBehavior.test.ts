import {
  constrainWindowSizeToWorkArea,
  getCenteredWindowBounds,
  getCenteredWindowPosition,
  getContentScaleRatio,
  getContentZoomFactor,
  getLegacyDisplayAwareWindowSize,
  getLegacyDisplayScaleFactor,
  getWindowSizeFromRatio,
  getWindowSizeRatio,
  normalizeWindowSizeToWorkArea,
  shouldAllowWindowMovement,
  shouldAllowWindowResize,
  shouldPersistWindowSize,
} from '../windowBehavior';

describe('windowBehavior', () => {
  it('keeps lock-center authoritative over drag-drop mode for movement only', () => {
    const lockedDragDrop = { lockWindowCenter: true, isDragDropMode: true };

    expect(shouldAllowWindowMovement(lockedDragDrop)).toBe(false);
    expect(shouldAllowWindowResize(lockedDragDrop)).toBe(true);
    expect(shouldPersistWindowSize(lockedDragDrop)).toBe(true);
  });

  it('allows normal window movement when center lock is off', () => {
    const unlockedNormal = { lockWindowCenter: false, isDragDropMode: false };

    expect(shouldAllowWindowMovement(unlockedNormal)).toBe(true);
    expect(shouldAllowWindowResize(unlockedNormal)).toBe(true);
    expect(shouldPersistWindowSize(unlockedNormal)).toBe(true);
  });

  it('allows movement, resizing, and size persistence when center lock is off and drag-drop is on', () => {
    const unlockedDragDrop = { lockWindowCenter: false, isDragDropMode: true };

    expect(shouldAllowWindowMovement(unlockedDragDrop)).toBe(true);
    expect(shouldAllowWindowResize(unlockedDragDrop)).toBe(true);
    expect(shouldPersistWindowSize(unlockedDragDrop)).toBe(true);
  });

  it('clamps oversized saved windows inside the current work area with margins', () => {
    expect(
      constrainWindowSizeToWorkArea({ width: 4000, height: 2000 }, { width: 1280, height: 720 }),
    ).toEqual({ width: 1248, height: 688 });
  });

  it('allows compact hidden-row windows to shrink below the old launcher height', () => {
    expect(
      constrainWindowSizeToWorkArea({ width: 300, height: 80 }, { width: 1280, height: 720 }),
    ).toEqual({ width: 480, height: 120 });
  });

  it('converts a legacy display-work-area anchor for one-time migration', () => {
    const scaleBasis = { width: 3072, height: 1728 };
    const targetWorkArea = { width: 1920, height: 1080 };
    const basisSize = { width: 1378, height: 771 };

    expect(getLegacyDisplayScaleFactor(scaleBasis, targetWorkArea)).toBe(0.625);

    const displaySize = getLegacyDisplayAwareWindowSize(basisSize, scaleBasis, targetWorkArea);
    expect(displaySize).toEqual({ width: 861, height: 482 });
  });

  it('keeps window and content proportions stable across resolution and DPI combinations', () => {
    const ratio = getWindowSizeRatio({ width: 1247, height: 732 }, { width: 2458, height: 1383 });
    const contentScaleRatio = getContentScaleRatio(1, { width: 2458, height: 1383 });
    expect(ratio.width).toBeCloseTo(1247 / 2458, 10);
    expect(ratio.height).toBeCloseTo(732 / 1383, 10);

    for (const display of [
      {
        bounds: { width: 2458, height: 1383 },
        workArea: { width: 2400, height: 1300 },
        scaleFactor: 1.5625,
      },
      {
        bounds: { width: 3072, height: 1728 },
        workArea: { width: 3000, height: 1650 },
        scaleFactor: 1.25,
      },
      {
        bounds: { width: 1920, height: 1080 },
        workArea: { width: 1840, height: 1000 },
        scaleFactor: 1,
      },
      {
        bounds: { width: 3440, height: 1440 },
        workArea: { width: 3300, height: 1320 },
        scaleFactor: 1.25,
      },
      {
        bounds: { width: 1600, height: 1200 },
        workArea: { width: 1500, height: 1100 },
        scaleFactor: 1,
      },
    ]) {
      const size = getWindowSizeFromRatio(ratio, display.bounds, display.workArea);
      const zoomFactor = getContentZoomFactor(contentScaleRatio, display.bounds, size);
      const physicalDisplayWidth = display.bounds.width * display.scaleFactor;
      const physicalWindowWidth = size.width * display.scaleFactor;
      const physicalDesignPixel = zoomFactor * display.scaleFactor;

      expect(size.width).toBe(Math.round(ratio.width * display.bounds.width));
      expect(size.height).toBe(Math.round(ratio.height * display.bounds.height));
      const actualWidthRatio = size.width / display.bounds.width;
      const actualHeightRatio = size.height / display.bounds.height;
      expect(Math.abs(actualWidthRatio - ratio.width)).toBeLessThanOrEqual(
        0.5 / display.bounds.width + Number.EPSILON,
      );
      expect(Math.abs(actualHeightRatio - ratio.height)).toBeLessThanOrEqual(
        0.5 / display.bounds.height + Number.EPSILON,
      );
      expect(physicalWindowWidth / physicalDisplayWidth).toBeCloseTo(actualWidthRatio, 12);
      expect(physicalDesignPixel / physicalDisplayWidth).toBeCloseTo(contentScaleRatio, 12);
    }
  });

  it('restores the old 1x content size without tying it to a 1247px window width', () => {
    const sourceDisplay = { width: 2458, height: 1383 };
    const contentScaleRatio = getContentScaleRatio(1, sourceDisplay);

    expect(getContentZoomFactor(contentScaleRatio, sourceDisplay, { width: 1247 })).toBeCloseTo(
      1,
      12,
    );
    expect(getContentZoomFactor(contentScaleRatio, { width: 3072, height: 1728 })).toBeCloseTo(
      3072 / 2458,
      12,
    );
    expect(getContentZoomFactor(contentScaleRatio, { width: 1920, height: 1080 })).toBeCloseTo(
      1920 / 2458,
      12,
    );
  });

  it('only uses window width to shrink content that would otherwise not fit', () => {
    const display = { width: 2458, height: 1383 };
    const contentScaleRatio = getContentScaleRatio(1, display);

    expect(getContentZoomFactor(contentScaleRatio, display, { width: 1247 })).toBe(1);
    expect(getContentZoomFactor(contentScaleRatio, display, { width: 720 })).toBe(0.72);
  });

  it('keeps a configured work-area-filling size after normal work-area clamping', () => {
    expect(
      normalizeWindowSizeToWorkArea({ width: 2048, height: 896 }, { width: 2048, height: 896 }),
    ).toEqual({ width: 2016, height: 864 });
  });

  it('keeps non-full user sizes when normalizing locked windows', () => {
    expect(
      normalizeWindowSizeToWorkArea({ width: 1200, height: 720 }, { width: 2048, height: 896 }),
    ).toEqual({ width: 1200, height: 720 });
  });

  it('falls back to the default window size for invalid dimensions', () => {
    expect(
      normalizeWindowSizeToWorkArea(
        { width: Number.NaN, height: 600 },
        { width: 2048, height: 896 },
      ),
    ).toEqual({ width: 1000, height: 600 });
  });

  it('centers using the current window size rather than stale cached positions', () => {
    const workArea = { x: 100, y: 50, width: 1200, height: 800 };

    expect(getCenteredWindowBounds({ width: 1000, height: 600 }, workArea)).toEqual({
      x: 200,
      y: 150,
      width: 1000,
      height: 600,
    });
    expect(getCenteredWindowBounds({ width: 600, height: 400 }, workArea)).toEqual({
      x: 400,
      y: 250,
      width: 600,
      height: 400,
    });
  });

  it('centers an existing window by position without changing its size', () => {
    const workArea = { x: 0, y: 0, width: 1920, height: 1080 };

    expect(getCenteredWindowPosition({ width: 900, height: 600 }, workArea)).toEqual({
      x: 510,
      y: 240,
    });
    expect(getCenteredWindowPosition({ width: 2400, height: 600 }, workArea)).toEqual({
      x: -240,
      y: 240,
    });
  });
});
