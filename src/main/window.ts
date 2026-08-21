import type { Display, Event as ElectronEvent } from 'electron';
import { app, BrowserWindow, screen } from 'electron';

import { APP_NAME } from '../shared/constants';
import { IPC_CHANNELS } from '../shared/ipcChannels';
import type { WindowSize } from '../shared/types';
import {
  getCenteredWindowBounds,
  getDisplayAwareWindowSize,
  getDisplayScaleFactor,
  getWindowSizeInScaleBasis,
  normalizeWindowSizeToWorkArea,
  shouldAllowWindowMovement,
  shouldAllowWindowResize,
} from '../shared/windowBehavior';
import { loadSettings, saveSettings } from './configStore';
import log from './logger';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;
let isLockWindowCenter = false;
let isDragDropMode = false;
let nativeDialogDepth = 0;
let rendererModalAutoHideDepth = 0;
let preferredWindowSize: WindowSize | null = null;
let windowScaleBasis: WindowSize | null = null;
let lastProgrammaticResizeSize: WindowSize | null = null;
let isManualWindowResize = false;
let resizePersistenceTimer: ReturnType<typeof setTimeout> | null = null;

const DISPLAY_LAYOUT_METRICS = new Set(['bounds', 'workArea', 'scaleFactor']);

function getCursorDisplayWorkArea() {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
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

function suppressProgrammaticResizeNotifications(size?: WindowSize): void {
  if (size) {
    lastProgrammaticResizeSize = size;
  }
}

function clearPendingWindowSizePersistence(): void {
  if (resizePersistenceTimer) {
    clearTimeout(resizePersistenceTimer);
    resizePersistenceTimer = null;
  }
}

function persistCurrentWindowSize(win: BrowserWindow): void {
  const [width, height] = win.getSize();
  const currentSize = { width, height };
  if (lastProgrammaticResizeSize && isSameWindowSize(currentSize, lastProgrammaticResizeSize)) {
    return;
  }
  lastProgrammaticResizeSize = null;

  const currentWorkArea = screen.getDisplayMatching(win.getBounds()).workArea;
  const normalizedSize = normalizeWindowSizeToWorkArea(currentSize, currentWorkArea, {
    resetWorkAreaFill: isLockWindowCenter,
  });
  const sizeInScaleBasis = windowScaleBasis
    ? getWindowSizeInScaleBasis(normalizedSize, windowScaleBasis, currentWorkArea)
    : normalizedSize;

  if (!isSameWindowSize(currentSize, normalizedSize) && !isLockWindowCenter) {
    return;
  }

  preferredWindowSize = sizeInScaleBasis;
  win.webContents.send(
    IPC_CHANNELS.WINDOW_RESIZED,
    sizeInScaleBasis.width,
    sizeInScaleBasis.height,
  );
}

function scheduleWindowSizePersistence(win: BrowserWindow): void {
  clearPendingWindowSizePersistence();
  resizePersistenceTimer = setTimeout(() => {
    resizePersistenceTimer = null;
    if (getMainWindow() === win) {
      persistCurrentWindowSize(win);
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

  const currentWorkArea = getCursorDisplayWorkArea();
  const savedScaleBasis = settings.windowScaleBasis;
  const hasValidScaleBasis = isValidWindowScaleBasis(savedScaleBasis);
  const resolvedScaleBasis = hasValidScaleBasis
    ? savedScaleBasis
    : { width: currentWorkArea.width, height: currentWorkArea.height };
  windowScaleBasis = resolvedScaleBasis;
  preferredWindowSize = normalizeWindowSizeToWorkArea(settings.windowSize, resolvedScaleBasis, {
    resetWorkAreaFill: settings.lockWindowCenter,
  });
  if (!hasValidScaleBasis || !isSameWindowSize(settings.windowSize, preferredWindowSize)) {
    saveSettings({
      ...settings,
      windowSize: preferredWindowSize,
      windowScaleBasis: resolvedScaleBasis,
    });
  }
  const initialWindowSize = getDisplayAwareWindowSize(
    preferredWindowSize,
    resolvedScaleBasis,
    currentWorkArea,
  );
  const initialZoomFactor = getDisplayScaleFactor(resolvedScaleBasis, currentWorkArea);

  mainWindow = new BrowserWindow({
    width: initialWindowSize.width,
    height: initialWindowSize.height,
    center: true,
    resizable: true,
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
    preferredWindowSize = null;
    windowScaleBasis = null;
    lastProgrammaticResizeSize = null;
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
        persistCurrentWindowSize(mainWindow);
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
    isManualWindowResize = true;
  });

  mainWindow.on('resized', () => {
    isManualWindowResize = false;
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
    const currentWorkArea = getCursorDisplayWorkArea();
    applyPreferredLayoutToWorkArea(win, currentWorkArea, true);
  } catch (error) {
    log.error('Failed to center window', { scope: 'window', error });
  }
}

function applyPreferredLayoutToWorkArea(
  win: BrowserWindow,
  workArea: Display['workArea'],
  centered: boolean,
): void {
  if (!preferredWindowSize || !windowScaleBasis) {
    return;
  }

  clearPendingWindowSizePersistence();
  const displaySize = getDisplayAwareWindowSize(preferredWindowSize, windowScaleBasis, workArea);
  win.webContents.setZoomFactor(getDisplayScaleFactor(windowScaleBasis, workArea));
  const currentBounds = win.getBounds();
  const bounds = centered
    ? getCenteredWindowBounds(displaySize, workArea)
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
    applyPreferredLayoutToWorkArea(win, display.workArea, false);
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

  applyPreferredLayoutToWorkArea(win, display.workArea, isLockWindowCenter);
}

function restoreConfiguredSizeForShow(win: BrowserWindow): void {
  const currentWorkArea = getCursorDisplayWorkArea();
  if (!preferredWindowSize || !windowScaleBasis) {
    return;
  }
  clearPendingWindowSizePersistence();
  const displaySize = getDisplayAwareWindowSize(
    preferredWindowSize,
    windowScaleBasis,
    currentWorkArea,
  );
  win.webContents.setZoomFactor(getDisplayScaleFactor(windowScaleBasis, currentWorkArea));

  const [currentWidth, currentHeight] = win.getSize();
  if (currentWidth === displaySize.width && currentHeight === displaySize.height) {
    return;
  }

  try {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    }
    if (win.isMaximized()) {
      win.unmaximize();
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
  const currentWorkArea = screen.getDisplayMatching(win.getBounds()).workArea;
  const displayScale = windowScaleBasis
    ? getDisplayScaleFactor(windowScaleBasis, currentWorkArea)
    : 1;
  const nextSize = normalizeWindowSizeToWorkArea(
    { width, height: height + Math.round(delta * displayScale) },
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

    const sizeInScaleBasis = windowScaleBasis
      ? getWindowSizeInScaleBasis(nextSize, windowScaleBasis, currentWorkArea)
      : nextSize;
    preferredWindowSize = sizeInScaleBasis;
    suppressProgrammaticResizeNotifications(nextSize);
    if (isLockWindowCenter) {
      win.setBounds(getCenteredWindowBounds(nextSize, currentWorkArea));
    } else {
      const bounds = win.getBounds();
      win.setBounds({ ...bounds, width: nextSize.width, height: nextSize.height });
    }
    win.webContents.send(
      IPC_CHANNELS.WINDOW_RESIZED,
      sizeInScaleBasis.width,
      sizeInScaleBasis.height,
    );
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
