import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createQueue, type QueueController } from '../lib/queue';
import { t } from '../lib/i18n';
import { formatBytes, formatPercent } from '../lib/format';
import type { CompressSettings, QueueItem } from '../lib/types';
import { Uploader } from './Uploader';
import { SettingsPanel } from './SettingsPanel';
import { QueueList } from './QueueList';
import { ZipButton } from './ZipButton';

interface ImageToolProps {
  initialSettings?: Partial<CompressSettings>;
  targetModeDisabled?: boolean;
}

export function ImageTool({ initialSettings, targetModeDisabled }: ImageToolProps) {
  const queueRef = useRef<QueueController | null>(null);
  if (!queueRef.current) {
    queueRef.current = createQueue({ format: 'webp', quality: 75, ...initialSettings });
  }
  const queue = queueRef.current;

  const [settings, setSettings] = useState<CompressSettings>({
    format: 'webp',
    quality: 75,
    ...initialSettings,
  });
  const [items, setItems] = useState<readonly QueueItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return queue.subscribe((snapshot) => {
      setItems(snapshot);
    });
  }, [queue]);

  useEffect(() => {
    queue.setSettings(settings);
  }, [queue, settings]);

  useEffect(() => {
    return () => queue.dispose();
  }, [queue]);

  const stats = useMemo(() => {
    let totalOriginal = 0;
    let totalCompressed = 0;
    let doneCount = 0;
    for (const item of items) {
      if (item.status === 'done' && item.result) {
        totalOriginal += item.originalSize;
        totalCompressed += item.result.byteLength;
        doneCount += 1;
      }
    }
    const savedBytes = totalOriginal - totalCompressed;
    const savedPercent = totalOriginal > 0 ? (savedBytes / totalOriginal) * 100 : 0;
    return { totalOriginal, totalCompressed, savedBytes, savedPercent, doneCount };
  }, [items]);

  const hasUndownloaded = useMemo(() => {
    return items.some((i) => i.status === 'done' && i.result && !downloadedIds.has(i.id));
  }, [items, downloadedIds]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUndownloaded) return;
      event.preventDefault();
      event.returnValue = t('beforeunload');
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUndownloaded]);

  function handleFiles(files: File[]) {
    setError(null);
    queue.enqueue(files);
  }

  function handleDownloaded(id: string) {
    setDownloadedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function handleAllDownloaded() {
    setDownloadedIds((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (item.status === 'done' && item.result) next.add(item.id);
      }
      return next;
    });
  }


  return (
    <div class="tool">
      <div class="tool__layout">
        <aside class="tool__side">
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            targetModeDisabled={targetModeDisabled}
          />
          <Uploader onFiles={handleFiles} />
        </aside>

        <section class="tool__main">
          {stats.doneCount > 0 && (
            <div class="result-bar">
              <div class="result-bar__stat">
                <span class="result-bar__label">{t('result.done', { count: stats.doneCount })}</span>
                <span class="result-bar__saved">
                  {t('result.totalSaved', {
                    size: formatBytes(stats.savedBytes),
                    percent: formatPercent(stats.savedPercent),
                  })}
                </span>
              </div>
              <ZipButton
                items={items}
                onAllDownloaded={handleAllDownloaded}
                onError={setError}
              />
            </div>
          )}

          {error && <div class="tool__error">{error}</div>}

          <QueueList
            items={items}
            paused={paused}
            onPause={() => {
              queue.pause();
              setPaused(true);
            }}
            onResume={() => {
              queue.resume();
              setPaused(false);
            }}
            onCancelAll={queue.cancelAll}
            onDownloaded={handleDownloaded}
          />
        </section>
      </div>
    </div>
  );
}