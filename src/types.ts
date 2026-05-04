export type PrivacyMode = 'strict' | 'attribution'

export type DestinationName = 'meta' | 'ga4'

export type RelayConfig = {
  port: number
  publicBaseUrl: string
  appSecret: string
  encryptionKey: string
  databaseUrl?: string | undefined
  siteId: string
  allowedOrigins: string[]
  privacyMode: PrivacyMode
  sensitivePathPatterns: string[]
  allowedCustomDataKeys: string[]
  eventLogPath?: string | undefined
  meta: {
    enabled: boolean
    pixelId?: string | undefined
    accessToken?: string | undefined
    graphVersion: string
    testEventCode?: string | undefined
  }
  ga4: {
    enabled: boolean
    measurementId?: string | undefined
    apiSecret?: string | undefined
    endpointRegion: 'global' | 'eu'
  }
}

export type ConsentState = 'granted' | 'denied' | 'unknown'

export type ConsentPreset =
  | 'modal_accept_options'
  | 'modal_accept_manage_deny'
  | 'bottom_auto_except_required'

export type ConsentCategories = {
  analytics: boolean
  advertising: boolean
  recording: boolean
}

export type ConsentCategoryInput = {
  analytics?: boolean | undefined
  advertising?: boolean | undefined
  recording?: boolean | undefined
}

export type ConsentSettings = {
  preset: ConsentPreset
  respectOptOutSignals: boolean
  requiredRegionCodes: string[]
  theme: ConsentTheme
}

export type ConsentTheme = {
  fontFamily: string
  panelBackgroundColor: string
  textColor: string
  mutedTextColor: string
  primaryButtonBackgroundColor: string
  primaryButtonTextColor: string
  secondaryButtonBackgroundColor: string
  secondaryButtonTextColor: string
  borderColor: string
  overlayColor: string
  borderRadiusPx: number
}

export type IncomingRelayEvent = {
  siteId: string
  eventName: string
  eventId?: string | undefined
  url: string
  title?: string | undefined
  referrer?: string | undefined
  clientId?: string | undefined
  fbp?: string | undefined
  fbc?: string | undefined
  userAgent?: string | undefined
  consent?: ConsentState | undefined
  consentCategories?: ConsentCategoryInput | undefined
  customData?: Record<string, string | number | boolean> | undefined
  timestamp?: number | undefined
}

export type SanitizedRelayEvent = {
  siteId: string
  eventName: string
  eventId: string
  eventTime: number
  sourceOrigin: string
  safeUrl: string
  sensitiveContext: boolean
  detectedSignals: string[]
  consent: ConsentState
  clientId?: string | undefined
  fbp?: string | undefined
  fbc?: string | undefined
  userAgent?: string | undefined
  consentCategories: ConsentCategories
  customData: Record<string, string | number>
  droppedFields: string[]
}

export type DestinationResult = {
  destination: DestinationName
  skipped: boolean
  statusCode?: number | undefined
  ok?: boolean | undefined
  message: string
  requestBody?: unknown | undefined
  responseBody?: unknown | undefined
}

export type CollectResponse = {
  accepted: true
  eventId: string
  sensitiveContext: boolean
  detectedSignals: string[]
  droppedFields: string[]
  destinations: DestinationResult[]
}

export type FeatureFlags = {
  metaTracking: boolean
  googleAnalytics: boolean
  sessionRecording: boolean
  consentManager: boolean
  audienceBuilder: boolean
}

export type AppSettings = {
  siteId: string
  allowedOrigins: string[]
  privacyMode: PrivacyMode
  sensitivePathPatterns: string[]
  allowedCustomDataKeys: string[]
  features: FeatureFlags
  consent: ConsentSettings
}

export type AdminUser = {
  id: string
  email: string
  passwordHash: string
  recoveryKeyHash: string
  createdAt: string
}

export type ConsentEvent = {
  siteId: string
  clientId: string
  consent: ConsentState
  categories: ConsentCategories
  reason?: string | undefined
  regionCode?: string | undefined
  url?: string | undefined
  timestamp: number
}

export type RecordingChunk = {
  siteId: string
  sessionId: string
  clientId: string
  url: string
  events: unknown[]
  timestamp: number
}

export type AudienceRule = {
  id: string
  name: string
  eventName?: string | undefined
  urlContains?: string | undefined
  minValue?: number | undefined
  createdAt: string
}

export type AudienceInput = {
  name: string
  eventName?: string | undefined
  urlContains?: string | undefined
  minValue?: number | undefined
}

export type DashboardStats = {
  consentEvents: number
  recordingChunks: number
  audienceRules: number
  audienceMembers: number
}
