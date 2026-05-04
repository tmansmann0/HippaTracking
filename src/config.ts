import 'dotenv/config'
import type { PrivacyMode, RelayConfig } from './types.js'

const defaultSensitivePathPatterns = [
  'botox',
  'filler',
  'laser',
  'body-contouring',
  'coolsculpting',
  'semaglutide',
  'tirzepatide',
  'glp-1',
  'weight-loss',
  'hormone',
  'iv-therapy',
  'consultation',
]

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RelayConfig {
  const privacyMode = parsePrivacyMode(env.PRIVACY_MODE)
  const eventLogPath = optional(env.EVENT_LOG_PATH)

  return {
    port: Number(env.PORT ?? 3000),
    publicBaseUrl: optional(env.PUBLIC_BASE_URL) ?? `http://localhost:${env.PORT ?? 3000}`,
    appSecret: optional(env.APP_SECRET) ?? 'dev-secret-change-me',
    encryptionKey: optional(env.APP_ENCRYPTION_KEY) ?? 'dev-encryption-key-change-me',
    ...(optional(env.DATABASE_URL) ? { databaseUrl: optional(env.DATABASE_URL) } : {}),
    siteId: optional(env.RELAY_SITE_ID) ?? 'default',
    allowedOrigins: csv(env.ALLOWED_ORIGINS),
    privacyMode,
    sensitivePathPatterns:
      csv(env.SENSITIVE_PATH_PATTERNS).length > 0
        ? csv(env.SENSITIVE_PATH_PATTERNS)
        : defaultSensitivePathPatterns,
    allowedCustomDataKeys:
      csv(env.ALLOWED_CUSTOM_DATA_KEYS).length > 0
        ? csv(env.ALLOWED_CUSTOM_DATA_KEYS)
        : ['value', 'currency'],
    ...(eventLogPath ? { eventLogPath } : {}),
    meta: {
      enabled: env.META_ENABLED === 'true',
      ...(optional(env.META_PIXEL_ID) ? { pixelId: optional(env.META_PIXEL_ID) } : {}),
      ...(optional(env.META_ACCESS_TOKEN)
        ? { accessToken: optional(env.META_ACCESS_TOKEN) }
        : {}),
      graphVersion: optional(env.META_GRAPH_VERSION) ?? 'v21.0',
      ...(optional(env.META_TEST_EVENT_CODE)
        ? { testEventCode: optional(env.META_TEST_EVENT_CODE) }
        : {}),
    },
    ga4: {
      enabled: env.GA4_ENABLED === 'true',
      ...(optional(env.GA4_MEASUREMENT_ID)
        ? { measurementId: optional(env.GA4_MEASUREMENT_ID) }
        : {}),
      ...(optional(env.GA4_API_SECRET) ? { apiSecret: optional(env.GA4_API_SECRET) } : {}),
      endpointRegion: env.GA4_ENDPOINT_REGION === 'eu' ? 'eu' : 'global',
    },
  }
}

export function destinationReadiness(config: RelayConfig) {
  return {
    meta: {
      enabled: config.meta.enabled,
      configured: Boolean(config.meta.pixelId && config.meta.accessToken),
      requiredEnv: ['META_PIXEL_ID', 'META_ACCESS_TOKEN'],
    },
    ga4: {
      enabled: config.ga4.enabled,
      configured: Boolean(config.ga4.measurementId && config.ga4.apiSecret),
      requiredEnv: ['GA4_MEASUREMENT_ID', 'GA4_API_SECRET'],
    },
  }
}

function csv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parsePrivacyMode(value: string | undefined): PrivacyMode {
  return value === 'attribution' ? 'attribution' : 'strict'
}

function optional(value: string | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}
