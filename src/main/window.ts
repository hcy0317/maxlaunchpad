import type { Display, Event as ElectronEvent } from 'electron';
import { app, BrowserWindow, screen } from 'electron';

import { APP_NAME, DEFAULT_WINDOW_SIZE } from '../shared/constants';
import { IPC_CHANNELS } from '../shared/ipcChannels';
import type { AppSettings, WindowSize, WindowSizeRatio } from '../shared/types';
import {
  getCenteredWindowBounds,
  getContentScaleRatio,
  getContentZoomFactor,
  getLegacyDisplayAwareWindowSize,
  getLegacyDisplayScaleFactor,
  getWindowSizeFromRatio,
  getWindowSizeRatio,
  normalizeWindowSizeToWorkArea,
  shouldAllowWindowMovement,
  shouldAllowWindowResize,
} from '../shared/windowBehavior';
import { loadSettings, saveSettings } from './configStore';
import log from './logger';
import { IS_LINUX } from './platform';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;
let isLockWindowCenter = false;
let isDragDropMode = false;
let nativeDialogDepth = 0;
let rendererModalAutoHideDepth = 0;
let preferredWindowSizeRatio: WindowSizeRatio | null = null;
let preferredContentScaleRatio: number | null = null;
let lastProgrammaticResizeSize: WindowSize | null = null;
let programmaticResizeGuardTimer: ReturnType<typeof setTimeout> | null = null;
let pendingResizeOnlyPlatformPersistence: BrowserWindow | null = null;
let isManualWindowResize = false;
let resizePersistenceTimer: ReturnType<typeof setTimeout> | null = null;

const DISPLAY_LAYOUT_METRICS = new Set(['bounds', 'workArea', 'scaleFactor']);
const PROGRAMMATIC_RESIZE_GUARD_MS = 1000;

