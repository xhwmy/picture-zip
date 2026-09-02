import type { DecodedImage, EncodedImage, InputFormat, OutputFormat, ResizeMode } from './types';

export class CodecError extends Error {
  code: 'format-not-supported' | 'decode-error' | 'encode-error' | 'wasm-unsupported';
  constructor(code: CodecError['code'], message?: string) {
    super(message ?? code);
    this.name = 'CodecError';
    this.code = code;
  }
}

const MIME_TO_FORMAT: Record<string, InputFormat> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heic',
};

const OUTPUT_MIME: Record<Exclude<OutputFormat, 'auto'>, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const OUTPUT_EXTENSION: Record<Exclude<OutputFormat, 'auto'>, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
};


export function detectFormat(mimeType: string, buffer: ArrayBuffer): InputFormat {
  const mimeFormat = MIME_TO_FORMAT[mimeType];
  if (mimeFormat === 'avif' || mimeFormat === 'heic') {
    const headerFormat = detectFormatFromHeader(buffer);
    if (headerFormat === 'avif' || headerFormat === 'heic') return headerFormat;
    return mimeFormat;
  }
  if (mimeFormat) return mimeFormat;
  return detectFormatFromHeader(buffer);
}

export function detectFormatFromHeader(buffer: ArrayBuffer): InputFormat {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'png';
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return 'webp';
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  )
    return 'gif';
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'avif' || brand === 'avis') return 'avif';
    if (
      brand === 'heic' ||
      brand === 'heix' ||
      brand === 'hevc' ||
      brand === 'hevx' ||
      brand === 'heif' ||
      brand === 'mif1' ||
      brand === 'msf1'
    )
      return 'heic';
    return 'unknown';
  }
  return 'unknown';
}

function supportsOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';
}

export async function decodeBuffer(
  buffer: ArrayBuffer,
  mimeType?: string,
): Promise<DecodedImage> {
  const format = mimeType ? detectFormat(mimeType, buffer) : detectFormatFromHeader(buffer);

  if (format === 'heic') {
    return decodeHeic(buffer);
  }

  if (!supportsOffscreenCanvas()) {
    const { supportsMainThreadCanvas, decodeOnMainThread } = await import('./codecs-dom');
    if (supportsMainThreadCanvas()) {
      return decodeOnMainThread(buffer, mimeType);
    }
    throw new CodecError('wasm-unsupported');
  }
  try {
    const blob = new Blob([buffer], mimeType ? { type: mimeType } : undefined);
    const bitmap = await createImageBitmap(blob);
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new CodecError('decode-error');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, width, height);
    return {
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
      format,
    };
  } catch (err) {
    if (err instanceof CodecError) throw err;
    throw new CodecError('decode-error');
  }
}

async function decodeHeic(buffer: ArrayBuffer): Promise<DecodedImage> {
  try {
    const libheif = (await import('libheif-js')).default;
    const decoder = new libheif.HeifDecoder();
    const images = decoder.decode(new Uint8Array(buffer));
    if (!images || images.length === 0) {
      throw new CodecError('decode-error', 'HEIC 文件无法解码，可能已损坏');
    }
    const image = images[0];
    const displayed = await new Promise<{ data: Uint8Array; width: number; height: number }>(
      (resolve, reject) => {
        image.display((img) => {
          if (img && img.data) resolve(img);
          else reject(new CodecError('decode-error', 'HEIC 解码失败'));
        });
      },
    );
    return {
      data: new Uint8ClampedArray(displayed.data),
      width: displayed.width,
      height: displayed.height,
      format: 'heic',
    };
  } catch (err) {
    if (err instanceof CodecError) throw err;
    throw new CodecError('decode-error', 'HEIC 解码器加载失败');
  }
}

function toImageData(image: DecodedImage): ImageData {
  return new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
}


