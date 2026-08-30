import { describe, expect, it } from 'vitest';
import {
  baseName,
  buildDownloadFilename,
  formatBytes,
  formatPercent,
} from './format';

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(5120)).toBe('5 KB');
    expect(formatBytes(10240)).toBe('10 KB');
    expect(formatBytes(15360)).toBe('15 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 5)).toBe('5 MB');
    expect(formatBytes(1024 * 1024 * 12.5)).toBe('12.5 MB');
  });

  it('handles invalid input', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });
});

describe('formatPercent', () => {
  it('formats with one decimal', () => {
    expect(formatPercent(78)).toBe('-78%');
    expect(formatPercent(83.24)).toBe('-83.2%');
    expect(formatPercent(0)).toBe('-0%');
  });
});

describe('buildDownloadFilename', () => {
  it('appends _compressed and new extension', () => {
    expect(buildDownloadFilename('photo.png', 'webp')).toBe('photo_compressed.webp');
    expect(buildDownloadFilename('image.jpeg', 'jpg')).toBe('image_compressed.jpg');
  });

  it('handles names without extension', () => {
    expect(buildDownloadFilename('noext', 'webp')).toBe('noext_compressed.webp');
  });
});

describe('baseName', () => {
  it('strips extension', () => {
    expect(baseName('a.b.png')).toBe('a.b');
    expect(baseName('noext')).toBe('noext');
  });
});