function getCursorDisplay(): Display {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

function isValidWindowScaleBasis(size: WindowSize | null | undefined): size is WindowSize {
  return Boolean(
    size &&
      Number.isFinite(size.width) &&
      Number.isFinite(size.height) &&
      size.width > 0 &&
      size.height > 0,
  );
}

function isValidWindowSizeRatio(
  ratio: WindowSizeRatio | null | undefined,
): ratio is WindowSizeRatio {
  return Boolean(
    ratio &&
      Number.isFinite(ratio.width) &&
      Number.isFinite(ratio.height) &&
      ratio.width > 0 &&
      ratio.width <= 1 &&
      ratio.height > 0 &&
      ratio.height <= 1,
  );
}

function isValidContentScaleRatio(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function getDisplayBounds(display: Display): Display['bounds'] {
  // Electron exposes bounds in DPI-virtualized DIP, so these ratios already include
  // the target display's resolution and OS scale factor without storing either one.
  return display.bounds;
}

function resolveWindowSizeRatio(settings: AppSettings, currentDisplay: Display): WindowSizeRatio {
  if (isValidWindowSizeRatio(settings.windowSizeRatio)) {
    return settings.windowSizeRatio;
  }

  const legacySize = settings.windowSize ?? DEFAULT_WINDOW_SIZE;
  const displayedSize = isValidWindowScaleBasis(settings.windowScaleBasis)
    ? getLegacyDisplayAwareWindowSize(
        legacySize,
        settings.windowScaleBasis,
        currentDisplay.workArea,
      )
    : normalizeWindowSizeToWorkArea(legacySize, currentDisplay.workArea);
  return getWindowSizeRatio(displayedSize, getDisplayBounds(currentDisplay));
}

function resolveContentScaleRatio(settings: AppSettings, currentDisplay: Display): number {
  if (isValidContentScaleRatio(settings.contentScaleRatio)) {
    return settings.contentScaleRatio;
  }

  const legacyZoomFactor = isValidWindowScaleBasis(settings.windowScaleBasis)
    ? getLegacyDisplayScaleFactor(settings.windowScaleBasis, currentDisplay.workArea)
    : 1;
  return getContentScaleRatio(legacyZoomFactor, getDisplayBounds(currentDisplay));
}

function suppressProgrammaticResizeNotifications(size?: WindowSize): void {
  if (size) {
    if (programmaticResizeGuardTimer) {
      clearTimeout(programmaticResizeGuardTimer);
    }
    pendingResizeOnlyPlatformPersistence = null;
    lastProgrammaticResizeSize = size;
    programmaticResizeGuardTimer = setTimeout(() => {
      programmaticResizeGuardTimer = null;
      lastProgrammaticResizeSize = null;
      const pendingWin = pendingResizeOnlyPlatformPersistence;
      pendingResizeOnlyPlatformPersistence = null;
      if (pendingWin && getMainWindow() === pendingWin) {
        scheduleWindowSizePersistence(pendingWin);
      }
    }, PROGRAMMATIC_RESIZE_GUARD_MS);
  }
}

function clearProgrammaticResizeGuard(): void {
  if (programmaticResizeGuardTimer) {
    clearTimeout(programmaticResizeGuardTimer);
    programmaticResizeGuardTimer = null;
  }
  lastProgrammaticResizeSize = null;
  pendingResizeOnlyPlatformPersistence = null;
}

function clearPendingWindowSizePersistence(): void {
  if (resizePersistenceTimer) {
    clearTimeout(resizePersistenceTimer);
    resizePersistenceTimer = null;
  }
}

function persistCurrentWindowSize(
  win: BrowserWindow,
  programmaticResizeSizeAtEvent: WindowSize | null = null,
): void {
  if (win.isMaximized() || win.isFullScreen()) {
    return;
  }

  const [width, height] = win.getSize();
  const currentSize = { width, height };
  const guardedSize = lastProgrammaticResizeSize ?? programmaticResizeSizeAtEvent;
  if (guardedSize) {
    // Per-monitor DPI transitions can report stale intermediate bounds before the
    // explicit target is reached. Keep the entire transition generation suppressed,
    // even if its debounce callback runs just after the time-based guard expires.
    if (IS_LINUX && !isSameWindowSize(currentSize, guardedSize)) {
      if (lastProgrammaticResizeSize) {
        pendingResizeOnlyPlatformPersistence = win;
      } else {
        scheduleWindowSizePersistence(win);
      }
    }
    return;
  }

  const currentDisplay = screen.getDisplayMatching(win.getBounds());
  const normalizedSize = normalizeWindowSizeToWorkArea(currentSize, currentDisplay.workArea);
  const sizeRatio = getWindowSizeRatio(normalizedSize, getDisplayBounds(currentDisplay));
  const wasConstrained = !isSameWindowSize(currentSize, normalizedSize);

  preferredWindowSizeRatio = sizeRatio;
  win.webContents.setZoomFactor(
    getContentZoomFactor(
      preferredContentScaleRatio ?? getContentScaleRatio(1, getDisplayBounds(currentDisplay)),
      getDisplayBounds(currentDisplay),
      normalizedSize,
    ),
  );
  win.webContents.send(IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED, sizeRatio.width, sizeRatio.height);

  if (wasConstrained) {
    suppressProgrammaticResizeNotifications(normalizedSize);
    const bounds = isLockWindowCenter
      ? getCenteredWindowBounds(normalizedSize, currentDisplay.workArea)
      : { ...win.getBounds(), ...normalizedSize };
    win.setBounds(bounds);
  }
}

function scheduleWindowSizePersistence(win: BrowserWindow): void {
  clearPendingWindowSizePersistence();
  const programmaticResizeSizeAtEvent = lastProgrammaticResizeSize
    ? { ...lastProgrammaticResizeSize }
    : null;
  resizePersistenceTimer = setTimeout(() => {
    resizePersistenceTimer = null;
    if (getMainWindow() === win) {
      persistCurrentWindowSize(win, programmaticResizeSizeAtEvent);
    }
  }, 150);
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  // Load saved window size from settings
  const settings = loadSettings();
  isLockWindowCenter = settings.lockWindowCenter;
  isDragDropMode = false;

  const currentDisplay = getCursorDisplay();
  preferredWindowSizeRatio = resolveWindowSizeRatio(settings, currentDisplay);
  preferredContentScaleRatio = resolveContentScaleRatio(settings, currentDisplay);
  const needsWindowLayoutMigration =
    !isValidWindowSizeRatio(settings.windowSizeRatio) ||
    !isValidContentScaleRatio(settings.contentScaleRatio) ||
    settings.windowSize !== undefined ||
    settings.windowScaleBasis !== undefined;
  if (needsWindowLayoutMigration) {
    log.info('Migrating window and content layout to display ratios', {
      scope: 'window',
      displayId: currentDisplay.id,
      displayBounds: getDisplayBounds(currentDisplay),
      windowSizeRatio: preferredWindowSizeRatio,
      contentScaleRatio: preferredContentScaleRatio,
    });
    saveSettings({
      ...settings,
      windowSizeRatio: preferredWindowSizeRatio,
      contentScaleRatio: preferredContentScaleRatio,
    });
  }
  const initialWindowSize = getWindowSizeFromRatio(
    preferredWindowSizeRatio,
    getDisplayBounds(currentDisplay),
    currentDisplay.workArea,
  );
  const initialZoomFactor = getContentZoomFactor(
    preferredContentScaleRatio,
    getDisplayBounds(currentDisplay),
    initialWindowSize,
  );

  mainWindow = new BrowserWindow({
    width: initialWindowSize.width,
    height: initialWindowSize.height,
    center: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    alwaysOnTop: true,
    show: false,
    title: APP_NAME,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Disable background throttling for faster hotkey response
      zoomFactor: initialZoomFactor,
    },
  });
  screen.on('display-metrics-changed', handleDisplayMetricsChanged);

  // macOS: show on current virtual desktop when invoked via hotkey
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  void mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.on('blur', () => {
    if (nativeDialogDepth > 0 || rendererModalAutoHideDepth > 0) {
      return;
    }
    if (!isDragDropMode && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    clearPendingWindowSizePersistence();
    screen.off('display-metrics-changed', handleDisplayMetricsChanged);
    mainWindow = null;
    preferredWindowSizeRatio = null;
    preferredContentScaleRatio = null;
    clearProgrammaticResizeGuard();
    isManualWindowResize = false;
  });

  mainWindow.on('minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      notifyWindowHidden(mainWindow);
    }
  });

  mainWindow.on('hide', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      notifyWindowHidden(mainWindow);
    }
  });

  // Notify renderer when window is resized (saving handled by useConfigSync with debounce)
  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (isManualWindowResize) {
        clearPendingWindowSizePersistence();
      } else {
        scheduleWindowSizePersistence(mainWindow);
      }
    }
  });

  mainWindow.on('will-move', (event) => {
    if (!shouldAllowWindowMovement({ lockWindowCenter: isLockWindowCenter, isDragDropMode })) {
      event.preventDefault();
    }
  });

  mainWindow.on('moved', handleMainWindowMoved);

  mainWindow.on('will-resize', (event) => {
    if (!shouldAllowWindowResize({ lockWindowCenter: isLockWindowCenter, isDragDropMode })) {
      event.preventDefault();
      return;
    }
    clearProgrammaticResizeGuard();
    isManualWindowResize = true;
  });

  mainWindow.on('resized', () => {
    const completedManualResize = isManualWindowResize;
    isManualWindowResize = false;
    if (completedManualResize && mainWindow && !mainWindow.isDestroyed()) {
      persistCurrentWindowSize(mainWindow);
    }
  });

  applyWindowInteractionPolicy(mainWindow);

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }
  return null;
}

