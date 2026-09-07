import type {
  CompressSettings,
  QueueItem,
  WorkerRequest,
  WorkerResponse,
} from './types';
import type { CompressOutput } from './types';

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);

export interface SavedStat {
  savedBytes: number;
  totalOriginal: number;
  totalCompressed: number;
  savedPercent: number;
  doneCount: number;
  totalCount: number;
  failedCount: number;
}


export interface QueueOptions extends CompressSettings {
  poolSize?: number;
  timeoutMs?: number;
}

export interface QueueController {
  enqueue(files: File[]): void;
  setSettings(settings: Partial<CompressSettings>): void;
  pause(): void;
  resume(): void;
  cancelAll(): void;
  subscribe(listener: (items: readonly QueueItem[]) => void): () => void;
  getItems(): readonly QueueItem[];
  isPaused(): boolean;
  getStats(): SavedStat;
  dispose(): void;
}

type Listener = (items: readonly QueueItem[]) => void;

interface WorkerHandle {
  worker: Worker | PseudoWorker;
  busy: boolean;
}

function defaultPoolSize(): number {
  const concurrency = globalThis.navigator?.hardwareConcurrency ?? 4;
  return Math.max(2, Math.min(6, concurrency));
}

function isValidFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return /\.(jpe?g|png|webp|gif|avif|heic|heif)$/.test(lower);
}

function isGifBytes(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
}

function canUseOffscreenWorker(): boolean {
  return typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';
}

interface PseudoWorker {
  postMessage(message: WorkerRequest, transfer?: StructuredSerializeOptions): void;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  terminate(): void;
}

