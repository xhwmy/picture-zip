import { t } from '../lib/i18n';
import type { CompressSettings, OutputFormat } from '../lib/types';

interface SettingsPanelProps {
  settings: CompressSettings;
  onChange: (next: CompressSettings) => void;
  targetModeDisabled?: boolean;
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

export function SettingsPanel({ settings, onChange, targetModeDisabled }: SettingsPanelProps) {
  const targetMode = settings.targetSizeKB !== undefined;
  const qualityLocked = targetMode;

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

  return (
    <div class="settings">
      <h2 class="settings__title">{t('settings.title')}</h2>

      <div class="settings__row">
        <label class="settings__label">{t('settings.format')}</label>
        <div class="segmented">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              type="button"
              class={`segmented__item${settings.format === fmt.value ? ' segmented__item--active' : ''}`}
              onClick={() => update({ format: fmt.value })}
            >
              {t(fmt.label)}
            </button>
          ))}
        </div>
      </div>

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
        <div class="settings__dims">
          <input
            class="input"
            type="number"
            min="1"
            placeholder={t('settings.maxWidth')}
            value={settings.maxWidth ?? ''}
            onInput={(e) => {
              const v = (e.currentTarget as HTMLInputElement).value;
              update({ maxWidth: v ? Number(v) : undefined });
            }}
          />
          <span class="settings__x">×</span>
          <input
            class="input"
            type="number"
            min="1"
            placeholder={t('settings.maxHeight')}
            value={settings.maxHeight ?? ''}
            onInput={(e) => {
              const v = (e.currentTarget as HTMLInputElement).value;
              update({ maxHeight: v ? Number(v) : undefined });
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
    </div>
  );
}