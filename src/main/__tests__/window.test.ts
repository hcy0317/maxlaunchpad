const browserWindowMock = jest.fn();
const loadSettingsMock = jest.fn();
const saveSettingsMock = jest.fn();
type DisplayMock = {
  id: number;
  scaleFactor: number;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
};
const getCursorScreenPointMock = jest.fn(() => ({ x: 5000, y: 100 }));
const getDisplayNearestPointMock = jest.fn(
  (): DisplayMock => ({
    id: 2,
    scaleFactor: 1.5,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
  }),
);
const getPrimaryDisplayMock = jest.fn(
  (): DisplayMock => ({
    id: 1,
    scaleFactor: 1,
    bounds: { x: 4000, y: 0, width: 1920, height: 1080 },
    workArea: { x: 4000, y: 0, width: 1920, height: 1080 },
  }),
);
const getDisplayMatchingMock = jest.fn(
  (): DisplayMock => ({
    id: 2,
    scaleFactor: 1.5,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
  }),
);
const screenOnMock = jest.fn();
const screenOffMock = jest.fn();
const loadUrlMock = jest.fn();
const onMock = jest.fn();
const setMovableMock = jest.fn();
const setResizableMock = jest.fn();
const setAlwaysOnTopMock = jest.fn();
const setVisibleOnAllWorkspacesMock = jest.fn();
const isDestroyedMock = jest.fn(() => false);
const centerMock = jest.fn();
const focusMock = jest.fn();
const getBoundsMock = jest.fn(() => ({ x: 120, y: 140, width: 720, height: 480 }));
const getSizeMock = jest.fn(() => [720, 480]);
const isFullScreenMock = jest.fn(() => false);
const isMaximizedMock = jest.fn(() => false);
const setBoundsMock = jest.fn();
const setFullScreenMock = jest.fn();
const setSizeMock = jest.fn();
const hideMock = jest.fn();
const showMock = jest.fn();
const unmaximizeMock = jest.fn();
const webContentsSendMock = jest.fn();
const webContentsSetZoomFactorMock = jest.fn();

jest.mock('electron', () => ({
  app: {
    focus: jest.fn(),
  },
  BrowserWindow: browserWindowMock,
  screen: {
    getCursorScreenPoint: getCursorScreenPointMock,
    getDisplayNearestPoint: getDisplayNearestPointMock,
    getDisplayMatching: getDisplayMatchingMock,
    getPrimaryDisplay: getPrimaryDisplayMock,
    on: screenOnMock,
    off: screenOffMock,
  },
}));

jest.mock('../configStore', () => ({
  loadSettings: loadSettingsMock,
  saveSettings: saveSettingsMock,
}));

