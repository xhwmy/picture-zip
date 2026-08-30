import { useEffect, useState } from 'preact/hooks';
import { t } from '../lib/i18n';
import { buildDownloadFilename, formatBytes, formatPercent } from '../lib/format';
import type { QueueItem } from '../lib/types';

interface ResultCardProps {
  item: QueueItem;
  onDownloaded: (id: string) => void;
}

function statusKey(status: QueueItem['status']): string {
  return `status.${status}`;
}

function errorText(reason?: string): string {
  switch (reason) {
    case 'format-not-supported':
      return t('error.formatNotSupported');
    case 'decode-error':
      return t('error.decodeError');
    case 'encode-error':
      return t('error.encodeError');
    case 'memory-error':
      return t('error.memoryError');
    case 'wasm-unsupported':
      return t('error.wasmUnsupported');
    case 'timeout':
      return t('error.timeout');
    case 'read-error':
      return t('error.readError');
    case 'worker-error':
      return t('error.workerError');
    default:
      return reason ?? t('error.encodeError');
  }
}

export function ResultCard({ item, onDownloaded }: ResultCardProps) {
  const [thumbUrl, setThumbUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (item.status === 'done' && item.result) {
      const blob = new Blob([item.result.buffer], { type: item.result.mimeType });
      const url = URL.createObjectURL(blob);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (item.file) {
      const url = URL.createObjectURL(item.file);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setThumbUrl(undefined);
    return undefined;
  }, [item.id, item.status, item.result]);

  function download() {
    if (!item.result) return;
    const blob = new Blob([item.result.buffer], { type: item.result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildDownloadFilename(item.file.name, item.result.extension);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    onDownloaded(item.id);
  }

  const savedPercent =
    item.result && item.originalSize > 0
      ? ((item.originalSize - item.result.byteLength) / item.originalSize) * 100
      : 0;

  return (
    <div class={`result-card result-card--${item.status}`}>
      <div class="result-card__thumb">
        {thumbUrl ? <img src={thumbUrl} alt={item.file.name} loading="lazy" /> : <div class="result-card__thumb-empty" />}
        {item.status === 'processing' && <div class="spinner" />}
      </div>
      <div class="result-card__body">
        <div class="result-card__name" title={item.file.name}>
          {item.file.name}
        </div>
        {item.status === 'done' && item.result ? (
          <>
            <div class="result-card__sizes">
              <span class="result-card__orig">{formatBytes(item.originalSize)}</span>
              <span aria-hidden="true">→</span>
              <strong>{formatBytes(item.result.byteLength)}</strong>
              <span class={`badge${savedPercent > 0 ? ' badge--green' : ''}`}>
                {formatPercent(savedPercent)}
              </span>
            </div>
            {item.result.targetReached !== undefined && (
              <div class="result-card__target">
                {item.result.targetReached
                  ? t('result.targetReached', { size: formatBytes(item.result.byteLength) })
                  : t('result.targetMin', { size: formatBytes(item.result.byteLength) })}
              </div>
            )}
          </>
        ) : (
          <div class="result-card__status">
            <span class={`badge badge--${item.status === 'failed' ? 'red' : item.status === 'skipped' ? 'amber' : 'accent'}`}>
              {t(statusKey(item.status))}
            </span>
            {item.errorReason && <span class="result-card__error">{errorText(item.errorReason)}</span>}
          </div>
        )}
      </div>
      <div class="result-card__actions">
        {item.status === 'done' && item.result ? (
          <button class="btn btn--ghost btn--sm" type="button" onClick={download}>
            {t('result.download')}
          </button>
        ) : item.status === 'failed' || item.status === 'skipped' ? (
          <span class="result-card__done" />
        ) : null}
      </div>
    </div>
  );
}