function placeWindowOnCursorDisplay(win: BrowserWindow): void {
  try {
    applyPreferredLayoutToDisplay(win, getCursorDisplay(), true);
  } catch (error) {
    log.error('Failed to center window', { scope: 'window', error });
  }
}

function applyPreferredLayoutToDisplay(
  win: BrowserWindow,
  display: Display,
  centered: boolean,
): void {
  if (!preferredWindowSizeRatio || !preferredContentScaleRatio) {
    return;
  }

  clearPendingWindowSizePersistence();
  const displaySize = getWindowSizeFromRatio(
    preferredWindowSizeRatio,
    getDisplayBounds(display),
    display.workArea,
  );
  win.webContents.setZoomFactor(
    getContentZoomFactor(preferredContentScaleRatio, getDisplayBounds(display), displaySize),
  );
  const currentBounds = win.getBounds();
  const bounds = centered
    ? getCenteredWindowBounds(displaySize, display.workArea)
    : { ...currentBounds, ...displaySize };
  if (
    currentBounds.x === bounds.x &&
    currentBounds.y === bounds.y &&
    currentBounds.width === bounds.width &&
    currentBounds.height === bounds.height
  ) {
    return;
  }
  suppressProgrammaticResizeNotifications(displaySize);
  win.setBounds(bounds);
}