export async function encodeImage(
  image: DecodedImage,
  format: OutputFormat,
  quality: number,
): Promise<EncodedImage> {
  let resolvedFormat = format;
  if (resolvedFormat === 'auto') {
    resolvedFormat = autoFormatFromInput(image.format);
  }
  const imageData = toImageData(image);
  switch (resolvedFormat) {
    case 'jpeg': {
      const encode = (await import('@jsquash/jpeg/encode')).default;
      const buffer = await encode(imageData, { quality: Math.round(quality) });
      return { buffer, mimeType: OUTPUT_MIME.jpeg, extension: OUTPUT_EXTENSION.jpeg };
    }
    case 'webp': {
      const encode = (await import('@jsquash/webp/encode')).default;
      const buffer = await encode(imageData, { quality: Math.round(quality) });
      return { buffer, mimeType: OUTPUT_MIME.webp, extension: OUTPUT_EXTENSION.webp };
    }
    case 'avif': {
      const encode = (await import('@jsquash/avif/encode')).default;
      const buffer = await encode(imageData, { quality: Math.round(quality) });
      return { buffer, mimeType: OUTPUT_MIME.avif, extension: OUTPUT_EXTENSION.avif };
    }
    case 'png': {
      const pngEncode = (await import('@jsquash/png/encode')).default;
      const pngBuffer = await pngEncode(imageData);
      let buffer = pngBuffer;
      try {
        const optimise = (await import('@jsquash/oxipng/optimise')).default;
        buffer = await optimise(pngBuffer, { level: 2 });
      } catch {
        buffer = pngBuffer;
      }
      return { buffer, mimeType: OUTPUT_MIME.png, extension: OUTPUT_EXTENSION.png };
    }
    default:
      throw new CodecError('encode-error');
  }
}

function autoFormatFromInput(format: InputFormat): Exclude<OutputFormat, 'auto'> {
  switch (format) {
    case 'jpeg':
      return 'jpeg';
    case 'gif':
      return 'webp';
    case 'avif':
      return 'avif';
    case 'png':
    case 'webp':
    case 'heic':
    case 'unknown':
    default:
      return 'webp';
  }
}

export interface ResizeResult {
  image: DecodedImage;
  resized: boolean;
}

export async function resizeImage(
  image: DecodedImage,
  maxWidth?: number,
  maxHeight?: number,
  mode: ResizeMode = 'fit',
): Promise<ResizeResult> {
  if (!maxWidth && !maxHeight) {
    return { image, resized: false };
  }

  const useCover = mode === 'cover' && maxWidth !== undefined && maxHeight !== undefined;

  let targetWidth: number;
  let targetHeight: number;
  let sourceRect: { sx: number; sy: number; sw: number; sh: number } | undefined;

  if (useCover) {
    const ratio = Math.max(maxWidth! / image.width, maxHeight! / image.height);
    const scaledWidth = image.width * ratio;
    const scaledHeight = image.height * ratio;
    const offsetX = (scaledWidth - maxWidth!) / 2;
    const offsetY = (scaledHeight - maxHeight!) / 2;
    targetWidth = maxWidth!;
    targetHeight = maxHeight!;
    sourceRect = {
      sx: offsetX / ratio,
      sy: offsetY / ratio,
      sw: maxWidth! / ratio,
      sh: maxHeight! / ratio,
    };
  } else {
    const ratio = Math.min(
      maxWidth ? maxWidth / image.width : Infinity,
      maxHeight ? maxHeight / image.height : Infinity,
    );
    targetWidth = Math.max(1, Math.round(image.width * ratio));
    targetHeight = Math.max(1, Math.round(image.height * ratio));
    sourceRect = undefined;
  }

  const noCrop =
    !sourceRect ||
    (sourceRect.sx === 0 &&
      sourceRect.sy === 0 &&
      sourceRect.sw === image.width &&
      sourceRect.sh === image.height);
  if (targetWidth === image.width && targetHeight === image.height && noCrop) {
    return { image, resized: false };
  }

  if (!supportsOffscreenCanvas()) {
    const { supportsMainThreadCanvas, resizeOnMainThread } = await import('./codecs-dom');
    if (supportsMainThreadCanvas()) {
      const resized = await resizeOnMainThread(image, targetWidth, targetHeight, sourceRect);
      return { image: resized, resized: true };
    }
    throw new CodecError('wasm-unsupported');
  }
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new CodecError('decode-error');
  const sourceData = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
  const sourceBitmap = await createImageBitmap(sourceData);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (sourceRect) {
    ctx.drawImage(
      sourceBitmap,
      sourceRect.sx,
      sourceRect.sy,
      sourceRect.sw,
      sourceRect.sh,
      0,
      0,
      targetWidth,
      targetHeight,
    );
  } else {
    ctx.drawImage(sourceBitmap, 0, 0, targetWidth, targetHeight);
  }
  sourceBitmap.close();
  const resized = ctx.getImageData(0, 0, targetWidth, targetHeight);
  return {
    image: {
      data: resized.data,
      width: resized.width,
      height: resized.height,
      format: image.format,
    },
    resized: true,
  };
}