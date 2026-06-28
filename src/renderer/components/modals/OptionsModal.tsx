import type { ChangeEvent, FocusEvent, ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { AppLanguage } from '../../../shared/types';
import { getI18n, LANGUAGE_OPTIONS } from '../../i18n';
import { useAppState, useDispatch } from '../../state/store';
import { Modal } from '../common/Modal';

export function OptionsModal(): ReactElement {
  const state = useAppState();
  const dispatch = useDispatch();

  const [launchOnStartup, setLaunchOnStartup] = useState(state.settings?.launchOnStartup ?? false);
  const [startInTray, setStartInTray] = useState(state.settings?.startInTray ?? false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    state.settings?.theme ?? 'system',
  );
  const [language, setLanguage] = useState<AppLanguage>(state.settings?.language ?? 'zh');
  const [customStyle, setCustomStyle] = useState<string>(state.settings?.customStyle ?? 'default');
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const cleanupLanguageSelectRef = useRef<(() => void) | null>(null);
  const lastCommittedLanguageRef = useRef<AppLanguage>(state.settings?.language ?? 'zh');
  const i18n = getI18n(language);

  useEffect(() => {
    if (state.settings) {
      setLaunchOnStartup(state.settings.launchOnStartup);
      setStartInTray(state.settings.startInTray);
      setTheme(state.settings.theme);
      setLanguage(state.settings.language);
      lastCommittedLanguageRef.current = state.settings.language;
      setCustomStyle(state.settings.customStyle);
    }
  }, [state.settings]);

  useEffect(() => {
    async function loadStyles() {
      try {
        const { styles } = await window.electronAPI.listStyles();
        // Sort styles: 'default' first, then alphabetically
        const sortedStyles = [...styles].sort((a, b) => {
          if (a === 'default') return -1;
          if (b === 'default') return 1;
          return a.localeCompare(b);
        });
        setAvailableStyles(sortedStyles);
      } catch (error) {
        const message =
          error instanceof Error
            ? `${i18n.options.loadStylesFailed}: ${error.message}`
            : i18n.options.loadStylesFailed;
        dispatch({ type: 'SET_ERROR', error: message });
      }
    }
    void loadStyles();
  }, [dispatch, i18n.options.loadStylesFailed]);

  const handleLaunchOnStartupChange = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setLaunchOnStartup(checked);
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { launchOnStartup: checked },
    });
  };

  const handleStartInTrayChange = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setStartInTray(checked);
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { startInTray: checked },
    });
  };

  const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'light' | 'dark' | 'system';
    setTheme(value);
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { theme: value },
    });
  };

  const commitLanguage = useCallback((value: AppLanguage) => {
    if (lastCommittedLanguageRef.current === value) {
      return;
    }
    lastCommittedLanguageRef.current = value;

    flushSync(() => {
      setLanguage(value);
      dispatch({
        type: 'UPDATE_SETTINGS',
        settings: { language: value },
      });
    });
  }, [dispatch]);

  const setLanguageSelectRef = useCallback((select: HTMLSelectElement | null) => {
    cleanupLanguageSelectRef.current?.();
    cleanupLanguageSelectRef.current = null;

    if (!select) {
      return;
    }

    const handleNativeLanguageCommit = () => {
      const nextLanguage = select.value as AppLanguage;
      commitLanguage(nextLanguage);
      window.setTimeout(() => {
        commitLanguage(nextLanguage);
      }, 0);
    };

    select.addEventListener('input', handleNativeLanguageCommit);
    select.addEventListener('change', handleNativeLanguageCommit);
    select.addEventListener('blur', handleNativeLanguageCommit);
    cleanupLanguageSelectRef.current = () => {
      select.removeEventListener('input', handleNativeLanguageCommit);
      select.removeEventListener('change', handleNativeLanguageCommit);
      select.removeEventListener('blur', handleNativeLanguageCommit);
    };
  }, [commitLanguage]);

  useEffect(() => {
    return () => {
      cleanupLanguageSelectRef.current?.();
      cleanupLanguageSelectRef.current = null;
    };
  }, []);

  const handleLanguageChange = (
    e: ChangeEvent<HTMLSelectElement> | FocusEvent<HTMLSelectElement>,
  ) => {
    commitLanguage(e.currentTarget.value as AppLanguage);
  };

  const handleCustomStyleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCustomStyle(value);
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { customStyle: value },
    });
  };

  return (
    <Modal title={i18n.options.title}>
      <div className="modal-row">
        <div className="modifier-keys">
          <label>
            <input
              type="checkbox"
              checked={launchOnStartup}
              onChange={handleLaunchOnStartupChange}
            />
            {i18n.options.launchOnStartup}
          </label>
        </div>
      </div>

      <div className="modal-row">
        <div className="modifier-keys">
          <label>
            <input type="checkbox" checked={startInTray} onChange={handleStartInTrayChange} />
            {i18n.options.startInTray}
          </label>
        </div>
      </div>

      <div className="modal-row">
        <label>{i18n.options.language}</label>
        <select
          ref={setLanguageSelectRef}
          value={language}
          onBlur={handleLanguageChange}
          onChange={handleLanguageChange}
          onInput={handleLanguageChange}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-row">
        <label>{i18n.options.theme}</label>
        <select value={theme} onChange={handleThemeChange}>
          <option value="system">{i18n.options.themeSystem}</option>
          <option value="light">{i18n.options.themeLight}</option>
          <option value="dark">{i18n.options.themeDark}</option>
        </select>
      </div>

      <div className="modal-row">
        <label>{i18n.options.customStyle}</label>
        <select value={customStyle} onChange={handleCustomStyleChange}>
          {availableStyles.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-actions">
        <button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>{i18n.common.close}</button>
      </div>
    </Modal>
  );
}