function handleMainWindowMoved(): void {
  const win = getMainWindow();
  if (!win || isLockWindowCenter) {
    return;
  }

  try {
    const display = screen.getDisplayMatching(win.getBounds());
    applyPreferredLayoutToDisplay(win, display, false);
  } catch (error) {
    log.error('Failed to adapt window to display', { scope: 'window', error });
  }
}

function handleDisplayMetricsChanged(
  _event: ElectronEvent,
  display: Display,
  changedMetrics: string[],
): void {
  const win = getMainWindow();
  if (!win || !changedMetrics.some((metric) => DISPLAY_LAYOUT_METRICS.has(metric))) {
    return;
  }

  const windowDisplay = screen.getDisplayMatching(win.getBounds());
  if (windowDisplay.id !== display.id) {
    return;
  }

  applyPreferredLayoutToDisplay(win, display, isLockWindowCenter);
}

function restoreConfiguredSizeForShow(win: BrowserWindow): void {
  const currentDisplay = getCursorDisplay();
  if (!preferredWindowSizeRatio || !preferredContentScaleRatio) {
    return;
  }
  clearPendingWindowSizePersistence();
  const displaySize = getWindowSizeFromRatio(
    preferredWindowSizeRatio,
    getDisplayBounds(currentDisplay),
    currentDisplay.workArea,
  );
  win.webContents.setZoomFactor(
    getContentZoomFactor(preferredContentScaleRatio, getDisplayBounds(currentDisplay), displaySize),
  );

  try {
    const wasFullScreen = win.isFullScreen();
    const wasMaximized = win.isMaximized();
    if (wasFullScreen) {
      win.setFullScreen(false);
    }
    if (wasMaximized) {
      win.unmaximize();
    }

    const [currentWidth, currentHeight] = win.getSize();
    if (
      !wasFullScreen &&
      !wasMaximized &&
      currentWidth === displaySize.width &&
      currentHeight === displaySize.height
    ) {
      return;
    }

    suppressProgrammaticResizeNotifications(displaySize);
    win.setSize(displaySize.width, displaySize.height);
  } catch (error) {
    log.error('Failed to restore window size', {
      scope: 'window',
      size: displaySize,
      error,
    });
  }
}

function isSameWindowSize(a: WindowSize, b: WindowSize): boolean {
  return (
    Math.round(a.width) === Math.round(b.width) && Math.round(a.height) === Math.round(b.height)
  );
}

function applyWindowInteractionPolicy(win: BrowserWindow): void {
  const state = { lockWindowCenter: isLockWindowCenter, isDragDropMode };
  win.setMovable(shouldAllowWindowMovement(state));
  win.setResizable(shouldAllowWindowResize(state));
  win.setAlwaysOnTop(nativeDialogDepth === 0 && isLockWindowCenter);
  win.setVisibleOnAllWorkspaces(isLockWindowCenter, { visibleOnFullScreen: isLockWindowCenter });
}

function notifyWindowHidden(win: BrowserWindow): void {
  if (!win.webContents.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.WINDOW_HIDDEN);
  }
}

