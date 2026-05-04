export type PrivacyMode = 'strict' | 'attribution'

export type DestinationName = 'meta' | 'ga4'

export type RelayConfig = {
  port: number
  publicBaseUrl: string
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
