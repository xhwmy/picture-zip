export type OutputFormat = 'auto' | 'jpeg' | 'png' | 'webp' | 'avif';

export type InputFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' | 'heic' | 'unknown';

export type ResizeMode = 'fit' | 'cover';

export type PerceptualLevel = 'normal' | 'high' | 'maximum';

export interface CompressSettings {
  format: OutputFormat;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeMode?: ResizeMode;
  targetSizeKB?: number;
  visuallyLossless?: boolean;
  perceptualLevel?: PerceptualLevel;
}

export interface CompressionOptions {
  format: OutputFormat;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeMode?: ResizeMode;
}

export interface TargetSizeOptions {
  format: OutputFormat;
  maxWidth?: number;
  maxHeight?: number;
}

export interface DecodedImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  format: InputFormat;
}

export interface EncodedImage {
  buffer: ArrayBuffer;
  mimeType: string;
  extension: string;
}

export interface CompressOutput {
  buffer: ArrayBuffer;
  mimeType: string;
  extension: string;
  byteLength: number;
  width: number;
  height: number;
  qualityUsed: number;
  resized: boolean;
  targetReached?: boolean;
  originalByteLength: number;
}

export interface TargetSizeResult {
  buffer: ArrayBuffer;
  mimeType: string;
  extension: string;
  byteLength: number;
  targetReached: boolean;
  qualityUsed: number;
  width: number;
  height: number;
  resized: boolean;
  originalByteLength: number;
}

export interface WorkerRequest {
  type: 'compress' | 'targetSize' | 'visuallyLossless';
  id: string;
  buffer: ArrayBuffer;
  mimeType: string;
  format: OutputFormat;
  quality: number;
  targetKB?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeMode?: ResizeMode;
  perceptualLevel?: PerceptualLevel;
}

export type WorkerResponse =
  | { type: 'success'; id: string; result: CompressOutput }
  | { type: 'error'; id: string; error: string; code?: string };

export type TaskStatus = 'pending' | 'processing' | 'done' | 'failed' | 'skipped' | 'cancelled';

export interface QueueItem {
  id: string;
  file: File;
  originalSize: number;
  status: TaskStatus;
  errorReason?: string;
  gifTargetBypassed?: boolean;
  gifSizeBypassed?: boolean;
  result?: CompressOutput;
  downloaded: boolean;
}