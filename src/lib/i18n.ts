import en from '../i18n/en.json';
import zh from '../i18n/zh.json';

export type Lang = 'en' | 'zh';


const messages: Record<Lang, Record<string, string>> = { en, zh };

function readInitialLang(): Lang {
  if (typeof window !== 'undefined') {
    const forced = (window as unknown as { __LANG__?: string }).__LANG__;
    if (forced === 'en' || forced === 'zh') return forced;
  }
  if (typeof navigator !== 'undefined') {
    const nav = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || '';
    if (nav.toLowerCase().startsWith('zh')) return 'zh';
  }
  return 'en';
}

let currentLang: Lang = readInitialLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  if (currentLang === lang) return;
  currentLang = lang;
  for (const listener of listeners) {
    listener();
  }
}

export function onLangChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text: string = messages[currentLang][key] ?? messages.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export { formatBytes } from './format';