export function showMainWindow(): void {
  const win = getMainWindow() ?? createMainWindow();

  if (isLockWindowCenter) {
    restoreConfiguredSizeForShow(win);
    placeWindowOnCursorDisplay(win);
  }

  // In drag-drop mode, use app.focus to force switch to the window's desktop (macOS only)
  if (isDragDropMode) {
    app.focus({ steal: true });
  }

  win.show();
  win.focus();

  // Notify renderer that window is shown (for activeTabOnShow feature)
  win.webContents.send(IPC_CHANNELS.WINDOW_SHOWN);
}

export function hideMainWindow(): void {
  const win = getMainWindow();
  if (win) {
    win.hide();
  }
}

export function minimizeMainWindow(): void {
  const win = getMainWindow();
  if (win) {
    win.minimize();
  }
}

export function resizeMainWindowByHeightDelta(delta: number): void {
  const win = getMainWindow();
  if (!win || !Number.isFinite(delta) || Math.abs(delta) < 1) {
    return;
  }

  clearPendingWindowSizePersistence();

  const [width, height] = win.getSize();
  const currentDisplay = screen.getDisplayMatching(win.getBounds());
  const currentWorkArea = currentDisplay.workArea;
  const zoomFactor = getContentZoomFactor(
    preferredContentScaleRatio ?? getContentScaleRatio(1, getDisplayBounds(currentDisplay)),
    getDisplayBounds(currentDisplay),
    { width },
  );
  const nextSize = normalizeWindowSizeToWorkArea(
    { width, height: height + Math.round(delta * zoomFactor) },
    currentWorkArea,
  );

  if (isSameWindowSize({ width, height }, nextSize)) {
    return;
  }

  try {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    }
    if (win.isMaximized()) {
      win.unmaximize();
    }

    const sizeRatio = getWindowSizeRatio(nextSize, getDisplayBounds(currentDisplay));
    preferredWindowSizeRatio = sizeRatio;
    suppressProgrammaticResizeNotifications(nextSize);
    if (isLockWindowCenter) {
      win.setBounds(getCenteredWindowBounds(nextSize, currentWorkArea));
    } else {
      const bounds = win.getBounds();
      win.setBounds({ ...bounds, width: nextSize.width, height: nextSize.height });
    }
    win.webContents.send(IPC_CHANNELS.WINDOW_SIZE_RATIO_CHANGED, sizeRatio.width, sizeRatio.height);
  } catch (error) {
    log.error('Failed to resize window for hidden rows', {
      scope: 'window',
      delta,
      size: nextSize,
      error,
    });
  }
}

export function setWindowAutoHideSuspended(suspended: boolean): void {
  rendererModalAutoHideDepth = Math.max(0, rendererModalAutoHideDepth + (suspended ? 1 : -1));
}

export async function keepMainWindowVisibleDuringNativeDialog<T>(
  task: () => Promise<T>,
): Promise<T> {
  nativeDialogDepth += 1;
  try {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      if (nativeDialogDepth === 1) {
        win.setAlwaysOnTop(false);
      }
      win.show();
    }

    return await task();
  } finally {
    nativeDialogDepth = Math.max(0, nativeDialogDepth - 1);
    const currentWin = getMainWindow();
    if (nativeDialogDepth === 0 && currentWin && !currentWin.isDestroyed()) {
      applyWindowInteractionPolicy(currentWin);
    }
  }
}

export function setLockWindowCenter(enabled: boolean): void {
  isLockWindowCenter = enabled;
  if (enabled) {
    isDragDropMode = false;
  }
  const win = getMainWindow();
  if (win) {
    if (enabled) {
      restoreConfiguredSizeForShow(win);
      placeWindowOnCursorDisplay(win);
    }
    applyWindowInteractionPolicy(win);
  }
}

export function setDragDropMode(enabled: boolean): void {
  isDragDropMode = enabled;
  if (enabled) {
    isLockWindowCenter = false;
  }
  const win = getMainWindow();
  if (win) {
    if (isLockWindowCenter) {
      placeWindowOnCursorDisplay(win);
    }
    applyWindowInteractionPolicy(win);
  }
}
