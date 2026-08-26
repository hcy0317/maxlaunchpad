import { DEFAULT_WINDOW_SIZE, WINDOW_UI_DESIGN_WIDTH } from './constants';
import type { WindowSize, WindowSizeRatio } from './types';

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInteractionState {
  lockWindowCenter: boolean;
  isDragDropMode: boolean;
}

const MIN_WINDOW_SIZE: WindowSize = { width: 480, height: 120 };
const WINDOW_EDGE_MARGIN = 16;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return max;
  return Math.min(Math.max(Math.round(value), min), max);
}

export function shouldAllowWindowMovement(state: WindowInteractionState): boolean {
  return !state.lockWindowCenter;
}

export function shouldAllowWindowResize(state: WindowInteractionState): boolean {
  void state;
  return true;
}

export function shouldPersistWindowSize(state: WindowInteractionState): boolean {
  void state;
  return true;
}

export function constrainWindowSizeToWorkArea(
  size: WindowSize,
  workArea: Pick<WorkArea, 'width' | 'height'>,
): WindowSize {
  const availableWidth = Math.max(1, workArea.width - WINDOW_EDGE_MARGIN * 2);
  const availableHeight = Math.max(1, workArea.height - WINDOW_EDGE_MARGIN * 2);
  const minWidth = Math.min(MIN_WINDOW_SIZE.width, availableWidth);
  const minHeight = Math.min(MIN_WINDOW_SIZE.height, availableHeight);

  return {
    width: clamp(size.width, minWidth, availableWidth),
    height: clamp(size.height, minHeight, availableHeight),
  };
}

// Legacy absolute-size anchors are read once during migration and never persisted again.
export function getLegacyDisplayScaleFactor(
  scaleBasis: Pick<WorkArea, 'width' | 'height'>,
  targetWorkArea: Pick<WorkArea, 'width' | 'height'>,
): number {
  if (
    !Number.isFinite(scaleBasis.width) ||
    !Number.isFinite(scaleBasis.height) ||
    !Number.isFinite(targetWorkArea.width) ||
    !Number.isFinite(targetWorkArea.height) ||
    scaleBasis.width <= 0 ||
    scaleBasis.height <= 0 ||
    targetWorkArea.width <= 0 ||
    targetWorkArea.height <= 0
  ) {
    return 1;
  }

  return Math.min(
    targetWorkArea.width / scaleBasis.width,
    targetWorkArea.height / scaleBasis.height,
  );
}

export function getLegacyDisplayAwareWindowSize(
  size: WindowSize,
  scaleBasis: Pick<WorkArea, 'width' | 'height'>,
  targetWorkArea: Pick<WorkArea, 'width' | 'height'>,
): WindowSize {
  const basisSize = constrainWindowSizeToWorkArea(size, scaleBasis);
  const scaleFactor = getLegacyDisplayScaleFactor(scaleBasis, targetWorkArea);

  return constrainWindowSizeToWorkArea(
    {
      width: basisSize.width * scaleFactor,
      height: basisSize.height * scaleFactor,
    },
    targetWorkArea,
  );
}

export function getWindowSizeRatio(
  size: WindowSize,
  displayBounds: Pick<WorkArea, 'width' | 'height'>,
): WindowSizeRatio {
  return {
    width: size.width / Math.max(1, displayBounds.width),
    height: size.height / Math.max(1, displayBounds.height),
  };
}

export function getWindowSizeFromRatio(
  ratio: WindowSizeRatio,
  displayBounds: Pick<WorkArea, 'width' | 'height'>,
  workArea: Pick<WorkArea, 'width' | 'height'>,
): WindowSize {
  return constrainWindowSizeToWorkArea(
    {
      width: ratio.width * displayBounds.width,
      height: ratio.height * displayBounds.height,
    },
    workArea,
  );
}

export function getWindowZoomFactor(size: WindowSize): number {
  // This is a design coordinate, not persisted window state. Scaling from the actual
  // window width keeps text and icons proportional to each user-defined window ratio.
  return Math.max(0.01, size.width / WINDOW_UI_DESIGN_WIDTH);
}

function isFiniteWindowSize(size: WindowSize | null | undefined): size is WindowSize {
  return Boolean(
    size &&
      Number.isFinite(size.width) &&
      Number.isFinite(size.height) &&
      size.width > 0 &&
      size.height > 0,
  );
}

export function normalizeWindowSizeToWorkArea(
  size: WindowSize | null | undefined,
  workArea: Pick<WorkArea, 'width' | 'height'>,
): WindowSize {
  const constrainedSize = constrainWindowSizeToWorkArea(
    isFiniteWindowSize(size) ? size : DEFAULT_WINDOW_SIZE,
    workArea,
  );

  return constrainedSize;
}

export function getCenteredWindowBounds(size: WindowSize, workArea: WorkArea): WorkArea {
  const constrainedSize = normalizeWindowSizeToWorkArea(size, workArea);

  return {
    x: Math.round(workArea.x + (workArea.width - constrainedSize.width) / 2),
    y: Math.round(workArea.y + (workArea.height - constrainedSize.height) / 2),
    width: constrainedSize.width,
    height: constrainedSize.height,
  };
}

export function getCenteredWindowPosition(
  size: WindowSize,
  workArea: Pick<WorkArea, 'x' | 'y' | 'width' | 'height'>,
): Pick<WorkArea, 'x' | 'y'> {
  return {
    x: Math.round(workArea.x + (workArea.width - size.width) / 2),
    y: Math.round(workArea.y + (workArea.height - size.height) / 2),
  };
}
