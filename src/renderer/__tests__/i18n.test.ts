import { getI18n, LANGUAGE_OPTIONS, normalizeLanguage } from '../i18n';

describe('i18n', () => {
  it('exposes language choices for the options dropdown', () => {
    expect(LANGUAGE_OPTIONS).toEqual([
      { value: 'zh', label: '中文' },
      { value: 'en', label: 'English' },
    ]);
  });

  it('falls back to Chinese for missing or unknown languages', () => {
    expect(normalizeLanguage(undefined)).toBe('zh');
    expect(normalizeLanguage('de' as never)).toBe('zh');
  });

  it('covers context menu, options, and hotkey modal labels in both languages', () => {
    expect(getI18n('zh').contextMenu.openFileLocation).toBe('打开文件位置');
    expect(getI18n('zh').options.language).toBe('语言：');
    expect(getI18n('zh').hotkey.currentHotkey).toBe('当前快捷键：');
    expect(getI18n('zh').hotkey.launchpadSectionTitle).toBe('唤出界面快捷键');
    expect(getI18n('zh').hotkey.menuRevealSectionTitle).toBe('呼出菜单快捷键');
    expect(getI18n('zh').topBar.hideMenu).toContain('{key}');
    expect(getI18n('zh').topBar.openProfileDialogTitle).toBe('打开键盘配置');

    expect(getI18n('en').contextMenu.openFileLocation).toBe('Open File Location');
    expect(getI18n('en').options.language).toBe('Language:');
    expect(getI18n('en').hotkey.currentHotkey).toBe('Current Hotkey:');
    expect(getI18n('en').hotkey.launchpadSectionTitle).toBe('Show Launchpad Hotkey');
    expect(getI18n('en').hotkey.menuRevealSectionTitle).toBe('Reveal Menu Hotkey');
    expect(getI18n('en').topBar.hideMenu).toContain('{key}');
    expect(getI18n('en').topBar.openProfileDialogTitle).toBe('Open Keyboard Profile');
  });
});
