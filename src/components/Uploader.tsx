import { useRef, useState } from 'preact/hooks';
import { t } from '../lib/i18n';
import { formatBytes } from '../lib/format';

interface UploaderProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  fileCount?: number;
  totalSize?: number;
}

const LARGE_FILE_THRESHOLD = 80 * 1024 * 1024;
const MANY_FILES_THRESHOLD = 200;

export function Uploader({ onFiles, disabled, fileCount = 0, totalSize = 0 }: UploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  function handleFiles(files: File[]) {
    let message: string | null = null;
    if (files.length > MANY_FILES_THRESHOLD) {
      message = t('uploader.tooMany');
    } else if (files.some((f) => f.size > LARGE_FILE_THRESHOLD)) {
      message = t('uploader.tooLarge');
    }
    setNotice(message);
    onFiles(files);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) handleFiles(files);
  }

  function onInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) handleFiles(files);
    input.value = '';
  }

  return (
    <div class="uploader">
      <label
        class={`dropzone${dragging ? ' dropzone--dragging' : ''}${disabled ? ' dropzone--disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
          multiple
          class="visually-hidden"
          onChange={onInput}
          disabled={disabled}
        />
        <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true" class="dropzone__icon">
          <rect width="64" height="64" rx="32" fill="#eff6ff" />
          <path d="M32 18l10 10-4 4-4-4v14h-4V28l-4 4-4-4z" fill="#2563eb" />
          <path d="M20 40h24v4H20z" fill="#2563eb" />
        </svg>
        <p class="dropzone__title">{t('uploader.title')}</p>
        <p class="dropzone__subtitle">{t('uploader.subtitle')}</p>
      </label>

      <div class="uploader__actions">
        <input
          ref={folderInput}
          type="file"
          // @ts-expect-error webkitdirectory is not typed
          webkitdirectory=""
          multiple
          class="visually-hidden"
          onChange={onInput}
        />
        <button class="btn btn--ghost" type="button" onClick={() => folderInput.current?.click()} disabled={disabled}>
          {t('uploader.folder')}
        </button>
      </div>

      {fileCount > 0 && (
        <div class="uploader__stats">
          <span class="uploader__count">{t('uploader.count', { count: fileCount, size: formatBytes(totalSize) })}</span>
        </div>
      )}
      {notice && <div class="uploader__notice">{notice}</div>}
      <p class="uploader__privacy">
        <span aria-hidden="true">🔒</span> {t('uploader.privacy')}
      </p>
    </div>
  );
}
