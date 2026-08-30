import type { InputFormat } from '../../src/lib/types';

export interface FixtureEntry {
  key: string;
  path: string;
  format: InputFormat;
  sizeTier: 'small' | 'medium' | 'large' | 'huge';
  hasAlpha?: boolean;
  corrupted?: boolean;
  unsupported?: boolean;
}

export const fixtureManifest: readonly FixtureEntry[] = [
  { key: 'jpegSmall', path: 'sample-jpeg-small.jpg', format: 'jpeg', sizeTier: 'small' },
  { key: 'jpegMedium', path: 'sample-jpeg-medium.jpg', format: 'jpeg', sizeTier: 'medium' },
  { key: 'jpegLarge', path: 'sample-jpeg-large.jpg', format: 'jpeg', sizeTier: 'huge' },
  { key: 'pngWithAlpha', path: 'sample-png-with-alpha.png', format: 'png', sizeTier: 'small', hasAlpha: true },
  { key: 'pngOpaque', path: 'sample-png-opaque.png', format: 'png', sizeTier: 'small' },
  { key: 'webp', path: 'sample-webp.webp', format: 'webp', sizeTier: 'small' },
  { key: 'gif', path: 'sample-gif.gif', format: 'gif', sizeTier: 'small' },
  { key: 'corruptedJpeg', path: 'corrupted-jpeg.jpg', format: 'jpeg', sizeTier: 'small', corrupted: true },
  { key: 'bmp', path: 'unsupported.bmp', format: 'unknown', sizeTier: 'small', unsupported: true },
  { key: 'tiff', path: 'unsupported.tiff', format: 'unknown', sizeTier: 'small', unsupported: true },
  { key: 'idPhoto5mb', path: 'id-photo-5mb.jpg', format: 'jpeg', sizeTier: 'medium' },
  { key: 'highResPhoto', path: 'high-res-photo.jpg', format: 'jpeg', sizeTier: 'large' },
] as const;

export type FixtureKey = (typeof fixtureManifest)[number]['key'];