import { fireEvent, render, screen } from '@testing-library/react';

import { DEFAULT_HIDE_ELEMENTS } from '../../../../shared/constants';
import type { AppSettings, KeyboardProfile } from '../../../../shared/types';
import { HotkeySettingsModal } from '../HotkeySettingsModal';

const dispatchMock = jest.fn();

const settings: AppSettings = {
  hotkey: { modifiers: ['Alt'], key: '`' },
  menuRevealKey: 'Alt',
  activeTabOnShow: 'lastUsed',
  activeProfilePath: 'C:\\Users\\hcy\\.config\\MaxLaunchpad\\keyboard.yaml',
  lockWindowCenter: true,
  launchOnStartup: true,
  startInTray: false,
  theme: 'dark',
  language: 'zh',
  customStyle: 'modern',
  windowSize: { width: 1000, height: 600 },
  hideElements: { ...DEFAULT_HIDE_ELEMENTS },
};

const profile: KeyboardProfile = {
  tabs: [],
  keys: [],
};

jest.mock('../../../state/store', () => ({
  useAppState: () => ({
    settings,
    profile,
    ui: {
      activeTabId: '1',
      searchQuery: '',
      isDragDropMode: false,
      isMenuRevealKeyPressed: false,
      isConfigDirty: false,
      isLoading: false,
      error: null,
      modal: { type: 'hotkey-settings' },
      clipboardKey: null,
    },
  }),
  useDispatch: () => dispatchMock,
}));

describe('HotkeySettingsModal', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    settings.language = 'zh';
    settings.hotkey = { modifiers: ['Alt'], key: '`' };
    settings.menuRevealKey = 'Alt';
    window.electronAPI = {
      ...window.electronAPI,
      setWindowAutoHideSuspended: jest.fn(),
    };
  });

  it('separates launchpad and menu reveal hotkey sections', () => {
    const { container } = render(<HotkeySettingsModal />);

    const sectionTitles = Array.from(container.querySelectorAll('.modal-section h3')).map(
      (heading) => heading.textContent?.trim(),
    );

    expect(sectionTitles).toEqual(['唤出界面快捷键', '呼出菜单快捷键']);
    expect(screen.getByText('当前唤出界面快捷键：')).toBeInTheDocument();
    expect(screen.getByText('当前呼出菜单快捷键：')).toBeInTheDocument();
  });

  it('limits the menu reveal key choices to modifiers and saves the selected key', () => {
    render(<HotkeySettingsModal />);

    const revealSection = screen.getByText('临时显示隐藏菜单：').closest('.modal-row');
    const radioLabels = Array.from(revealSection!.querySelectorAll('.modifier-keys label')).map(
      (label) => label.textContent?.trim(),
    );

    expect(radioLabels).toEqual(['Ctrl', 'Shift', 'Alt', 'Win']);

    fireEvent.click(screen.getByRole('radio', { name: 'Win' }));

    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'UPDATE_SETTINGS',
      settings: { menuRevealKey: 'Win' },
    });
  });
});
