import { beforeEach, describe, expect, it } from 'vitest';
import { getLang, onLangChange, setLang, t } from './i18n';

describe('i18n', () => {
  beforeEach(() => {
    setLang('en');
  });

  it('translates known keys in English', () => {
    expect(t('hero.title')).toBe('Compress & convert images without uploading');
    expect(t('settings.formatWebp')).toBe('WebP');
  });

  it('falls back to English when key missing in current lang', () => {
    setLang('zh');
    expect(t('brand')).toBe('picture-zip');
  });

  it('interpolates params', () => {
    expect(t('uploader.count', { count: 3, size: '5 MB' })).toBe('3 image(s) · 5 MB');
    setLang('zh');
    expect(t('uploader.count', { count: 3, size: '5 MB' })).toBe('3 张图片 · 5 MB');
  });

  it('returns the key itself when unknown', () => {
    expect(t('no.such.key')).toBe('no.such.key');
  });

  it('notifies listeners on language change', () => {
    let fired = 0;
    const off = onLangChange(() => (fired += 1));
    setLang('zh');
    setLang('en');
    expect(fired).toBe(2);
    expect(getLang()).toBe('en');
    off();
  });
});