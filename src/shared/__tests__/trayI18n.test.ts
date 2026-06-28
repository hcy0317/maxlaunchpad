import { getTrayI18n, normalizeTrayLanguage } from '../trayI18n';

describe('trayI18n', () => {
  it('localizes tray context menu labels', () => {
    expect(getTrayI18n('zh')).toEqual({
      show: '显示',
      exit: '退出',
    });
    expect(getTrayI18n('en')).toEqual({
      show: 'Show',
      exit: 'Exit',
    });
  });

  it('falls back to Chinese for missing or unknown languages', () => {
    expect(normalizeTrayLanguage(undefined)).toBe('zh');
    expect(normalizeTrayLanguage('de' as never)).toBe('zh');
  });
});
