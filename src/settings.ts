import type { AppSettings, ConsentSettings, ConsentTheme, RelayConfig } from './types.js'

const defaultRequiredRegionCodes = [
  'CA',
  'CO',
  'CT',
  'DE',
  'MD',
  'MN',
  'MT',
  'NE',
  'NH',
  'NJ',
  'OR',
  'RI',
  'TX',
  'VA',
]

export function defaultSettings(config: RelayConfig): AppSettings {
  return {
    siteId: config.siteId,
    allowedOrigins: config.allowedOrigins,
    privacyMode: config.privacyMode,
    sensitivePathPatterns: config.sensitivePathPatterns,
    allowedCustomDataKeys: config.allowedCustomDataKeys,
    features: {
      metaTracking: config.meta.enabled,
      googleAnalytics: config.ga4.enabled,
      sessionRecording: false,
      consentManager: false,
      audienceBuilder: false,
    },
    consent: defaultConsentSettings(),
  }
}

export function normalizeSettings(settings: AppSettings, config: RelayConfig): AppSettings {
  const defaults = defaultSettings(config)

  return {
    ...defaults,
    ...settings,
    features: {
      ...defaults.features,
      ...settings.features,
    },
    consent: {
      ...defaults.consent,
      ...settings.consent,
      requiredRegionCodes:
        settings.consent?.requiredRegionCodes?.map(normalizeRegionCode).filter(Boolean) ??
        defaults.consent.requiredRegionCodes,
      theme: normalizeConsentTheme(settings.consent?.theme ?? defaults.consent.theme),
    },
  }
}

export function defaultConsentSettings(): ConsentSettings {
  return {
    preset: 'modal_accept_manage_deny',
    respectOptOutSignals: true,
    requiredRegionCodes: defaultRequiredRegionCodes,
    theme: defaultConsentTheme(),
  }
}

export function defaultConsentTheme(): ConsentTheme {
  return {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    panelBackgroundColor: '#ffffff',
    textColor: '#111827',
    mutedTextColor: '#4b5563',
    primaryButtonBackgroundColor: '#111827',
    primaryButtonTextColor: '#ffffff',
    secondaryButtonBackgroundColor: '#ffffff',
    secondaryButtonTextColor: '#111827',
    borderColor: '#e5e7eb',
    overlayColor: '#0f172a',
    borderRadiusPx: 8,
  }
}

export function normalizeConsentTheme(theme: Partial<ConsentTheme> | undefined): ConsentTheme {
  const defaults = defaultConsentTheme()
  const input = theme ?? {}

  return {
    fontFamily: normalizeFontFamily(input.fontFamily, defaults.fontFamily),
    panelBackgroundColor: normalizeColor(
      input.panelBackgroundColor,
      defaults.panelBackgroundColor,
    ),
    textColor: normalizeColor(input.textColor, defaults.textColor),
    mutedTextColor: normalizeColor(input.mutedTextColor, defaults.mutedTextColor),
    primaryButtonBackgroundColor: normalizeColor(
      input.primaryButtonBackgroundColor,
      defaults.primaryButtonBackgroundColor,
    ),
    primaryButtonTextColor: normalizeColor(
      input.primaryButtonTextColor,
      defaults.primaryButtonTextColor,
    ),
    secondaryButtonBackgroundColor: normalizeColor(
      input.secondaryButtonBackgroundColor,
      defaults.secondaryButtonBackgroundColor,
    ),
    secondaryButtonTextColor: normalizeColor(
      input.secondaryButtonTextColor,
      defaults.secondaryButtonTextColor,
    ),
    borderColor: normalizeColor(input.borderColor, defaults.borderColor),
    overlayColor: normalizeColor(input.overlayColor, defaults.overlayColor),
    borderRadiusPx: normalizeRadius(input.borderRadiusPx, defaults.borderRadiusPx),
  }
}

export function parseCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parseRegionCodes(value: string) {
  return value
    .split(/[\n,]/)
    .map(normalizeRegionCode)
    .filter(Boolean)
}

function normalizeRegionCode(value: string) {
  return value.trim().toUpperCase().replace(/^US-/, '')
}

function normalizeColor(value: string | undefined, fallback: string) {
  const normalized = value?.trim() ?? ''
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback
}

function normalizeFontFamily(value: string | undefined, fallback: string) {
  const normalized = (value ?? '').trim().slice(0, 180)
  return /^[a-zA-Z0-9\s"',.-]+$/.test(normalized) ? normalized : fallback
}

function normalizeRadius(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(Math.max(Math.round(value), 0), 24)
}