class MainThreadCompressWorker implements PseudoWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private terminated = false;

  async postMessage(message: WorkerRequest, _transfer?: StructuredSerializeOptions): Promise<void> {
    if (this.terminated) return;
    try {
      const result = await this.processRequest(message);
      if (this.terminated) return;
      const response: WorkerResponse = { type: 'success', id: message.id, result };
      this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
    } catch (err) {
      if (this.terminated) return;
      const code = err instanceof Error && 'code' in err ? (err as { code?: string }).code : undefined;
      const response: WorkerResponse = {
        type: 'error',
        id: message.id,
        error: err instanceof Error ? err.message : String(err),
        code,
      };
      this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  private async processRequest(msg: WorkerRequest): Promise<CompressOutput> {
    const { compressBuffer, compressGifAnimated } = await import('./compress');
    const { compressToTargetSize } = await import('./targetSize');
    const { compressVisuallyLossless } = await import('./visuallyLossless');

    const isGif = msg.mimeType === 'image/gif' || isGifBytes(msg.buffer);

    if (isGif && msg.type === 'compress') {
      return compressGifAnimated(msg.buffer, { quality: msg.quality });
    }

    if (msg.type === 'targetSize' && msg.targetKB !== undefined) {
      const r = await compressToTargetSize(msg.buffer, msg.mimeType, msg.targetKB, {
        format: msg.format,
        maxWidth: msg.maxWidth,
        maxHeight: msg.maxHeight,
      });
      return {
        buffer: r.buffer,
        mimeType: r.mimeType,
        extension: r.extension,
        byteLength: r.buffer.byteLength,
        width: r.width,
        height: r.height,
        qualityUsed: r.qualityUsed,
        resized: r.resized,
        targetReached: r.targetReached,
        originalByteLength: r.originalByteLength,
      };
    }

    if (msg.type === 'visuallyLossless') {
      const r = await compressVisuallyLossless(msg.buffer, msg.mimeType, {
        format: msg.format,
        quality: msg.quality,
        maxWidth: msg.maxWidth,
        maxHeight: msg.maxHeight,
        resizeMode: msg.resizeMode,
        perceptualLevel: msg.perceptualLevel,
      });
      return {
        buffer: r.buffer,
        mimeType: r.mimeType,
        extension: r.extension,
        byteLength: r.buffer.byteLength,
        width: r.width,
        height: r.height,
        qualityUsed: r.qualityUsed,
        resized: r.resized,
        originalByteLength: r.originalByteLength,
      };
    }

    const r = await compressBuffer(msg.buffer, msg.mimeType, {
      format: msg.format,
      quality: msg.quality,
      maxWidth: msg.maxWidth,
      maxHeight: msg.maxHeight,
      resizeMode: msg.resizeMode,
    });
    return {
      buffer: r.buffer,
      mimeType: r.mimeType,
      extension: r.extension,
      byteLength: r.buffer.byteLength,
      width: r.width,
      height: r.height,
      qualityUsed: r.qualityUsed,
      resized: r.resized,
      originalByteLength: r.originalByteLength,
    };
  }
}

export function createQueue(
  options: QueueOptions = { format: 'webp', quality: 75 },
): QueueController {
  const poolSize = options.poolSize ?? defaultPoolSize();
  const timeoutMs = options.timeoutMs ?? 120_000;

  let settings: CompressSettings = {
    format: options.format ?? 'webp',
    quality: options.quality ?? 75,
    maxWidth: options.maxWidth,
    maxHeight: options.maxHeight,
    resizeMode: options.resizeMode,
    targetSizeKB: options.targetSizeKB,
    visuallyLossless: options.visuallyLossless,
    perceptualLevel: options.perceptualLevel,
  };

  const items: QueueItem[] = [];
  const itemsById = new Map<string, QueueItem>();
  const pendingIds: string[] = [];
  const listeners = new Set<Listener>();
  let paused = false;
  let disposed = false;
  let workerSeq = 0;

  const workers: WorkerHandle[] = [];

  function emit() {
    const snapshot = items.map((item) => ({ ...item }));
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function makeWorker(): WorkerHandle {
    let worker: Worker | PseudoWorker;
    if (canUseOffscreenWorker()) {
      worker = new Worker(
        new URL('../workers/compress.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } else {
      worker = new MainThreadCompressWorker();
    }
    const handle: WorkerHandle = { worker, busy: false };
    handle.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      onMessage(handle, event.data);
    };
    handle.worker.onerror = (event) => {
      const activeId = activeByWorker.get(handle);
      if (activeId) {
        const item = itemsById.get(activeId);
        if (item && item.status === 'processing') {
          item.status = 'failed';
          item.errorReason = event.message || 'worker-error';
        }
        activeByWorker.delete(handle);
      }
      handle.busy = false;
      try {
        handle.worker.terminate();
      } catch {
        // ignore
      }
      replaceWorker(handle);
      emit();
      dispatch();
    };
    return handle;
  }

  const activeByWorker = new Map<WorkerHandle, string>();
  const timeouts = new Map<WorkerHandle, ReturnType<typeof setTimeout>>();

  function setWorkerTimeout(handle: WorkerHandle, id: string) {
    const timer = setTimeout(() => {
      const item = itemsById.get(id);
      if (item && item.status === 'processing') {
        item.status = 'failed';
        item.errorReason = 'timeout';
      }
      activeByWorker.delete(handle);
      try {
        handle.worker.terminate();
      } catch {
        // ignore
      }
      replaceWorker(handle);
      emit();
      dispatch();
    }, timeoutMs);
    timeouts.set(handle, timer);
  }

  function replaceWorker(handle: WorkerHandle) {
    const idx = workers.indexOf(handle);
    clearTimeout(timeouts.get(handle));
    timeouts.delete(handle);
    if (idx !== -1) {
      workers[idx] = makeWorker();
    }
  }

  for (let i = 0; i < poolSize; i++) {
    workers.push(makeWorker());
  }

  function onMessage(handle: WorkerHandle, msg: WorkerResponse) {
    if (msg.type === 'progress') return;

    clearTimeout(timeouts.get(handle));
    timeouts.delete(handle);

    const activeId = activeByWorker.get(handle);
    activeByWorker.delete(handle);
    handle.busy = false;

    const item = activeId ? itemsById.get(activeId) : undefined;
    if (item) {
      if (item.status === 'cancelled') {
        // discard result from cancelled task
      } else if (msg.type === 'success') {
        item.result = msg.result;
        item.status = 'done';
      } else {
        item.status = 'failed';
        item.errorReason = msg.code === 'format-not-supported' ? 'format-not-supported' : msg.error;
      }
    }
    emit();
    dispatch();
  }

  async function dispatch() {
    if (disposed || paused) return;
    while (pendingIds.length > 0) {
      const idle = workers.find((w) => !w.busy);
      if (!idle) break;
      const id = pendingIds.shift();
      if (!id) break;
      const item = itemsById.get(id);
      if (!item || item.status !== 'pending') continue;

      item.status = 'processing';
      idle.busy = true;
      workerSeq += 1;
      activeByWorker.set(idle, id);
      emit();

      try {
        const buffer = await item.file.arrayBuffer();
        if (item.status !== 'processing') {
          idle.busy = false;
          continue;
        }
        const gif = isGifBytes(buffer);
        const wantsTarget = settings.targetSizeKB !== undefined;
        const wantsPerceptual = settings.visuallyLossless === true && !wantsTarget;
        const wantsUltraLossy = settings.ultraLossy === true && !wantsTarget && !wantsPerceptual;
        const useTarget = wantsTarget && !gif;
        const usePerceptual = wantsPerceptual && !gif;
        item.gifTargetBypassed = wantsTarget && gif;
        item.gifSizeBypassed = gif && (settings.maxWidth !== undefined || settings.maxHeight !== undefined);
        const request: WorkerRequest = {
          type: useTarget ? 'targetSize' : usePerceptual ? 'visuallyLossless' : 'compress',
          id,
          buffer,
          mimeType: item.file.type,
          format: wantsUltraLossy ? 'jpeg' : settings.format,
          quality: wantsUltraLossy ? 1 : settings.quality,
          targetKB: useTarget ? settings.targetSizeKB : undefined,
          maxWidth: settings.maxWidth,
          maxHeight: settings.maxHeight,
          resizeMode: settings.resizeMode,
          perceptualLevel: usePerceptual ? (settings.perceptualLevel ?? 'normal') : undefined,
          ultraLossy: wantsUltraLossy || undefined,
        };
        setWorkerTimeout(idle, id);
        idle.worker.postMessage(request, { transfer: [buffer] });
      } catch (err) {
        item.status = 'failed';
        item.errorReason = 'read-error';
        idle.busy = false;
        activeByWorker.delete(idle);
        emit();
      }
    }
  }

  return {
    enqueue(files: File[]) {
      if (disposed) return;
      for (const file of files) {
        const id = crypto.randomUUID();
        const valid = isValidFile(file);
        const item: QueueItem = {
          id,
          file,
          originalSize: file.size,
          status: valid ? 'pending' : 'failed',
          errorReason: valid ? undefined : 'format-not-supported',
          downloaded: false,
        };
        items.push(item);
        itemsById.set(id, item);
        if (valid) {
          pendingIds.push(id);
        }
      }
      emit();
      void dispatch();
    },

    setSettings(next: Partial<CompressSettings>) {
      settings = { ...settings, ...next };
    },

    pause() {
      paused = true;
    },

    resume() {
      paused = false;
      void dispatch();
    },

    cancelAll() {
      while (pendingIds.length > 0) {
        const id = pendingIds.shift();
        if (!id) break;
        const item = itemsById.get(id);
        if (item && item.status === 'pending') {
          item.status = 'skipped';
          item.errorReason = 'cancelled';
        }
      }
      for (const [handle, activeId] of activeByWorker) {
        const item = itemsById.get(activeId);
        if (item && item.status === 'processing') {
          item.status = 'cancelled';
          item.errorReason = 'cancelled';
        }
        clearTimeout(timeouts.get(handle));
        timeouts.delete(handle);
        try {
          handle.worker.terminate();
        } catch {
          // ignore
        }
        replaceWorker(handle);
        activeByWorker.delete(handle);
        handle.busy = false;
      }
      emit();
    },

    subscribe(listener) {
      listeners.add(listener);
      listener(this.getItems());
      return () => {
        listeners.delete(listener);
      };
    },

    getItems() {
      return items.map((item) => ({ ...item }));
    },

    isPaused() {
      return paused;
    },

    getStats() {
      let totalOriginal = 0;
      let totalCompressed = 0;
      let doneCount = 0;
      let failedCount = 0;
      for (const item of items) {
        if (item.status === 'done' && item.result) {
          totalOriginal += item.originalSize;
          totalCompressed += item.result.byteLength;
          doneCount += 1;
        } else if (item.status === 'failed') {
          failedCount += 1;
        }
      }
      const savedBytes = totalOriginal - totalCompressed;
      const savedPercent =
        totalOriginal > 0 ? Math.round((savedBytes / totalOriginal) * 1000) / 10 : 0;
      return {
        savedBytes,
        totalOriginal,
        totalCompressed,
        savedPercent,
        doneCount,
        totalCount: items.length,
        failedCount,
      };
    },

    dispose() {
      disposed = true;
      for (const timer of timeouts.values()) {
        clearTimeout(timer);
      }
      timeouts.clear();
      for (const handle of workers) {
        try {
          handle.worker.terminate();
        } catch {
          // ignore
        }
      }
      workers.length = 0;
      listeners.clear();
    },
  };
}

export function isFormatNotSupported(reason?: string): boolean {
  return reason === 'format-not-supported';
}