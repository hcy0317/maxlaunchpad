import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CODE_TO_ACCELERATOR,
  DEFAULT_MENU_REVEAL_KEY,
  DEFAULT_MODIFIER,
  IGNORED_KEYS,
  MENU_REVEAL_KEYS,
  MODIFIER_KEYS,
  NUM_KEYS,
} from '../../../shared/constants';
import type { MenuRevealKey } from '../../../shared/types';
import { normalizeModifiers } from '../../../shared/utils';
import { getI18n } from '../../i18n';
import { IS_LINUX, IS_MAC } from '../../platform';
import { useAppState, useDispatch } from '../../state/store';
import { Modal } from '../common/Modal';

export function HotkeySettingsModal(): ReactElement {
  const state = useAppState();
  const dispatch = useDispatch();
  const i18n = getI18n(state.settings?.language);

  const modifierKeysWithLabels = useMemo(
    () =>
      MODIFIER_KEYS.map((mod) => ({
        id: mod.id,
        label: IS_MAC ? mod.macLabel : mod.winLabel,
      })),
    [],
  );

  const [modifiers, setModifiers] = useState<string[]>(() =>
    normalizeModifiers(state.settings?.hotkey.modifiers ?? [DEFAULT_MODIFIER]),
  );
  const [mainKey, setMainKey] = useState<string>(state.settings?.hotkey.key ?? '`');
  const [menuRevealKey, setMenuRevealKey] = useState<MenuRevealKey>(
    state.settings?.menuRevealKey ?? DEFAULT_MENU_REVEAL_KEY,
  );
  const [activeTabOnShow, setActiveTabOnShow] = useState<string>(
    state.settings?.activeTabOnShow ?? 'lastUsed',
  );
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (state.settings) {
      const normalized = normalizeModifiers(state.settings.hotkey.modifiers);
      setModifiers(normalized);
      setMainKey(state.settings.hotkey.key);
      setMenuRevealKey(state.settings.menuRevealKey);
      setActiveTabOnShow(state.settings.activeTabOnShow);

      const original = state.settings.hotkey.modifiers;
      if (normalized.length !== original.length || !normalized.every((m, i) => m === original[i])) {
        dispatch({
          type: 'UPDATE_SETTINGS',
          settings: {
            hotkey: { modifiers: normalized, key: state.settings.hotkey.key },
          },
        });
      }
    }
  }, [state.settings, dispatch]);

  const handleModifierChange = (modifierId: string, checked: boolean) => {
    const newModifiers = checked
      ? [...modifiers, modifierId]
      : modifiers.filter((m) => m !== modifierId);
    setModifiers(newModifiers);

    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        hotkey: { modifiers: newModifiers, key: mainKey },
      },
    });
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault();

      // Ignore modifier and lock keys
      if (IGNORED_KEYS.has(e.key)) {
        return;
      }

      // Map key code to Electron Accelerator format
      const key = CODE_TO_ACCELERATOR[e.code] ?? e.key;

      setMainKey(key);
      setIsRecording(false);

      dispatch({
        type: 'UPDATE_SETTINGS',
        settings: {
          hotkey: { modifiers, key },
        },
      });
    },
    [modifiers, dispatch],
  );

  const handleActiveTabOnShowChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActiveTabOnShow(value);

    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { activeTabOnShow: value },
    });
  };

  const handleMenuRevealKeyChange = (nextKey: MenuRevealKey) => {
    setMenuRevealKey(nextKey);

    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { menuRevealKey: nextKey },
    });
  };

  const formatModifierLabel = (modifierId: string): string => {
    const def = modifierKeysWithLabels.find((mod) => mod.id === modifierId);
    return def ? def.label : modifierId;
  };

  const launchpadHotkeyText = `${modifiers.length > 0 ? `${modifiers.map(formatModifierLabel).join('+')}+` : ''}${mainKey}`;

  return (
    <Modal title={i18n.hotkey.title}>
      <div className="modal-section">
        <h3>{i18n.hotkey.launchpadSectionTitle}</h3>
      </div>

      <div className="modal-row">
        <label>{i18n.hotkey.modifierKeys}</label>
        <div className="modifier-keys">
          {modifierKeysWithLabels.map((mod) => (
            <label key={mod.id}>
              <input
                type="checkbox"
                checked={modifiers.includes(mod.id)}
                onChange={(e) => handleModifierChange(mod.id, e.target.checked)}
              />
              {mod.label}
            </label>
          ))}
        </div>
      </div>

      <div className="modal-row">
        <label>{i18n.hotkey.key}</label>
        <input
          type="text"
          value={isRecording ? i18n.hotkey.pressAKey : mainKey}
          onFocus={() => setIsRecording(true)}
          onBlur={() => setIsRecording(false)}
          onKeyDown={handleKeyDown}
          readOnly
          placeholder={i18n.hotkey.clickToRecord}
          style={
            isRecording
              ? {
                  backgroundColor: 'var(--selected-background-color)',
                  borderColor: '#1976d2',
                  outline: 'none',
                }
              : undefined
          }
        />
      </div>

      <div className="modal-row">
        <label>{i18n.hotkey.activeTabOnShow}</label>
        <select value={activeTabOnShow} onChange={handleActiveTabOnShowChange}>
          <option value="lastUsed">{i18n.hotkey.lastUsed}</option>
          {NUM_KEYS.map((key) => (
            <option key={key} value={key}>
              {i18n.hotkey.tab} {key}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-row modal-row-highlight">
        <span style={{ fontWeight: 'bold' }}>{i18n.hotkey.currentLaunchpadHotkey}</span>
        <span style={{ fontFamily: 'monospace', fontSize: '1.1em' }}>
          {launchpadHotkeyText}
        </span>
      </div>

      <div className="modal-section">
        <h3>{i18n.hotkey.menuRevealSectionTitle}</h3>
      </div>

      <div className="modal-row">
        <label>{i18n.hotkey.menuRevealKey}</label>
        <div className="modifier-keys">
          {MENU_REVEAL_KEYS.map((key) => (
            <label key={key}>
              <input
                type="radio"
                name="menuRevealKey"
                value={key}
                checked={menuRevealKey === key}
                onChange={() => handleMenuRevealKeyChange(key)}
              />
              {formatModifierLabel(key)}
            </label>
          ))}
        </div>
      </div>

      <div className="modal-row modal-row-highlight">
        <span style={{ fontWeight: 'bold' }}>{i18n.hotkey.currentMenuRevealKey}</span>
        <span style={{ fontFamily: 'monospace', fontSize: '1.1em' }}>
          {formatModifierLabel(menuRevealKey)}
        </span>
      </div>

      <div
        className="modal-row-highlight"
        style={{ marginTop: '1em', fontSize: '0.85em', lineHeight: '1.5' }}
      >
        <p style={{ margin: 0 }}>
          {i18n.hotkey.recommendation}
          {IS_LINUX && (
            <span style={{ display: 'block', marginTop: '0.5em' }}>{i18n.hotkey.linuxNote}</span>
          )}
        </p>
      </div>

      <div className="modal-actions">
        <button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>{i18n.common.close}</button>
      </div>
    </Modal>
  );
}
