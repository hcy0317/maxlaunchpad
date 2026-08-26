import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AppLanguage } from '../../../shared/types';
import { useAppState, useDispatch } from '../../state/store';
import { Modal } from '../common/Modal';

export function OptionsModal(): ReactElement {
  const { i18n, t } = useTranslation();
  const state = useAppState();
  const dispatch = useDispatch();

  const [launchOnStartup, setLaunchOnStartup] = useState(state.settings?.launchOnStartup ?? false);
  const [startInTray, setStartInTray] = useState(state.settings?.startInTray ?? false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    state.settings?.theme ?? 'system',
  );
  const [customStyle, setCustomStyle] = useState<string>(state.settings?.customStyle ?? 'default');
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [fontFamily, setFontFamily] = useState<string>(state.settings?.fontFamily ?? '');
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);
  const [fontLoadState, setFontLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>(
    'loading',
  );

  useEffect(() => {
    if (state.settings) {
      setLaunchOnStartup(state.settings.launchOnStartup);
      setStartInTray(state.settings.startInTray);
      setTheme(state.settings.theme);
      setCustomStyle(state.settings.customStyle);
      setFontFamily(state.settings.fontFamily ?? '');
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
            ? t('errors.failedToLoadStylesWithMessage', { message: error.message })
            : t('errors.failedToLoadStyles');
        dispatch({ type: 'SET_ERROR', error: message });
      }
    }
    void loadStyles();
  }, [dispatch, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadFonts() {
      setFontLoadState('loading');
      try {
        const { fonts } = await window.electronAPI.listSystemFonts();
        if (cancelled) return;
        const sortedFonts = [...new Set(fonts.map((font) => font.trim()).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b),
        );
        setAvailableFonts(sortedFonts);
        setFontLoadState(sortedFonts.length > 0 ? 'ready' : 'empty');
      } catch {
        if (!cancelled) {
          setAvailableFonts([]);
          setFontLoadState('error');
        }
      }
    }

    void loadFonts();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleCustomStyleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCustomStyle(value);
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { customStyle: value },
    });
  };

  const handleFontFamilyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFontFamily(value);
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { fontFamily: value },
    });
  };

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as AppLanguage;
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { language: value },
    });
    void i18n.changeLanguage(value);
  };

  const currentLanguage = i18n.resolvedLanguage?.startsWith('zh') ? 'zh-CN' : 'en';

  return (
    <Modal title={t('modals.options.title')}>
      <div className="modal-row">
        <div className="modifier-keys">
          <label>
            <input
              type="checkbox"
              checked={launchOnStartup}
              onChange={handleLaunchOnStartupChange}
            />
            {t('modals.options.launchOnStartup')}
          </label>
        </div>
      </div>

      <div className="modal-row">
        <div className="modifier-keys">
          <label>
            <input type="checkbox" checked={startInTray} onChange={handleStartInTrayChange} />
            {t('modals.options.startInTray')}
          </label>
        </div>
      </div>

      <div className="modal-row">
        <label>{t('modals.options.theme')}:</label>
        <select value={theme} onChange={handleThemeChange}>
          <option value="system">{t('modals.options.themeSystem')}</option>
          <option value="light">{t('modals.options.themeLight')}</option>
          <option value="dark">{t('modals.options.themeDark')}</option>
        </select>
      </div>

      <div className="modal-row">
        <label>{t('modals.options.customStyle')}:</label>
        <select value={customStyle} onChange={handleCustomStyleChange}>
          {availableStyles.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-row modal-row-font">
        <label htmlFor="system-font-family">{t('modals.options.font')}:</label>
        <div className="modal-field">
          <select
            id="system-font-family"
            value={fontFamily}
            onChange={handleFontFamilyChange}
            disabled={fontLoadState === 'loading'}
            aria-describedby={fontLoadState === 'ready' ? undefined : 'system-font-status'}
            style={fontFamily ? { fontFamily } : undefined}
          >
            <option value="">{t('modals.options.fontSystem')}</option>
            {fontFamily && !availableFonts.includes(fontFamily) && (
              <option value={fontFamily}>{fontFamily}</option>
            )}
            {availableFonts.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
          {fontLoadState === 'loading' && (
            <span id="system-font-status" className="modal-field-status" role="status">
              {t('modals.options.fontLoading')}
            </span>
          )}
          {fontLoadState === 'empty' && (
            <span id="system-font-status" className="modal-field-status" role="status">
              {t('modals.options.fontEmpty')}
            </span>
          )}
          {fontLoadState === 'error' && (
            <span id="system-font-status" className="modal-field-status error" role="alert">
              {t('modals.options.fontLoadFailed')}
            </span>
          )}
        </div>
      </div>

      <div className="modal-row">
        <label>{t('modals.options.language')}:</label>
        <select value={currentLanguage} onChange={handleLanguageChange}>
          <option value="zh-CN">中文</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="modal-actions">
        <button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>
          {t('modals.common.close')}
        </button>
      </div>
    </Modal>
  );
}
