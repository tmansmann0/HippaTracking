import type { AppSettings, RelayConfig } from './types.js'

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
  }
}

export function parseCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
