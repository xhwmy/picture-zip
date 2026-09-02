import type { ResizeMode } from './types';

export type ResizePresetCategory = 'web' | 'social' | 'ecommerce' | 'id_photo' | 'thumb' | 'custom';

export interface ResizePreset {
  id: string;
  maxWidth?: number;
  maxHeight?: number;
  defaultMode?: ResizeMode;
  category: ResizePresetCategory;
  labelKey: string;
}

export interface ResizePresetCategoryMeta {
  id: ResizePresetCategory;
  labelKey: string;
}

export const RESIZE_PRESETS: readonly ResizePreset[] = [
  { id: 'web_banner', maxWidth: 1920, maxHeight: 1080, category: 'web', labelKey: 'settings.resizePresetWebBanner' },
  { id: 'desktop_thumb', maxWidth: 1280, maxHeight: 720, category: 'web', labelKey: 'settings.resizePresetDesktopThumb' },
  { id: 'social_square', maxWidth: 1080, maxHeight: 1080, defaultMode: 'cover', category: 'social', labelKey: 'settings.resizePresetSocialSquare' },
  { id: 'social_portrait', maxWidth: 1080, maxHeight: 1350, category: 'social', labelKey: 'settings.resizePresetSocialPortrait' },
  { id: 'social_landscape', maxWidth: 1200, maxHeight: 630, category: 'social', labelKey: 'settings.resizePresetSocialLandscape' },
  { id: 'twitter_card', maxWidth: 1200, maxHeight: 675, category: 'social', labelKey: 'settings.resizePresetTwitterCard' },
  { id: 'ecommerce_main', maxWidth: 800, maxHeight: 800, defaultMode: 'cover', category: 'ecommerce', labelKey: 'settings.resizePresetEcommerceMain' },
  { id: 'id_photo_1inch', maxWidth: 295, maxHeight: 413, category: 'id_photo', labelKey: 'settings.resizePresetIdPhoto1inch' },
  { id: 'id_photo_2inch', maxWidth: 413, maxHeight: 579, category: 'id_photo', labelKey: 'settings.resizePresetIdPhoto2inch' },
  { id: 'thumbnail', maxWidth: 300, maxHeight: 300, category: 'thumb', labelKey: 'settings.resizePresetThumbnail' },
  { id: 'avatar', maxWidth: 512, maxHeight: 512, defaultMode: 'cover', category: 'thumb', labelKey: 'settings.resizePresetAvatar' },
  { id: 'custom', category: 'custom', labelKey: 'settings.resizePresetCustom' },
] as const;

export const RESIZE_PRESET_CATEGORIES: readonly ResizePresetCategoryMeta[] = [
  { id: 'web', labelKey: 'settings.resizePresetCategoryWeb' },
  { id: 'social', labelKey: 'settings.resizePresetCategorySocial' },
  { id: 'ecommerce', labelKey: 'settings.resizePresetCategoryEcommerce' },
  { id: 'id_photo', labelKey: 'settings.resizePresetCategoryIdPhoto' },
  { id: 'thumb', labelKey: 'settings.resizePresetCategoryThumb' },
] as const;