jest.mock('../logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('createMainWindow', () => {
  beforeEach(() => {
    jest.resetModules();
    (
      globalThis as typeof globalThis & { MAIN_WINDOW_WEBPACK_ENTRY: string }
    ).MAIN_WINDOW_WEBPACK_ENTRY = 'app://main';
    (
      globalThis as typeof globalThis & { MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string }
    ).MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY = 'app://preload';
    browserWindowMock.mockClear();
    loadSettingsMock.mockReset();
    saveSettingsMock.mockClear();
    getCursorScreenPointMock.mockClear();
    getDisplayNearestPointMock.mockClear();
    getDisplayMatchingMock.mockClear();
    getPrimaryDisplayMock.mockClear();
    screenOnMock.mockClear();
    screenOffMock.mockClear();
    getCursorScreenPointMock.mockReturnValue({ x: 5000, y: 100 });
    getDisplayNearestPointMock.mockReturnValue({
      id: 2,
      scaleFactor: 1.5,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    });
    getPrimaryDisplayMock.mockReturnValue({
      id: 1,
      scaleFactor: 1,
      bounds: { x: 4000, y: 0, width: 1920, height: 1080 },
      workArea: { x: 4000, y: 0, width: 1920, height: 1080 },
    });
    getDisplayMatchingMock.mockReturnValue({
      id: 2,
      scaleFactor: 1.5,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    });
    loadUrlMock.mockClear();
    onMock.mockClear();
    setMovableMock.mockClear();
    setResizableMock.mockClear();
    setAlwaysOnTopMock.mockClear();
    setVisibleOnAllWorkspacesMock.mockClear();
    isDestroyedMock.mockClear();
    centerMock.mockClear();
    focusMock.mockClear();
    getBoundsMock.mockReset();
    getBoundsMock.mockReturnValue({ x: 120, y: 140, width: 720, height: 480 });
    getSizeMock.mockReset();
    getSizeMock.mockReturnValue([720, 480]);
    isFullScreenMock.mockClear();
    isMaximizedMock.mockClear();
    setBoundsMock.mockClear();
    setFullScreenMock.mockClear();
    setSizeMock.mockClear();
    hideMock.mockClear();
    showMock.mockClear();
    unmaximizeMock.mockClear();
    webContentsSendMock.mockClear();
    webContentsSetZoomFactorMock.mockClear();
    isDestroyedMock.mockReturnValue(false);
    loadSettingsMock.mockReturnValue({
      windowSize: {
        width: 720,
        height: 480,
      },
      lockWindowCenter: true,
    });
    browserWindowMock.mockImplementation(function BrowserWindow(this: unknown, options: unknown) {
      return {
        options,
        center: centerMock,
        focus: focusMock,
        getBounds: getBoundsMock,
        getSize: getSizeMock,
        isFullScreen: isFullScreenMock,
        isMaximized: isMaximizedMock,
        isDestroyed: isDestroyedMock,
        loadURL: loadUrlMock,
        on: onMock,
        setBounds: setBoundsMock,
        setFullScreen: setFullScreenMock,
        hide: hideMock,
        setMovable: setMovableMock,
        setResizable: setResizableMock,
        setAlwaysOnTop: setAlwaysOnTopMock,
        setSize: setSizeMock,
        setVisibleOnAllWorkspaces: setVisibleOnAllWorkspacesMock,
        show: showMock,
        unmaximize: unmaximizeMock,
        webContents: {
          isDestroyed: jest.fn(() => false),
          send: webContentsSendMock,
          setZoomFactor: webContentsSetZoomFactorMock,
        },
      };
    });
  });

  afterEach(() => {
    const closedHandler = onMock.mock.calls.find(([eventName]) => eventName === 'closed')?.[1] as
      | (() => void)
      | undefined;
    closedHandler?.();
  });

  it('uses the custom app chrome instead of the native window frame', async () => {
    const { createMainWindow } = await import('../window');

    createMainWindow();

    expect(browserWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        frame: false,
        resizable: true,
      }),
    );
  });

  it('positions locked windows inside the active work area without relying on native center', async () => {
    const { createMainWindow, showMainWindow } = await import('../window');

    createMainWindow();
    showMainWindow();

    expect(setBoundsMock).toHaveBeenCalledWith({
      x: 600,
      y: 300,
      width: 720,
      height: 480,
    });
    expect(centerMock).not.toHaveBeenCalled();
    expect(getCursorScreenPointMock).toHaveBeenCalled();
    expect(getDisplayNearestPointMock).toHaveBeenCalled();
    expect(getPrimaryDisplayMock).not.toHaveBeenCalled();
  });

  it('uses Electron display work areas as DIP coordinates without scale-factor division', async () => {
    getDisplayNearestPointMock.mockReturnValue({
      id: 1,
      scaleFactor: 2,
      bounds: { x: 0, y: 0, width: 2048, height: 1080 },
      workArea: { x: 0, y: 0, width: 2048, height: 1080 },
    });
    const { createMainWindow, showMainWindow } = await import('../window');

    createMainWindow();
    showMainWindow();

    expect(setBoundsMock).toHaveBeenCalledWith({
      x: 664,
      y: 300,
      width: 720,
      height: 480,
    });
  });

  it('opens the window and renderer at the saved display-work-area proportion', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 1000 / 3072, height: 600 / 1728 },
      lockWindowCenter: true,
    });
    const { createMainWindow } = await import('../window');

    createMainWindow();

    expect(browserWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 625,
        height: 375,
        webPreferences: expect.objectContaining({ zoomFactor: 0.625 }),
      }),
    );
  });

  it('uses display bounds for ratios while reserving workArea for placement', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 0.5, height: 0.5 },
      lockWindowCenter: true,
    });
    getDisplayNearestPointMock.mockReturnValue({
      id: 2,
      scaleFactor: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 100, y: 50, width: 1600, height: 900 },
    });
    const { createMainWindow, showMainWindow } = await import('../window');

    createMainWindow();
    showMainWindow();

    expect(browserWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 960,
        height: 540,
        webPreferences: expect.objectContaining({ zoomFactor: 0.96 }),
      }),
    );
    expect(setBoundsMock).toHaveBeenLastCalledWith({
      x: 420,
      y: 230,
      width: 960,
      height: 540,
    });
  });

  it('migrates an invalid legacy scale basis without changing the current layout', async () => {
    loadSettingsMock.mockReturnValue({
      windowSize: { width: 720, height: 480 },
      windowScaleBasis: { width: 0, height: Number.NaN },
      lockWindowCenter: true,
    });
    const { createMainWindow } = await import('../window');

    createMainWindow();

    expect(browserWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 720,
        height: 480,
        webPreferences: expect.objectContaining({ zoomFactor: 0.72 }),
      }),
    );
    expect(saveSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        windowSizeRatio: { width: 720 / 1920, height: 480 / 1080 },
        contentScaleRatio: 1 / 1920,
      }),
    );
  });

  it('migrates a configured minimum size without changing its visual size', async () => {
    loadSettingsMock.mockReturnValue({
      windowSize: { width: 482, height: 121 },
      windowScaleBasis: { width: 2458, height: 1383 },
      lockWindowCenter: true,
      hideElements: {
        menu: true,
        buttonIcons: false,
        buttonText: false,
        emptyButtons: false,
        rowF: false,
        row1: false,
        row2: false,
        row3: false,
      },
    });
    getDisplayNearestPointMock.mockReturnValue({
      id: 2,
      scaleFactor: 1.25,
      bounds: { x: 0, y: 0, width: 2458, height: 1383 },
      workArea: { x: 0, y: 0, width: 2458, height: 1383 },
    });
    const { createMainWindow } = await import('../window');

    createMainWindow();

    expect(browserWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({ width: 482, height: 121 }),
    );
    expect(saveSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        windowSizeRatio: { width: 482 / 2458, height: 121 / 1383 },
      }),
    );
  });

  it('migrates the live legacy anchor into an equivalent direct display ratio', async () => {
    loadSettingsMock.mockReturnValue({
      windowSize: { width: 1247, height: 732 },
      windowScaleBasis: { width: 2458, height: 1383 },
      lockWindowCenter: true,
    });
    getDisplayNearestPointMock.mockReturnValue({
      id: 2,
      scaleFactor: 1.25,
      bounds: { x: 0, y: 0, width: 3072, height: 1728 },
      workArea: { x: 0, y: 0, width: 3072, height: 1728 },
    });
    const { createMainWindow } = await import('../window');

    createMainWindow();

    expect(browserWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1558,
        height: 915,
        webPreferences: expect.objectContaining({ zoomFactor: 1728 / 1383 }),
      }),
    );
    expect(saveSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        windowSizeRatio: { width: 1558 / 3072, height: 915 / 1728 },
        contentScaleRatio: 1728 / 1383 / 3072,
      }),
    );
  });

  it('restores the live ratio-based window to the old 1x content size', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 1247 / 2458, height: 732 / 1383 },
      lockWindowCenter: true,
    });
    getDisplayNearestPointMock.mockReturnValue({
      id: 2,
      scaleFactor: 1.5625,
      bounds: { x: 0, y: 0, width: 2458, height: 1383 },
      workArea: { x: 0, y: 0, width: 2458, height: 1383 },
    });
    const { createMainWindow } = await import('../window');

    createMainWindow();

    expect(browserWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1247,
        height: 732,
        webPreferences: expect.objectContaining({ zoomFactor: 1 }),
      }),
    );
    expect(saveSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({ contentScaleRatio: 1 / 2458 }),
    );
  });

  it('keeps a user work-area-filling size after normal bounds clamping', async () => {
    loadSettingsMock.mockReturnValue({
      windowSize: { width: 2048, height: 896 },
      windowScaleBasis: { width: 2048, height: 896 },
      lockWindowCenter: true,
    });
    getDisplayNearestPointMock.mockReturnValue({
      id: 2,
      scaleFactor: 1,
      bounds: { x: 0, y: 0, width: 2048, height: 896 },
      workArea: { x: 0, y: 0, width: 2048, height: 896 },
    });
    const { createMainWindow } = await import('../window');

    createMainWindow();

    expect(browserWindowMock).toHaveBeenCalledWith(
      expect.objectContaining({ width: 2016, height: 864 }),
    );
    expect(saveSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        windowSizeRatio: { width: 2016 / 2048, height: 864 / 896 },
      }),
    );
  });

  it('reapplies the saved display proportion whenever a locked window is shown', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 1378 / 3072, height: 771 / 1728 },
      lockWindowCenter: true,
    });
    const { createMainWindow, showMainWindow } = await import('../window');

    createMainWindow();
    showMainWindow();

    expect(webContentsSetZoomFactorMock).toHaveBeenLastCalledWith(0.861);
    expect(setBoundsMock).toHaveBeenLastCalledWith({
      x: 530,
      y: 299,
      width: 861,
      height: 482,
    });
  });

  it('restores the original layout after a display metrics round trip', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 1378 / 3072, height: 771 / 1728 },
      lockWindowCenter: true,
    });
    getDisplayNearestPointMock.mockReturnValue({
      id: 2,
      scaleFactor: 1.25,
      bounds: { x: 0, y: 0, width: 3072, height: 1728 },
      workArea: { x: 0, y: 0, width: 3072, height: 1728 },
    });
    getDisplayMatchingMock.mockReturnValue({
      id: 2,
      scaleFactor: 1.25,
      bounds: { x: 0, y: 0, width: 3072, height: 1728 },
      workArea: { x: 0, y: 0, width: 3072, height: 1728 },
    });
    getSizeMock.mockReturnValue([1378, 771]);
    const { createMainWindow } = await import('../window');

    createMainWindow();
    const metricsHandler = screenOnMock.mock.calls.find(
      ([eventName]) => eventName === 'display-metrics-changed',
    )?.[1] as ((event: unknown, display: unknown, changedMetrics: string[]) => void) | undefined;
    expect(metricsHandler).toBeDefined();

    metricsHandler!(
      {},
      {
        id: 2,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      },
      ['bounds', 'workArea', 'scaleFactor'],
    );
    expect(webContentsSetZoomFactorMock).toHaveBeenLastCalledWith(0.625);
    expect(setBoundsMock).toHaveBeenLastCalledWith({
      x: 530,
      y: 299,
      width: 861,
      height: 482,
    });

    metricsHandler!(
      {},
      {
        id: 2,
        bounds: { x: 0, y: 0, width: 3072, height: 1728 },
        workArea: { x: 0, y: 0, width: 3072, height: 1728 },
      },
      ['bounds', 'workArea', 'scaleFactor'],
    );
    expect(webContentsSetZoomFactorMock).toHaveBeenLastCalledWith(1);
    expect(setBoundsMock).toHaveBeenLastCalledWith({
      x: 847,
      y: 479,
      width: 1378,
      height: 771,
    });
  });

  it('does not persist delayed intermediate sizes during a display metrics round trip', async () => {
    jest.useFakeTimers();
    try {
      loadSettingsMock.mockReturnValue({
        windowSizeRatio: { width: 1378 / 3072, height: 771 / 1728 },
        lockWindowCenter: true,
      });
      getDisplayNearestPointMock.mockReturnValue({
        id: 2,
        scaleFactor: 1.25,
        bounds: { x: 0, y: 0, width: 3072, height: 1728 },
        workArea: { x: 0, y: 0, width: 3072, height: 1728 },
      });
      getDisplayMatchingMock.mockReturnValue({
        id: 2,
        scaleFactor: 1.25,
        bounds: { x: 0, y: 0, width: 3072, height: 1728 },
        workArea: { x: 0, y: 0, width: 3072, height: 1728 },
      });
      getSizeMock.mockReturnValue([1378, 771]);
      const { createMainWindow } = await import('../window');

      createMainWindow();
      const metricsHandler = screenOnMock.mock.calls.find(
        ([eventName]) => eventName === 'display-metrics-changed',
      )?.[1] as ((event: unknown, display: unknown, changedMetrics: string[]) => void) | undefined;
      const resizeHandler = onMock.mock.calls.find(([eventName]) => eventName === 'resize')?.[1] as
        | (() => void)
        | undefined;
      expect(metricsHandler).toBeDefined();
      expect(resizeHandler).toBeDefined();

      const compactDisplay = {
        id: 2,
        scaleFactor: 1.5,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      };
      getDisplayMatchingMock.mockReturnValue(compactDisplay);
      metricsHandler!({}, compactDisplay, ['bounds', 'workArea', 'scaleFactor']);

      getSizeMock.mockReturnValue([861, 482]);
      resizeHandler!();
      jest.advanceTimersByTime(150);

      // Windows can report an automatic, intermediate DIP size before Electron reaches
      // the explicit target bounds, including after the target was already observed and
      // near the end of the suppression window. It must not become the user's saved basis.
      jest.advanceTimersByTime(750);
      getSizeMock.mockReturnValue([690, 386]);
      resizeHandler!();
      jest.advanceTimersByTime(150);

      expect(webContentsSendMock).not.toHaveBeenCalled();

      const basisDisplay = {
        id: 2,
        scaleFactor: 1.25,
        bounds: { x: 0, y: 0, width: 3072, height: 1728 },
        workArea: { x: 0, y: 0, width: 3072, height: 1728 },
      };
      getDisplayMatchingMock.mockReturnValue(basisDisplay);
      metricsHandler!({}, basisDisplay, ['bounds', 'workArea', 'scaleFactor']);

      expect(setBoundsMock).toHaveBeenLastCalledWith({
        x: 847,
        y: 479,
        width: 1378,
        height: 771,
      });
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('adapts an unlocked window when it moves to a differently scaled display', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 1378 / 3072, height: 771 / 1728 },
      lockWindowCenter: false,
    });
    getDisplayNearestPointMock.mockReturnValue({
      id: 1,
      scaleFactor: 1.25,
      bounds: { x: 0, y: 0, width: 3072, height: 1728 },
      workArea: { x: 0, y: 0, width: 3072, height: 1728 },
    });
    const { createMainWindow } = await import('../window');

    createMainWindow();
    const movedHandler = onMock.mock.calls.find(([eventName]) => eventName === 'moved')?.[1] as
      | (() => void)
      | undefined;
    const resizeHandler = onMock.mock.calls.find(([eventName]) => eventName === 'resize')?.[1] as
      | (() => void)
      | undefined;
    expect(movedHandler).toBeDefined();
    expect(resizeHandler).toBeDefined();

    getSizeMock.mockReturnValue([1723, 964]);
    resizeHandler!();
    movedHandler!();

    expect(webContentsSetZoomFactorMock).toHaveBeenLastCalledWith(0.625);
    expect(setBoundsMock).toHaveBeenLastCalledWith({
      x: 120,
      y: 140,
      width: 861,
      height: 482,
    });
  });

  it('resizes hidden-row height deltas without changing the window width', async () => {
    const { createMainWindow, resizeMainWindowByHeightDelta } = await import('../window');

    createMainWindow();
    resizeMainWindowByHeightDelta(-120);

    expect(setBoundsMock).toHaveBeenCalledWith({
      x: 600,
      y: 343,
      width: 720,
      height: 394,
    });
  });

  it('scales compact-layout height deltas without changing the saved width ratio', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 1378 / 3072, height: 771 / 1728 },
      lockWindowCenter: true,
    });
    getSizeMock.mockReturnValue([861, 482]);
    const { IPC_CHANNELS } = await import('../../shared/ipcChannels');
    const { createMainWindow, resizeMainWindowByHeightDelta } = await import('../window');

    createMainWindow();
    resizeMainWindowByHeightDelta(-120);

    expect(setBoundsMock).toHaveBeenLastCalledWith({
      x: 530,
      y: 351,
      width: 861,
      height: 379,
    });
    expect(webContentsSendMock).toHaveBeenLastCalledWith(
      IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED,
      861 / 1920,
      379 / 1080,
    );
  });

  it('reports hidden-row programmatic resizes so compact window sizes persist', async () => {
    const { IPC_CHANNELS } = await import('../../shared/ipcChannels');
    const { createMainWindow, resizeMainWindowByHeightDelta } = await import('../window');

    createMainWindow();
    const resizeHandler = onMock.mock.calls.find(([eventName]) => eventName === 'resize')?.[1] as
      | (() => void)
      | undefined;
    expect(resizeHandler).toBeDefined();

    resizeMainWindowByHeightDelta(-120);
    getSizeMock.mockReturnValue([720, 360]);
    resizeHandler!();

    expect(webContentsSendMock).toHaveBeenCalledWith(
      IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED,
      720 / 1920,
      394 / 1080,
    );

    const willResizeHandler = onMock.mock.calls.find(
      ([eventName]) => eventName === 'will-resize',
    )?.[1] as ((event: { preventDefault: () => void }) => void) | undefined;
    expect(willResizeHandler).toBeDefined();
    willResizeHandler!({ preventDefault: jest.fn() });
    getSizeMock.mockReturnValue([720, 500]);
    resizeHandler!();

    expect(webContentsSendMock).toHaveBeenCalledWith(
      IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED,
      720 / 1920,
      500 / 1080,
    );
  });

  it('releases programmatic resize suppression for later resize-only platform input', async () => {
    jest.useFakeTimers();
    try {
      const { IPC_CHANNELS } = await import('../../shared/ipcChannels');
      const { createMainWindow, resizeMainWindowByHeightDelta } = await import('../window');

      createMainWindow();
      const resizeHandler = onMock.mock.calls.find(([eventName]) => eventName === 'resize')?.[1] as
        | (() => void)
        | undefined;
      expect(resizeHandler).toBeDefined();

      resizeMainWindowByHeightDelta(-120);
      webContentsSendMock.mockClear();
      jest.advanceTimersByTime(2000);

      getSizeMock.mockReturnValue([800, 500]);
      resizeHandler!();
      jest.advanceTimersByTime(150);

      expect(webContentsSendMock).toHaveBeenCalledWith(
        IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED,
        800 / 1920,
        500 / 1080,
      );
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('persists resize-only platform input that finishes during the programmatic guard', async () => {
    jest.useFakeTimers();
    jest.doMock('../platform', () => ({ IS_LINUX: true }));
    try {
      loadSettingsMock.mockReturnValue({
        windowSizeRatio: { width: 1378 / 3072, height: 771 / 1728 },
        lockWindowCenter: true,
      });
      getDisplayNearestPointMock.mockReturnValue({
        id: 2,
        scaleFactor: 1.25,
        bounds: { x: 0, y: 0, width: 3072, height: 1728 },
        workArea: { x: 0, y: 0, width: 3072, height: 1728 },
      });
      const compactDisplay = {
        id: 2,
        scaleFactor: 1.5,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      };
      getDisplayMatchingMock.mockReturnValue(compactDisplay);
      const { IPC_CHANNELS } = await import('../../shared/ipcChannels');
      const { createMainWindow } = await import('../window');

      createMainWindow();
      const metricsHandler = screenOnMock.mock.calls.find(
        ([eventName]) => eventName === 'display-metrics-changed',
      )?.[1] as ((event: unknown, display: unknown, changedMetrics: string[]) => void) | undefined;
      const resizeHandler = onMock.mock.calls.find(([eventName]) => eventName === 'resize')?.[1] as
        | (() => void)
        | undefined;
      expect(metricsHandler).toBeDefined();
      expect(resizeHandler).toBeDefined();

      metricsHandler!({}, compactDisplay, ['bounds', 'workArea', 'scaleFactor']);
      jest.advanceTimersByTime(500);
      getSizeMock.mockReturnValue([900, 500]);
      resizeHandler!();
      jest.advanceTimersByTime(1000);

      expect(webContentsSendMock).toHaveBeenCalledWith(
        IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED,
        900 / 1920,
        500 / 1080,
      );
    } finally {
      jest.dontMock('../platform');
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('persists manual resize dimensions as display ratios', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 1378 / 3072, height: 771 / 1728 },
      lockWindowCenter: true,
    });
    const { IPC_CHANNELS } = await import('../../shared/ipcChannels');
    const { createMainWindow } = await import('../window');

    createMainWindow();
    const resizeHandler = onMock.mock.calls.find(([eventName]) => eventName === 'resize')?.[1] as
      | (() => void)
      | undefined;
    expect(resizeHandler).toBeDefined();

    const willResizeHandler = onMock.mock.calls.find(
      ([eventName]) => eventName === 'will-resize',
    )?.[1] as ((event: { preventDefault: () => void }) => void) | undefined;
    expect(willResizeHandler).toBeDefined();
    willResizeHandler!({ preventDefault: jest.fn() });
    getSizeMock.mockReturnValue([900, 500]);
    resizeHandler!();

    expect(webContentsSendMock).toHaveBeenLastCalledWith(
      IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED,
      900 / 1920,
      500 / 1080,
    );
    expect(webContentsSetZoomFactorMock).toHaveBeenLastCalledWith(0.9);
  });

  it('persists and applies a safely clamped manual resize for unlocked windows', async () => {
    loadSettingsMock.mockReturnValue({
      windowSizeRatio: { width: 0.5, height: 0.5 },
      lockWindowCenter: false,
    });
    const { IPC_CHANNELS } = await import('../../shared/ipcChannels');
    const { createMainWindow } = await import('../window');

    createMainWindow();
    const willResizeHandler = onMock.mock.calls.find(
      ([eventName]) => eventName === 'will-resize',
    )?.[1] as ((event: { preventDefault: () => void }) => void) | undefined;
    const resizeHandler = onMock.mock.calls.find(([eventName]) => eventName === 'resize')?.[1] as
      | (() => void)
      | undefined;
    expect(willResizeHandler).toBeDefined();
    expect(resizeHandler).toBeDefined();

    willResizeHandler!({ preventDefault: jest.fn() });
    getSizeMock.mockReturnValue([2000, 1100]);
    resizeHandler!();

    expect(setBoundsMock).toHaveBeenLastCalledWith({
      x: 120,
      y: 140,
      width: 1888,
      height: 1048,
    });
    expect(webContentsSendMock).toHaveBeenLastCalledWith(
      IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED,
      1888 / 1920,
      1048 / 1080,
    );
    expect(webContentsSetZoomFactorMock).toHaveBeenLastCalledWith(1);
  });

  it('keeps blur auto-hide suspended while renderer modals are mounted', async () => {
    const { createMainWindow, setWindowAutoHideSuspended } = await import('../window');

    createMainWindow();
    const blurHandler = onMock.mock.calls.find(([eventName]) => eventName === 'blur')?.[1] as
      | (() => void)
      | undefined;
    expect(blurHandler).toBeDefined();

    setWindowAutoHideSuspended(true);
    setWindowAutoHideSuspended(true);
    setWindowAutoHideSuspended(false);
    blurHandler!();

    expect(hideMock).not.toHaveBeenCalled();

    setWindowAutoHideSuspended(false);
    blurHandler!();

    expect(hideMock).toHaveBeenCalledTimes(1);
  });

  it('temporarily disables always-on-top while native dialogs are open', async () => {
    const { createMainWindow, keepMainWindowVisibleDuringNativeDialog } = await import('../window');

    createMainWindow();
    setAlwaysOnTopMock.mockClear();

    await keepMainWindowVisibleDuringNativeDialog(async () => {
      expect(setAlwaysOnTopMock).toHaveBeenLastCalledWith(false);
    });

    expect(showMock).toHaveBeenCalledTimes(1);
    expect(setAlwaysOnTopMock.mock.calls.map(([enabled]) => enabled)).toEqual([false, true]);
  });

  it('restores native dialog always-on-top policy when the dialog task rejects', async () => {
    const { createMainWindow, keepMainWindowVisibleDuringNativeDialog } = await import('../window');

    createMainWindow();
    setAlwaysOnTopMock.mockClear();

    await expect(
      keepMainWindowVisibleDuringNativeDialog(async () => {
        throw new Error('dialog failed');
      }),
    ).rejects.toThrow('dialog failed');

    expect(setAlwaysOnTopMock.mock.calls.map(([enabled]) => enabled)).toEqual([false, true]);
  });

  it('waits for overlapping native dialogs before restoring always-on-top policy', async () => {
    const { createMainWindow, keepMainWindowVisibleDuringNativeDialog } = await import('../window');

    createMainWindow();
    setAlwaysOnTopMock.mockClear();

    await keepMainWindowVisibleDuringNativeDialog(async () => {
      await keepMainWindowVisibleDuringNativeDialog(async () => {
        expect(setAlwaysOnTopMock.mock.calls.map(([enabled]) => enabled)).toEqual([false]);
      });

      expect(setAlwaysOnTopMock.mock.calls.map(([enabled]) => enabled)).toEqual([false]);
    });

    expect(setAlwaysOnTopMock.mock.calls.map(([enabled]) => enabled)).toEqual([false, true]);
  });

  it('keeps policy reapplication from restoring always-on-top before native dialogs close', async () => {
    const { createMainWindow, keepMainWindowVisibleDuringNativeDialog, setLockWindowCenter } =
      await import('../window');

    createMainWindow();
    setAlwaysOnTopMock.mockClear();

    await keepMainWindowVisibleDuringNativeDialog(async () => {
      setLockWindowCenter(true);

      expect(setAlwaysOnTopMock.mock.calls.map(([enabled]) => enabled)).toEqual([false, false]);
    });

    expect(setAlwaysOnTopMock.mock.calls.map(([enabled]) => enabled)).toEqual([false, false, true]);
  });

  it('keeps unlocked windows movable without enabling drag-drop runtime mode on startup', async () => {
    loadSettingsMock.mockReturnValue({
      windowSize: {
        width: 720,
        height: 480,
      },
      lockWindowCenter: false,
    });
    const { createMainWindow } = await import('../window');

    createMainWindow();
    const blurHandler = onMock.mock.calls.find(([eventName]) => eventName === 'blur')?.[1] as
      | (() => void)
      | undefined;
    expect(blurHandler).toBeDefined();

    expect(setMovableMock).toHaveBeenLastCalledWith(true);

    blurHandler!();

    expect(hideMock).toHaveBeenCalledTimes(1);
  });

  it('keeps drag-drop mode and center lock mutually exclusive in the main window policy', async () => {
    const { createMainWindow, setDragDropMode, setLockWindowCenter } = await import('../window');

    createMainWindow();

    setDragDropMode(true);

    expect(setMovableMock).toHaveBeenLastCalledWith(true);
    expect(setAlwaysOnTopMock).toHaveBeenLastCalledWith(false);

    setLockWindowCenter(true);

    expect(setMovableMock).toHaveBeenLastCalledWith(false);
    expect(setAlwaysOnTopMock).toHaveBeenLastCalledWith(true);

    setDragDropMode(true);

    expect(setMovableMock).toHaveBeenLastCalledWith(true);
    expect(setAlwaysOnTopMock).toHaveBeenLastCalledWith(false);
  });
});
