function formatScaled(value: number): string {
  return value < 100 && !Number.isInteger(value) ? value.toFixed(1) : String(Math.round(value));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${formatScaled(bytes / 1024)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${formatScaled(bytes / (1024 * 1024))} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}


export function formatPercent(savedPercent: number): string {
  const rounded = Math.round(savedPercent * 10) / 10;
  return `-${rounded}%`;
}

export function baseName(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export function buildDownloadFilename(originalName: string, extension: string): string {
  return `${baseName(originalName)}_compressed.${extension}`;
}