import type { AppSettings, ConsentSettings, RelayConfig } from './types.js'

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
    },
  }
}

export function defaultConsentSettings(): ConsentSettings {
  return {
    preset: 'modal_accept_manage_deny',
    respectOptOutSignals: true,
    requiredRegionCodes: defaultRequiredRegionCodes,
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
