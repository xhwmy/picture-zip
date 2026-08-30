import { t } from '../lib/i18n';
import type { QueueItem } from '../lib/types';
import { ResultCard } from './ResultCard';

interface QueueListProps {
  items: readonly QueueItem[];
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancelAll: () => void;
  onDownloaded: (id: string) => void;
}

export function QueueList({
  items,
  paused,
  onPause,
  onResume,
  onCancelAll,
  onDownloaded,
}: QueueListProps) {
  const hasItems = items.length > 0;
  const activeCount = items.filter((i) => i.status === 'pending' || i.status === 'processing').length;

  return (
    <div class="queue">
      <div class="queue__head">
        <h2 class="queue__title">
          {t('queue.title')}
          {hasItems && <span class="queue__count">{activeCount}</span>}
        </h2>
        {hasItems && (
          <div class="queue__controls">
            {activeCount > 0 && (
              <button class="btn btn--ghost btn--sm" type="button" onClick={() => (paused ? onResume() : onPause())}>
                {paused ? t('queue.resume') : t('queue.pause')}
              </button>
            )}
            <button class="btn btn--danger btn--sm" type="button" onClick={onCancelAll}>
              {t('queue.cancelAll')}
            </button>
          </div>
        )}
      </div>

      {!hasItems ? (
        <div class="queue__empty">{t('queue.empty')}</div>
      ) : (
        <div class="queue__list">
          {items.map((item) => (
            <ResultCard key={item.id} item={item} onDownloaded={onDownloaded} />
          ))}
        </div>
      )}
    </div>
  );
}