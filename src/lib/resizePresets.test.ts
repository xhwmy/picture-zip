import { describe, expect, it } from 'vitest';
import { RESIZE_PRESETS, RESIZE_PRESET_CATEGORIES } from './resizePresets';
import en from '../i18n/en.json';
import zh from '../i18n/zh.json';

describe('resizePresets', () => {
  it('RESIZE_PRESETS 包含 12 项（11 预设 + 1 custom）', () => {
    expect(RESIZE_PRESETS).toHaveLength(12);
    expect(RESIZE_PRESETS.filter((p) => p.id !== 'custom')).toHaveLength(11);
  });

  it('custom 项存在且唯一，maxWidth/maxHeight 为 undefined', () => {
    const customs = RESIZE_PRESETS.filter((p) => p.id === 'custom');
    expect(customs).toHaveLength(1);
    expect(customs[0].maxWidth).toBeUndefined();
    expect(customs[0].maxHeight).toBeUndefined();
    expect(customs[0].category).toBe('custom');
  });

  it('所有非 custom 项的 id 唯一', () => {
    const nonCustom = RESIZE_PRESETS.filter((p) => p.id !== 'custom');
    const ids = nonCustom.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('所有非 custom 项的 maxWidth/maxHeight 为正整数且在 1–10000 范围内', () => {
    const nonCustom = RESIZE_PRESETS.filter((p) => p.id !== 'custom');
    for (const p of nonCustom) {
      expect(p.maxWidth).toBeTypeOf('number');
      expect(p.maxHeight).toBeTypeOf('number');
      expect(p.maxWidth!).toBeGreaterThanOrEqual(1);
      expect(p.maxWidth!).toBeLessThanOrEqual(10000);
      expect(p.maxHeight!).toBeGreaterThanOrEqual(1);
      expect(p.maxHeight!).toBeLessThanOrEqual(10000);
      expect(Number.isInteger(p.maxWidth!)).toBe(true);
      expect(Number.isInteger(p.maxHeight!)).toBe(true);
    }
  });

  it('所有项的 labelKey 以 settings.resizePreset 开头', () => {
    for (const p of RESIZE_PRESETS) {
      expect(p.labelKey.startsWith('settings.resizePreset')).toBe(true);
    }
  });

  it('RESIZE_PRESET_CATEGORIES 包含 5 项且 id 唯一', () => {
    expect(RESIZE_PRESET_CATEGORIES).toHaveLength(5);
    const ids = RESIZE_PRESET_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每个非 custom 预设的 category 在 RESIZE_PRESET_CATEGORIES 中存在', () => {
    const catIds = new Set(RESIZE_PRESET_CATEGORIES.map((c) => c.id));
    const nonCustom = RESIZE_PRESETS.filter((p) => p.id !== 'custom');
    for (const p of nonCustom) {
      expect(catIds.has(p.category)).toBe(true);
    }
  });

  it('11 个预设项的宽高值与 spec 一致', () => {
    const find = (id: string) => RESIZE_PRESETS.find((p) => p.id === id)!;
    expect(find('web_banner')).toMatchObject({ maxWidth: 1920, maxHeight: 1080 });
    expect(find('desktop_thumb')).toMatchObject({ maxWidth: 1280, maxHeight: 720 });
    expect(find('social_square')).toMatchObject({ maxWidth: 1080, maxHeight: 1080 });
    expect(find('social_portrait')).toMatchObject({ maxWidth: 1080, maxHeight: 1350 });
    expect(find('social_landscape')).toMatchObject({ maxWidth: 1200, maxHeight: 630 });
    expect(find('twitter_card')).toMatchObject({ maxWidth: 1200, maxHeight: 675 });
    expect(find('ecommerce_main')).toMatchObject({ maxWidth: 800, maxHeight: 800 });
    expect(find('thumbnail')).toMatchObject({ maxWidth: 300, maxHeight: 300 });
    expect(find('avatar')).toMatchObject({ maxWidth: 512, maxHeight: 512 });
    expect(find('id_photo_1inch')).toMatchObject({ maxWidth: 295, maxHeight: 413 });
    expect(find('id_photo_2inch')).toMatchObject({ maxWidth: 413, maxHeight: 579 });
  });

  it('en.json 与 zh.json 中所有 labelKey 键一一对应无缺键', () => {
    const enKeys = new Set(Object.keys(en));
    const zhKeys = new Set(Object.keys(zh));
    for (const p of RESIZE_PRESETS) {
      expect(enKeys.has(p.labelKey)).toBe(true);
      expect(zhKeys.has(p.labelKey)).toBe(true);
    }
    for (const c of RESIZE_PRESET_CATEGORIES) {
      expect(enKeys.has(c.labelKey)).toBe(true);
      expect(zhKeys.has(c.labelKey)).toBe(true);
    }
    expect(enKeys.has('settings.resizePresetLabel')).toBe(true);
    expect(zhKeys.has('settings.resizePresetLabel')).toBe(true);
  });

  it('avatar、social_square、ecommerce_main 默认 cover 模式', () => {
    const find = (id: string) => RESIZE_PRESETS.find((p) => p.id === id)!;
    expect(find('avatar').defaultMode).toBe('cover');
    expect(find('social_square').defaultMode).toBe('cover');
    expect(find('ecommerce_main').defaultMode).toBe('cover');
  });

  it('非方形预设不设 defaultMode（默认 fit）', () => {
    const find = (id: string) => RESIZE_PRESETS.find((p) => p.id === id)!;
    expect(find('web_banner').defaultMode).toBeUndefined();
    expect(find('social_portrait').defaultMode).toBeUndefined();
    expect(find('id_photo_1inch').defaultMode).toBeUndefined();
    expect(find('thumbnail').defaultMode).toBeUndefined();
  });
});