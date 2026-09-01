import { useEffect, useState } from 'preact/hooks';
import { t } from '../lib/i18n';
import type { CompressSettings, OutputFormat } from '../lib/types';
import { RESIZE_PRESETS, RESIZE_PRESET_CATEGORIES } from '../lib/resizePresets';

interface SettingsPanelProps {
  settings: CompressSettings;
  onChange: (next: CompressSettings) => void;
  targetModeDisabled?: boolean;
  hasGif?: boolean;
}

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'auto', label: 'settings.formatAuto' },
  { value: 'jpeg', label: 'settings.formatJpeg' },
  { value: 'png', label: 'settings.formatPng' },
  { value: 'webp', label: 'settings.formatWebp' },
  { value: 'avif', label: 'settings.formatAvif' },
];

const PRESETS: { label: string; settings: Partial<CompressSettings> }[] = [
  { label: 'settings.presetWeb', settings: { format: 'webp', quality: 75 } },
  { label: 'settings.presetExtreme', settings: { format: 'avif', quality: 50 } },
  { label: 'settings.presetCompat', settings: { format: 'jpeg', quality: 80 } },
];

export function SettingsPanel({ settings, onChange, targetModeDisabled, hasGif }: SettingsPanelProps) {
  const targetMode = settings.targetSizeKB !== undefined;
  const qualityLocked = targetMode;
  const [collapsed, setCollapsed] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)');
    setCollapsed(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function update(patch: Partial<CompressSettings>) {
    onChange({ ...settings, ...patch });
  }

  function toggleTargetMode() {
    if (targetMode) {
      const { targetSizeKB, ...rest } = settings;
      onChange(rest);
    } else {
      update({ targetSizeKB: 100 });
    }
  }

  function onPresetChange(e: Event) {
    const selectedId = (e.currentTarget as HTMLSelectElement).value;
    const preset = RESIZE_PRESETS.find((p) => p.id === selectedId);
    if (preset && preset.id !== 'custom') {
      update({ maxWidth: preset.maxWidth, maxHeight: preset.maxHeight });
    }
    setSelectedPresetId(selectedId);
  }

  return (
    <div class="settings">
      <h2 class="sr-only" id="settings-heading">{t('settings.title')}</h2>
      <button
        class="settings__toggle"
        type="button"
        aria-expanded={!collapsed}
        aria-labelledby="settings-heading"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span aria-hidden="true">{t('settings.title')}</span>
        <span class={`settings__toggle-arrow${collapsed ? '' : ' settings__toggle-arrow--open'}`} aria-hidden="true">▾</span>
      </button>
      {!collapsed && (
        <>
      <div class="settings__row">
        <label class="settings__label">{t('settings.format')}</label>
        <div class="segmented">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              type="button"
              class={`segmented__item${settings.format === fmt.value ? ' segmented__item--active' : ''}`}
              aria-pressed={settings.format === fmt.value}
              onClick={() => update({ format: fmt.value })}
            >
              {t(fmt.label)}
            </button>
          ))}
        </div>
      </div>
      {hasGif && (
        <p class="settings__hint">{t('settings.gifOutputHint')}</p>
      )}

      <div class={`settings__row${qualityLocked ? ' settings__row--locked' : ''}`}>
        <label class="settings__label" htmlFor="quality">
          {t('settings.quality')}
          <span class="settings__value">{settings.quality}</span>
        </label>
        <input
          id="quality"
          type="range"
          min="1"
          max="100"
          step="1"
          value={settings.quality}
          disabled={qualityLocked}
          onInput={(e) => update({ quality: Number((e.currentTarget as HTMLInputElement).value) })}
        />
      </div>

      <div class="settings__row">
        <label class="settings__label">{t('settings.resizeHint')}</label>
        <select
          class="settings__preset-select"
          value={selectedPresetId}
          onChange={onPresetChange}
          aria-label={t('settings.resizePresetLabel')}
        >
          <option value="custom">{t('settings.resizePresetCustom')}</option>
          {RESIZE_PRESET_CATEGORIES.map((cat) => (
            <optgroup label={t(cat.labelKey)}>
              {RESIZE_PRESETS.filter((p) => p.category === cat.id).map((p) => (
                <option value={p.id}>{t(p.labelKey)} {p.maxWidth}×{p.maxHeight} px</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div class="settings__dims">
          <input
            class="input"
            type="number"
            min="1"
            placeholder={t('settings.maxWidth')}
            aria-label={t('settings.maxWidth')}
            value={settings.maxWidth ?? ''}
            onInput={(e) => {
              const v = (e.currentTarget as HTMLInputElement).value;
              update({ maxWidth: v ? Number(v) : undefined });
              setSelectedPresetId('custom');
            }}
          />
          <span class="settings__x">×</span>
          <input
            class="input"
            type="number"
            min="1"
            placeholder={t('settings.maxHeight')}
            aria-label={t('settings.maxHeight')}
            value={settings.maxHeight ?? ''}
            onInput={(e) => {
              const v = (e.currentTarget as HTMLInputElement).value;
              update({ maxHeight: v ? Number(v) : undefined });
              setSelectedPresetId('custom');
            }}
          />
        </div>
      </div>

      <div class="settings__row">
        <label class="settings__label">{t('settings.preset')}</label>
        <div class="presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              class="preset"
              onClick={() => onChange({ ...settings, ...preset.settings })}
            >
              {t(preset.label)}
            </button>
          ))}
        </div>
      </div>

      <div class={`settings__row settings__target${targetMode ? ' settings__target--on' : ''}`}>
        <div class="settings__target-head">
          <label class="settings__checkbox">
            <input
              type="checkbox"
              checked={targetMode}
              disabled={targetModeDisabled}
              onChange={toggleTargetMode}
            />
            <span>{t('settings.targetMode')}</span>
          </label>
        </div>
        {targetModeDisabled && (
          <p class="settings__hint">{t('settings.targetGifDisabled')}</p>
        )}
        {targetMode && (
          <div class="settings__target-body">
            <p class="settings__hint">{t('settings.targetDesc')}</p>
            <div class="settings__target-input">
              <input
                class="input"
                type="number"
                min="1"
                value={settings.targetSizeKB ?? ''}
                placeholder={t('settings.targetPlaceholder')}
                aria-label={t('settings.targetLabel')}
                onInput={(e) => {
                  const v = Number((e.currentTarget as HTMLInputElement).value);
                  update({ targetSizeKB: Number.isFinite(v) && v > 0 ? v : undefined });
                }}
              />
              <span>KB</span>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}