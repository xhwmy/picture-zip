import { describe, expect, it, vi, afterEach } from 'vitest';
import { detectFormat, decodeBuffer, CodecError } from './codecs';
import { supportsMainThreadCanvas } from './codecs-dom';

function makeFtypBuffer(brand: string): ArrayBuffer {
  const buffer = new ArrayBuffer(16);
  const bytes = new Uint8Array(buffer);
  bytes[0] = 0x00;
  bytes[1] = 0x00;
  bytes[2] = 0x00;
  bytes[3] = 0x10;
  bytes[4] = 0x66; // f
  bytes[5] = 0x74; // t
  bytes[6] = 0x79; // y
  bytes[7] = 0x70; // p
  bytes[8] = brand.charCodeAt(0);
  bytes[9] = brand.charCodeAt(1);
  bytes[10] = brand.charCodeAt(2);
  bytes[11] = brand.charCodeAt(3);
  return buffer;
}

describe('detectFormat ISO BMFF brand 分流', () => {
  it('ftyp heic 识别为 heic', () => {
    expect(detectFormat('', makeFtypBuffer('heic'))).toBe('heic');
  });

  it('ftyp heif 识别为 heic', () => {
    expect(detectFormat('', makeFtypBuffer('heif'))).toBe('heic');
  });

  it('ftyp mif1 识别为 heic', () => {
    expect(detectFormat('', makeFtypBuffer('mif1'))).toBe('heic');
  });

  it('ftyp avif 识别为 avif', () => {
    expect(detectFormat('', makeFtypBuffer('avif'))).toBe('avif');
  });

  it('ftyp avis 识别为 avif', () => {
    expect(detectFormat('', makeFtypBuffer('avis'))).toBe('avif');
  });

  it('未知 brand 识别为 unknown', () => {
    expect(detectFormat('', makeFtypBuffer('xxxx'))).toBe('unknown');
  });
});

describe('detectFormat MIME 与文件头冲突处理', () => {
  it('MIME 为 image/avif 但文件头为 ftyp heic 时按 heic', () => {
    expect(detectFormat('image/avif', makeFtypBuffer('heic'))).toBe('heic');
  });

  it('MIME 为空时依据文件头识别 heic', () => {
    expect(detectFormat('', makeFtypBuffer('heic'))).toBe('heic');
  });

  it('MIME 为 image/heic 时依据文件头覆盖', () => {
    expect(detectFormat('image/heic', makeFtypBuffer('avif'))).toBe('avif');
  });
});

describe('主线程 Canvas 回退', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('supportsMainThreadCanvas 在 DOM 环境返回 true', () => {
    expect(supportsMainThreadCanvas()).toBe(true);
  });

  it('supportsMainThreadCanvas 在无 document 环境返回 false', () => {
    vi.stubGlobal('document', undefined);
    expect(supportsMainThreadCanvas()).toBe(false);
  });

  it('decodeBuffer 在无 OffscreenCanvas 但有 document 时走主线程回退', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    const fakeBitmap = {
      width: 2,
      height: 2,
      close: vi.fn(),
    };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(fakeBitmap));
    const fakeCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(16),
        width: 2,
        height: 2,
      }),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
    };
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(fakeCtx),
    };
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return fakeCanvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });
    const pngBuffer = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]).buffer;
    const result = await decodeBuffer(pngBuffer, 'image/png');
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.format).toBe('png');
  });

  it('decodeBuffer 在无 OffscreenCanvas 且无 document 时抛 wasm-unsupported', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    vi.stubGlobal('document', undefined);
    const pngBuffer = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]).buffer;
    await expect(decodeBuffer(pngBuffer, 'image/png')).rejects.toThrow(CodecError);
    await expect(decodeBuffer(pngBuffer, 'image/png')).rejects.toMatchObject({
      code: 'wasm-unsupported',
    });
  });
});