import { DEFAULT_WINDOW_SIZE } from './constants';
import type { WindowSize } from './types';

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

export function getDisplayScaleFactor(
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

export function getDisplayAwareWindowSize(
  size: WindowSize,
  scaleBasis: Pick<WorkArea, 'width' | 'height'>,
  targetWorkArea: Pick<WorkArea, 'width' | 'height'>,
): WindowSize {
  const basisSize = constrainWindowSizeToWorkArea(size, scaleBasis);
  const scaleFactor = getDisplayScaleFactor(scaleBasis, targetWorkArea);

  return constrainWindowSizeToWorkArea(
    {
      width: basisSize.width * scaleFactor,
      height: basisSize.height * scaleFactor,
    },
    targetWorkArea,
  );
}

export function getWindowSizeInScaleBasis(
  size: WindowSize,
  scaleBasis: Pick<WorkArea, 'width' | 'height'>,
  currentWorkArea: Pick<WorkArea, 'width' | 'height'>,
): WindowSize {
  const scaleFactor = getDisplayScaleFactor(scaleBasis, currentWorkArea);

  return constrainWindowSizeToWorkArea(
    {
      width: size.width / scaleFactor,
      height: size.height / scaleFactor,
    },
    scaleBasis,
  );
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
