import { decodeBuffer, encodeImage, resizeImage, fastEncodeFromBuffer, autoFormatFromInput, detectFormat } from './codecs';
import type { CompressionOptions, CompressOutput } from './types';

export async function compressBuffer(
  buffer: ArrayBuffer,
  mimeType: string,
  options: CompressionOptions,
): Promise<CompressOutput> {
  if (!options.maxWidth && !options.maxHeight) {
    const resolvedFormat = options.format === 'auto' ? autoFormatFromInput(detectFormat(mimeType, buffer)) : options.format;
    if (resolvedFormat !== 'avif') {
      const fast = await fastEncodeFromBuffer(buffer, mimeType, resolvedFormat as Exclude<typeof resolvedFormat, 'auto'>, options.quality);
      if (fast) {
        return {
          buffer: fast.buffer,
          mimeType: fast.mimeType,
          extension: fast.extension,
          byteLength: fast.buffer.byteLength,
          width: fast.width,
          height: fast.height,
          qualityUsed: options.quality,
          resized: false,
          originalByteLength: buffer.byteLength,
        };
      }
    }
  }

  const decoded = await decodeBuffer(buffer, mimeType);
  const resized = await resizeImage(decoded, options.maxWidth, options.maxHeight, options.resizeMode);
  const encoded = await encodeImage(resized.image, options.format, options.quality);
  return {
    buffer: encoded.buffer,
    mimeType: encoded.mimeType,
    extension: encoded.extension,
    byteLength: encoded.buffer.byteLength,
    width: resized.image.width,
    height: resized.image.height,
    qualityUsed: options.quality,
    resized: resized.resized,
    originalByteLength: buffer.byteLength,
  };
}

export async function compressGifAnimated(
  buffer: ArrayBuffer,
  options: { quality: number },
): Promise<CompressOutput> {
  const { parseGIF, decompressFrames } = await import('gifuct-js');
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');

  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true);

  const isAnimated = frames.length > 1;

  if (!isAnimated) {
    const decoded = await decodeBuffer(buffer, 'image/gif');
    const encoded = await encodeImage(decoded, 'webp', options.quality);
    return {
      buffer: encoded.buffer,
      mimeType: encoded.mimeType,
      extension: encoded.extension,
      byteLength: encoded.buffer.byteLength,
      width: decoded.width,
      height: decoded.height,
      qualityUsed: options.quality,
      resized: false,
      originalByteLength: buffer.byteLength,
    };
  }

  const maxColors = Math.max(2, Math.min(256, Math.round(256 * (options.quality / 100))));
  const encoder = GIFEncoder();
  const width = gif.lsd.width;
  const height = gif.lsd.height;

  let composited = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const disposalType = frame.disposalType ?? 0;
    const left = frame.dims.left ?? 0;
    const top = frame.dims.top ?? 0;
    const fw = frame.dims.width;
    const fh = frame.dims.height;

    const beforeFrame = composited.slice();

    const patch = frame.patch as Uint8ClampedArray;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const patchIdx = (y * fw + x) * 4;
        const compIdx = ((top + y) * width + (left + x)) * 4;
        if (patch[patchIdx + 3] > 0) {
          composited[compIdx] = patch[patchIdx];
          composited[compIdx + 1] = patch[patchIdx + 1];
          composited[compIdx + 2] = patch[patchIdx + 2];
          composited[compIdx + 3] = patch[patchIdx + 3];
        }
      }
    }

    const rgba = composited.slice();

    let hasTransparent = false;
    for (let p = 3; p < rgba.length; p += 4) {
      if (rgba[p] === 0) {
        hasTransparent = true;
        break;
      }
    }

    let palette: number[][];
    let indices: number[];
    let transparentIndex: number | undefined;

    if (hasTransparent) {
      palette = quantize(rgba, maxColors, { format: 'rgba4444', oneBitAlpha: 127 });
      indices = applyPalette(rgba, palette, 'rgba4444');
      transparentIndex = palette.findIndex((c) => c[3] === 0);
      if (transparentIndex === -1) transparentIndex = undefined;
    } else {
      palette = quantize(rgba, maxColors, { format: 'rgb565' });
      indices = applyPalette(rgba, palette, 'rgb565');
      transparentIndex = undefined;
    }

    encoder.writeFrame(indices, width, height, {
      palette,
      delay: frame.delay,
      dispose: disposalType,
      transparent: transparentIndex !== undefined,
      transparentIndex,
    });

    if (disposalType === 2) {
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          const compIdx = ((top + y) * width + (left + x)) * 4;
          composited[compIdx + 3] = 0;
        }
      }
    } else if (disposalType === 3) {
      composited = beforeFrame;
    }
  }

  encoder.finish();
  const output = encoder.bytes();
  const outputBuffer = new ArrayBuffer(output.byteLength);
  new Uint8Array(outputBuffer).set(output);

  return {
    buffer: outputBuffer,
    mimeType: 'image/gif',
    extension: 'gif',
    byteLength: outputBuffer.byteLength,
    width,
    height,
    qualityUsed: options.quality,
    resized: false,
    originalByteLength: buffer.byteLength,
  };
}