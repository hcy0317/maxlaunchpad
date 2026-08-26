import { act, renderHook } from '@testing-library/react';

import { DEFAULT_HIDE_ELEMENTS } from '../../../shared/constants';
import { useWindowBehavior } from '../useWindowBehavior';

const mockDispatch = jest.fn();
const mockState = {
  settings: {
    hotkey: { modifiers: ['Alt'], key: '`' },
    menuRevealKey: 'Shift' as const,
    activeTabOnShow: 'lastUsed',
    activeProfilePath: 'profile.yaml',
    lockWindowCenter: true,
    launchOnStartup: true,
    startInTray: true,
    theme: 'dark' as const,
    customStyle: 'modern',
    windowSizeRatio: { width: 0.5, height: 0.5 },
    hideElements: { ...DEFAULT_HIDE_ELEMENTS },
  },
  ui: { isDragDropMode: false },
};

jest.mock('../../state/store', () => ({
  useAppState: () => mockState,
  useDispatch: () => mockDispatch,
}));

describe('useWindowBehavior', () => {
  it('stores main-process window updates as display ratios', () => {
    let ratioListener: ((width: number, height: number) => void) | undefined;
    window.electronAPI = {
      ...window.electronAPI,
      onWindowShown: jest.fn().mockReturnValue(jest.fn()),
      onWindowSizeRatioChanged: jest.fn((listener) => {
        ratioListener = listener;
        return jest.fn();
      }),
    };

    renderHook(() => useWindowBehavior());
    expect(ratioListener).toBeDefined();

    act(() => {
      ratioListener!(0.625, 0.5);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SETTINGS',
      settings: { windowSizeRatio: { width: 0.625, height: 0.5 } },
    });
  });
});
