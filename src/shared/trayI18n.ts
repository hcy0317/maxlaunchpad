import type { AppLanguage, AppSettings } from './types';

interface TrayI18n {
  show: string;
  exit: string;
}

const TRAY_TRANSLATIONS: Record<AppLanguage, TrayI18n> = {
  zh: {
    show: '显示',
    exit: '退出',
  },
  en: {
    show: 'Show',
    exit: 'Exit',
  },
};

export function normalizeTrayLanguage(language: AppSettings['language'] | undefined): AppLanguage {
  return language && language in TRAY_TRANSLATIONS ? language : 'zh';
}

export function getTrayI18n(language: AppSettings['language'] | undefined): TrayI18n {
  return TRAY_TRANSLATIONS[normalizeTrayLanguage(language)];
}
