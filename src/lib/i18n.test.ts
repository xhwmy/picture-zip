import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLang, onLangChange, setLang, t, readInitialLang } from './i18n';

describe('i18n', () => {
  beforeEach(() => {
    setLang('en');
    try { localStorage.removeItem('pz-lang-pref'); } catch { /* ignore */ }
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

describe('readInitialLang', () => {
  beforeEach(() => {
    try { localStorage.removeItem('pz-lang-pref'); } catch { /* ignore */ }
  });

  it('returns zh when localStorage pref is zh', () => {
    localStorage.setItem('pz-lang-pref', 'zh');
    expect(readInitialLang()).toBe('zh');
  });

  it('returns en when localStorage pref is en', () => {
    localStorage.setItem('pz-lang-pref', 'en');
    expect(readInitialLang()).toBe('en');
  });

  it('ignores invalid localStorage pref and falls through', () => {
    localStorage.setItem('pz-lang-pref', 'fr');
    vi.stubGlobal('navigator', { language: 'en-US' });
    vi.stubGlobal('location', { pathname: '/' });
    expect(readInitialLang()).toBe('en');
    vi.unstubAllGlobals();
  });

  it('returns zh when URL path starts with /zh and no localStorage', () => {
    vi.stubGlobal('location', { pathname: '/zh/' });
    vi.stubGlobal('navigator', { language: 'en-US' });
    expect(readInitialLang()).toBe('zh');
    vi.unstubAllGlobals();
  });

  it('returns zh when URL path is /zh/compress-to-100kb', () => {
    vi.stubGlobal('location', { pathname: '/zh/compress-to-100kb' });
    vi.stubGlobal('navigator', { language: 'en-US' });
    expect(readInitialLang()).toBe('zh');
    vi.unstubAllGlobals();
  });

  it('localStorage takes priority over URL path', () => {
    localStorage.setItem('pz-lang-pref', 'en');
    vi.stubGlobal('location', { pathname: '/zh/' });
    vi.stubGlobal('navigator', { language: 'zh-CN' });
    expect(readInitialLang()).toBe('en');
    vi.unstubAllGlobals();
  });

  it('URL path takes priority over navigator.language', () => {
    vi.stubGlobal('location', { pathname: '/zh/' });
    vi.stubGlobal('navigator', { language: 'en-US' });
    expect(readInitialLang()).toBe('zh');
    vi.unstubAllGlobals();
  });

  it('falls back to navigator.language when no localStorage and URL is /', () => {
    vi.stubGlobal('location', { pathname: '/' });
    vi.stubGlobal('navigator', { language: 'zh-CN' });
    expect(readInitialLang()).toBe('zh');
    vi.unstubAllGlobals();
  });

  it('returns en when no localStorage, URL is /, and navigator is en-US', () => {
    vi.stubGlobal('location', { pathname: '/' });
    vi.stubGlobal('navigator', { language: 'en-US' });
    expect(readInitialLang()).toBe('en');
    vi.unstubAllGlobals();
  });

  it('returns en as default when nothing matches', () => {
    vi.stubGlobal('location', { pathname: '/' });
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    expect(readInitialLang()).toBe('en');
    vi.unstubAllGlobals();
  });
});