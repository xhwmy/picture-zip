import type { DecodedImage, EncodedImage, InputFormat, OutputFormat } from './types';

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
  if (MIME_TO_FORMAT[mimeType]) return MIME_TO_FORMAT[mimeType];
  return detectFormatFromHeader(buffer);
}

function detectFormatFromHeader(buffer: ArrayBuffer): InputFormat {
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
    bytes[7] === 0x70 &&
    ((bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) ||
      (bytes[8] === 0x68 && bytes[9] === 0x65 && bytes[10] === 0x69 && bytes[11] === 0x63) ||
      (bytes[8] === 0x68 && bytes[9] === 0x65 && bytes[10] === 0x69 && bytes[11] === 0x66))
  )
    return 'avif';
  return 'unknown';
}

function supportsOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';
}

export async function decodeBuffer(
  buffer: ArrayBuffer,
  mimeType?: string,
): Promise<DecodedImage> {
  if (!supportsOffscreenCanvas()) {
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
      format: mimeType ? detectFormat(mimeType, buffer) : detectFormatFromHeader(buffer),
    };
  } catch (err) {
    if (err instanceof CodecError) throw err;
    throw new CodecError('decode-error');
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
  minDimension = 300,
): Promise<ResizeResult> {
  if (!maxWidth && !maxHeight) {
    return { image, resized: false };
  }
  const limitWidth = maxWidth ? Math.min(maxWidth, image.width) : image.width;
  const limitHeight = maxHeight ? Math.min(maxHeight, image.height) : image.height;
  const ratio = Math.min(limitWidth / image.width, limitHeight / image.height);

  let newWidth = image.width;
  let newHeight = image.height;

  if (ratio < 1) {
    newWidth = Math.max(1, Math.round(image.width * ratio));
    newHeight = Math.max(1, Math.round(image.height * ratio));
  }

  if (minDimension && (newWidth < minDimension || newHeight < minDimension)) {
    if (newWidth >= minDimension && newHeight >= minDimension) {
      return { image, resized: false };
    }
  }

  if (newWidth === image.width && newHeight === image.height) {
    return { image, resized: false };
  }

  if (!supportsOffscreenCanvas()) {
    throw new CodecError('wasm-unsupported');
  }
  const canvas = new OffscreenCanvas(newWidth, newHeight);
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
  ctx.drawImage(sourceBitmap, 0, 0, newWidth, newHeight);
  sourceBitmap.close();
  const resized = ctx.getImageData(0, 0, newWidth, newHeight);
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