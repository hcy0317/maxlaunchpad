import type { ReactElement } from 'react';
import { useCallback, useRef, useState } from 'react';

import {
  APP_NAME,
  DEFAULT_MENU_REVEAL_KEY,
  DOCUMENTATION_URL,
  MODIFIER_KEYS,
} from '../../../shared/constants';
import type { HideElements, KeyboardProfile } from '../../../shared/types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useCloseOnWindowHide } from '../../hooks/useCloseOnWindowHide';
import { getI18n } from '../../i18n';
import { IS_MAC, IS_WINDOWS } from '../../platform';
import { useAppState, useDispatch } from '../../state/store';
import { SearchBox } from './SearchBox';

type MenuId = 'file' | 'view' | 'tools' | 'settings' | 'help' | null;

export function TopBar(): ReactElement {
  const state = useAppState();
  const dispatch = useDispatch();
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [hideSubmenuOpen, setHideSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // After loading, settings is guaranteed to be non-null
  const settings = state.settings!;
  const hideElements = settings.hideElements;
  const i18n = getI18n(settings.language);
  const t = i18n.topBar;

  // Determine if menu items should be visible
  const isMenuHidden = hideElements.menu;
  const menuRevealKey = settings.menuRevealKey ?? DEFAULT_MENU_REVEAL_KEY;
  const menuRevealKeyLabel =
    (MODIFIER_KEYS.find((mod) => mod.id === menuRevealKey)?.[IS_MAC ? 'macLabel' : 'winLabel'] ??
      menuRevealKey);
  const hideMenuLabel = t.hideMenu.replace('{key}', menuRevealKeyLabel);
  const hideMenuTitle = t.hideMenuTitle.replace('{key}', menuRevealKeyLabel);
  const shouldShowMenuItems =
    !isMenuHidden || state.ui.isMenuRevealKeyPressed || openMenu !== null;

  const closeMenu = useCallback(() => {
    setOpenMenu(null);
    setHideSubmenuOpen(false);
  }, []);
  useClickOutside(menuRef, closeMenu);
  useCloseOnWindowHide(closeMenu);

  const handleMenuClick = (menuId: MenuId) => {
    setOpenMenu(openMenu === menuId ? null : menuId);
  };

  const handleMenuHover = (menuId: MenuId) => {
    if (openMenu !== null) {
      setOpenMenu(menuId);
    }
  };

  const flushCurrentConfig = async () => {
    if (!state.settings || !state.profile) {
      return;
    }

    try {
      await window.electronAPI.saveSettings(state.settings);
      await window.electronAPI.saveProfile(state.profile, state.settings.activeProfilePath);
      dispatch({ type: 'SET_CONFIG_DIRTY', dirty: false });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: i18n.errors.saveConfigurationFailed });
      throw error;
    }
  };

  const handleNew = async () => {
    closeMenu();
    if (!state.settings) {
      return;
    }

    try {
      await flushCurrentConfig();

      const result = await window.electronAPI.saveAsDialog(t.saveProfileDialogTitle);
      if (result.canceled || !result.filePath) {
        return;
      }

      const newProfile: KeyboardProfile = { tabs: [], keys: [] };
      const newSettings = {
        ...state.settings,
        activeProfilePath: result.filePath,
      };

      await window.electronAPI.saveSettings(newSettings);
      await window.electronAPI.saveProfile(newProfile, result.filePath);

      const { profile } = await window.electronAPI.loadConfig();
      dispatch({
        type: 'SET_CONFIG',
        settings: newSettings,
        profile,
      });
    } catch {
      dispatch({ type: 'SET_ERROR', error: i18n.errors.createProfileFailed });
    }
  };

  const handleOpen = async () => {
    closeMenu();
    if (!state.settings) {
      return;
    }

    try {
      await flushCurrentConfig();

      const result = await window.electronAPI.openProfileDialog(t.openProfileDialogTitle);
      if (result.canceled || !result.filePath) {
        return;
      }

      const newSettings = {
        ...state.settings,
        activeProfilePath: result.filePath,
      };
      await window.electronAPI.saveSettings(newSettings);

      const { settings, profile } = await window.electronAPI.loadConfig();
      dispatch({ type: 'SET_CONFIG', settings, profile });
    } catch {
      dispatch({ type: 'SET_ERROR', error: i18n.errors.openProfileFailed });
    }
  };

  const handleSaveAs = async () => {
    closeMenu();
    if (!state.settings || !state.profile) {
      return;
    }

    try {
      await flushCurrentConfig();

      const result = await window.electronAPI.saveAsDialog(t.saveProfileDialogTitle);
      if (result.canceled || !result.filePath) {
        return;
      }

      await window.electronAPI.saveProfile(state.profile, result.filePath);

      const newSettings = {
        ...state.settings,
        activeProfilePath: result.filePath,
      };
      await window.electronAPI.saveSettings(newSettings);

      dispatch({
        type: 'SET_CONFIG',
        settings: newSettings,
        profile: state.profile,
      });
    } catch {
      dispatch({
        type: 'SET_ERROR',
        error: i18n.errors.saveProfileAsFailed,
      });
    }
  };

  const handleExit = () => {
    closeMenu();
    void window.electronAPI.exitApp();
  };

  const handleMinimizeWindow = () => {
    closeMenu();
    void window.electronAPI.minimizeWindow();
  };

  const handleCloseWindow = () => {
    closeMenu();
    void window.electronAPI.hideWindow();
  };

  const handleSelectDragDrop = () => {
    closeMenu();
    dispatch({ type: 'SET_DRAG_DROP_MODE', enabled: true });
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { lockWindowCenter: false },
    });
    void window.electronAPI.setDragDropMode(true);
  };

  const handleSelectLockCenter = () => {
    closeMenu();
    dispatch({ type: 'SET_DRAG_DROP_MODE', enabled: false });
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { lockWindowCenter: true },
    });
    void window.electronAPI.setLockWindowCenter(true);
  };

  const handleOpenUserApplicationsFolder = () => {
    closeMenu();
    if (IS_MAC) {
      void window.electronAPI.openPath('~/Applications');
    } else if (IS_WINDOWS) {
      void window.electronAPI.openPath('shell:programs');
    } else {
      void window.electronAPI.openPath('~/.local/share/applications');
    }
  };

  const handleOpenSystemApplicationsFolder = () => {
    closeMenu();
    if (IS_MAC) {
      void window.electronAPI.openPath('/Applications');
    } else if (IS_WINDOWS) {
      void window.electronAPI.openPath('shell:common programs');
    } else {
      void window.electronAPI.openPath('/usr/share/applications');
    }
  };

  const handleOpenMyConfigFolders = () => {
    closeMenu();
    // Open the config directory and the active profile in directory
    void window.electronAPI.openPath('myapp:configdir');
    if (state.settings?.activeProfilePath) {
      void window.electronAPI.openPath(state.settings.activeProfilePath, {
        showInFolder: true,
      });
    }
  };

  const handleHotkey = () => {
    closeMenu();
    dispatch({ type: 'OPEN_HOTKEY_SETTINGS_MODAL' });
  };

  const handleOptions = () => {
    closeMenu();
    dispatch({ type: 'OPEN_OPTIONS_MODAL' });
  };

  const handleDocumentation = () => {
    closeMenu();
    void window.electronAPI.launchProgram({
      tabId: '',
      id: '',
      label: '',
      filePath: DOCUMENTATION_URL,
    });
  };

  const handleAbout = () => {
    closeMenu();
    dispatch({ type: 'OPEN_ABOUT_MODAL' });
  };

  const handleToggleHideElement = (key: keyof HideElements) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        hideElements: {
          ...hideElements,
          [key]: !hideElements[key],
        },
      },
    });
  };

  return (
    <div className="main-menu" ref={menuRef}>
      <div className="app-title" title={APP_NAME}>
        {APP_NAME}
      </div>
      <div
        className={`topbar-menu-items${shouldShowMenuItems ? '' : ' menu-items-hidden'}`}
        aria-hidden={!shouldShowMenuItems}
      >
        {/* File menu */}
        <div
          className="menu-item"
          onClick={() => handleMenuClick('file')}
          onMouseEnter={() => handleMenuHover('file')}
        >
          {t.file}
          {openMenu === 'file' && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={handleNew}>
                {t.new}
              </div>
              <div className="dropdown-item" onClick={handleOpen}>
                {t.open}
              </div>
              <div className="dropdown-item" onClick={handleSaveAs}>
                {t.saveAs}
              </div>
              <div className="context-menu-separator" />
              <div className="dropdown-item" onClick={handleExit}>
                {t.exit}
              </div>
            </div>
          )}
        </div>

        {/* View menu */}
        <div
          className="menu-item"
          onClick={() => handleMenuClick('view')}
          onMouseEnter={() => handleMenuHover('view')}
        >
          {t.view}
          {openMenu === 'view' && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={handleSelectDragDrop} title={t.dragDropTitle}>
                <span className="menu-check">{state.ui.isDragDropMode ? '✓' : ''}</span>
                {t.dragDropMode}
              </div>
              <div
                className="dropdown-item"
                onClick={handleSelectLockCenter}
                title={t.lockCenterTitle}
              >
                <span className="menu-check">{state.settings?.lockWindowCenter ? '✓' : ''}</span>
                {t.lockWindowCenter}
              </div>
              <div className="context-menu-separator" />
              {/* Hide Elements submenu */}
              <div
                className="dropdown-item dropdown-submenu"
                onMouseEnter={() => setHideSubmenuOpen(true)}
                onMouseLeave={() => setHideSubmenuOpen(false)}
              >
                <span className="menu-check"></span>
                {t.hideElements}
                <span className="submenu-arrow">▸</span>
                {hideSubmenuOpen && (
                  <div className="dropdown-menu submenu">
                    <div
                      className="dropdown-item"
                      onClick={() => handleToggleHideElement('menu')}
                      title={hideMenuTitle}
                    >
                      <span className="menu-check">{hideElements.menu ? '✓' : ''}</span>
                      {hideMenuLabel}
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleToggleHideElement('buttonIcons')}
                      title={t.buttonIconsTitle}
                    >
                      <span className="menu-check">{hideElements.buttonIcons ? '✓' : ''}</span>
                      {t.buttonIcons}
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleToggleHideElement('buttonText')}
                      title={t.buttonTextTitle}
                    >
                      <span className="menu-check">{hideElements.buttonText ? '✓' : ''}</span>
                      {t.buttonText}
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleToggleHideElement('emptyButtons')}
                      title={t.emptyButtonsTitle}
                    >
                      <span className="menu-check">{hideElements.emptyButtons ? '✓' : ''}</span>
                      {t.emptyButtons}
                    </div>
                    <div className="context-menu-separator" />
                    <div
                      className="dropdown-item"
                      onClick={() => handleToggleHideElement('rowF')}
                      title={t.rowFTitle}
                    >
                      <span className="menu-check">{hideElements.rowF ? '✓' : ''}</span>
                      {t.rowF}
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleToggleHideElement('row1')}
                      title={t.row1Title}
                    >
                      <span className="menu-check">{hideElements.row1 ? '✓' : ''}</span>
                      {t.row1}
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleToggleHideElement('row2')}
                      title={t.row2Title}
                    >
                      <span className="menu-check">{hideElements.row2 ? '✓' : ''}</span>
                      {t.row2}
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleToggleHideElement('row3')}
                      title={t.row3Title}
                    >
                      <span className="menu-check">{hideElements.row3 ? '✓' : ''}</span>
                      {t.row3}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tools menu - platform-specific */}
        <div
          className="menu-item"
          onClick={() => handleMenuClick('tools')}
          onMouseEnter={() => handleMenuHover('tools')}
        >
          {t.tools}
          {openMenu === 'tools' && (
            <div className="dropdown-menu">
              {(() => {
                const labels = IS_MAC
                  ? {
                      user: t.openApplicationsFolderUser,
                      system: t.openApplicationsFolderSystem,
                    }
                  : IS_WINDOWS
                    ? {
                        user: t.openStartMenuUser,
                        system: t.openStartMenuSystem,
                      }
                    : {
                        user: t.openApplicationsDirectoryUser,
                        system: t.openApplicationsDirectorySystem,
                      };
                return (
                  <>
                    <div className="dropdown-item" onClick={handleOpenUserApplicationsFolder}>
                      {labels.user}
                    </div>
                    <div className="dropdown-item" onClick={handleOpenSystemApplicationsFolder}>
                      {labels.system}
                    </div>
                  </>
                );
              })()}
              <div className="context-menu-separator" />
              <div className="dropdown-item" onClick={handleOpenMyConfigFolders}>
                {t.openConfigFolders}
              </div>
            </div>
          )}
        </div>

        {/* Settings menu */}
        <div
          className="menu-item"
          onClick={() => handleMenuClick('settings')}
          onMouseEnter={() => handleMenuHover('settings')}
        >
          {t.settings}
          {openMenu === 'settings' && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={handleHotkey}>
                {t.hotkey}
              </div>
              <div className="dropdown-item" onClick={handleOptions}>
                {t.options}
              </div>
            </div>
          )}
        </div>

        {/* Help menu */}
        <div
          className="menu-item"
          onClick={() => handleMenuClick('help')}
          onMouseEnter={() => handleMenuHover('help')}
        >
          {t.help}
          {openMenu === 'help' && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={handleDocumentation}>
                {t.documentation}
              </div>
              <div className="dropdown-item" onClick={handleAbout}>
                {t.about} {APP_NAME}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search box */}
      <SearchBox />
      <div className="window-controls" aria-label={APP_NAME}>
        <button
          type="button"
          className="window-control minimize"
          aria-label={t.minimizeWindow}
          title={t.minimizeWindow}
          onClick={handleMinimizeWindow}
        >
          <span aria-hidden="true">-</span>
        </button>
        <button
          type="button"
          className="window-control close"
          aria-label={t.closeWindow}
          title={t.closeWindow}
          onClick={handleCloseWindow}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
