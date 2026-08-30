import { useState } from 'preact/hooks';
import { zipSync } from 'fflate';
import { t } from '../lib/i18n';
import { baseName } from '../lib/format';
import type { QueueItem } from '../lib/types';

interface ZipButtonProps {
  items: readonly QueueItem[];
  onAllDownloaded: () => void;
  onError: (message: string) => void;
}

function collectZipEntries(items: readonly QueueItem[]): Record<string, Uint8Array> {
  const entries: Record<string, Uint8Array> = {};
  const counters = new Map<string, number>();

  for (const item of items) {
    if (item.status !== 'done' || !item.result) continue;
    const extension = item.result.extension;
    const stem = baseName(item.file.name);
    const base = `${stem}_compressed.${extension}`;
    const count = counters.get(base) ?? 0;
    const name = count > 0 ? `${stem}_compressed_${count}.${extension}` : base;
    counters.set(base, count + 1);
    entries[name] = new Uint8Array(item.result.buffer);
  }
  return entries;
}

export function ZipButton({ items, onAllDownloaded, onError }: ZipButtonProps) {
  const [zipping, setZipping] = useState(false);
  const doneCount = items.filter((i) => i.status === 'done' && i.result).length;

  async function handleZip() {
    if (doneCount === 0 || zipping) return;
    setZipping(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 30));
      const entries = collectZipEntries(items);
      const zipped = zipSync(entries, { level: 0 });
      const blob = new Blob([zipped], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'picture-zip-compressed.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      onAllDownloaded();
    } catch {
      onError(t('result.zipError'));
    } finally {
      setZipping(false);
    }
  }

  return (
    <button class="btn btn--primary" type="button" disabled={doneCount === 0} onClick={handleZip}>
      {zipping ? t('result.zipping') : t('result.downloadAll')}
    </button>
  );
}