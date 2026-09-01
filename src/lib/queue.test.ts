import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createQueue } from './queue';

class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  terminated = false;
  postedMessages: unknown[] = [];
  static instances: FakeWorker[] = [];
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(msg: unknown) {
    this.postedMessages.push(msg);
  }
  terminate() {
    this.terminated = true;
  }
}

function makeJpegFile(): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  return new File([bytes], 'test.jpg', { type: 'image/jpeg' });
}

async function flush() {
  for (let i = 0; i < 10; i++) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

describe('queue Worker 故障与生命周期', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
    vi.stubGlobal('createImageBitmap', vi.fn());
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('onerror 清理 timeout、终止故障 Worker、替换新 Worker', async () => {
    const ctrl = createQueue({ poolSize: 1, timeoutMs: 1000, format: 'webp', quality: 75 });
    ctrl.enqueue([makeJpegFile()]);
    await flush();

    const worker1 = FakeWorker.instances[0];
    expect(worker1.postedMessages.length).toBe(1);

    worker1.onerror!(new ErrorEvent('error', { message: 'boom' }));

    expect(ctrl.getItems()[0].status).toBe('failed');
    expect(ctrl.getItems()[0].errorReason).toBe('boom');
    expect(worker1.terminated).toBe(true);
    expect(FakeWorker.instances.length).toBe(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeWorker.instances[1].terminated).toBe(false);

    ctrl.dispose();
  });

  it('超时后故障任务标记 failed 且新任务能被新 Worker 接手', async () => {
    const ctrl = createQueue({ poolSize: 1, timeoutMs: 1000, format: 'webp', quality: 75 });
    ctrl.enqueue([makeJpegFile(), makeJpegFile()]);
    await flush();

    const worker1 = FakeWorker.instances[0];
    expect(worker1.postedMessages.length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect(ctrl.getItems()[0].status).toBe('failed');
    expect(ctrl.getItems()[0].errorReason).toBe('timeout');
    expect(worker1.terminated).toBe(true);
    expect(FakeWorker.instances.length).toBe(2);

    await flush();
    expect(FakeWorker.instances[1].postedMessages.length).toBe(1);

    ctrl.dispose();
  });

  it('dispose 清理全部 timeout，后续不触发回调', async () => {
    const ctrl = createQueue({ poolSize: 1, timeoutMs: 1000, format: 'webp', quality: 75 });
    ctrl.enqueue([makeJpegFile()]);
    await flush();

    expect(ctrl.getItems()[0].status).toBe('processing');

    ctrl.dispose();
    const statusBefore = ctrl.getItems()[0].status;

    await vi.advanceTimersByTimeAsync(2000);
    expect(ctrl.getItems()[0].status).toBe(statusBefore);
    expect(FakeWorker.instances.length).toBe(1);
  });
});