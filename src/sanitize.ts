import { createHash, randomUUID } from 'node:crypto'
import type { IncomingRelayEvent, RelayConfig, SanitizedRelayEvent } from './types.js'

const metaStandardEventNames = new Set([
  'PageView',
  'Lead',
  'Contact',
  'CompleteRegistration',
  'Schedule',
  'SubmitApplication',
  'Purchase',
])

export function sanitizeIncomingEvent(
  incoming: IncomingRelayEvent,
  config: RelayConfig,
): SanitizedRelayEvent {
  const parsedUrl = parseIncomingUrl(incoming.url)
  const sourceOrigin = parsedUrl?.origin ?? 'unknown'
  const detectedSignals = detectSensitiveSignals(incoming, config)
  const sensitiveContext = detectedSignals.length > 0
  const droppedFields = [
    'raw_url_query',
    'raw_url_hash',
    'title',
    'referrer',
    'ip_address',
    'email',
    'phone',
    'fbp',
    'fbc',
    'user_agent',
  ]
  const safeUrl = buildSafeUrl(parsedUrl, sensitiveContext)
  const consent = incoming.consent ?? 'unknown'
  const clientId = incoming.clientId ?? stableFallbackClientId(incoming)

  return {
    siteId: incoming.siteId,
    eventName: normalizeEventName(incoming.eventName),
    eventId: incoming.eventId ?? randomUUID(),
    eventTime: Math.floor((incoming.timestamp ?? Date.now()) / 1000),
    sourceOrigin,
    safeUrl,
    sensitiveContext,
    detectedSignals,
    consent,
    clientId,
    customData: sanitizeCustomData(incoming.customData, config.allowedCustomDataKeys),
    droppedFields,
  }
}

export function detectSensitiveSignals(
  incoming: Pick<IncomingRelayEvent, 'url' | 'title' | 'referrer' | 'eventName'>,
  config: Pick<RelayConfig, 'sensitivePathPatterns'>,
) {
  const haystack = [incoming.url, incoming.title, incoming.referrer, incoming.eventName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return config.sensitivePathPatterns.filter((pattern) =>
    haystack.includes(pattern.toLowerCase()),
  )
}

export function normalizeEventName(eventName: string) {
  const trimmed = eventName.trim()

  if (metaStandardEventNames.has(trimmed)) {
    return trimmed
  }

  const normalized = trimmed
    .replace(/[^a-zA-Z0-9_ -]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80)

  return normalized || 'CustomEvent'
}

function parseIncomingUrl(url: string) {
  try {
    return new URL(url)
  } catch {
    try {
      return new URL(url, 'https://unknown.invalid')
    } catch {
      return null
    }
  }
}

function buildSafeUrl(url: URL | null, sensitiveContext: boolean) {
  if (!url) {
    return 'about:blank'
  }

  const path = sensitiveContext ? '/redacted' : url.pathname || '/'
  return `${url.origin}${path}`
}

function sanitizeCustomData(
  customData: IncomingRelayEvent['customData'],
  allowedKeys: string[],
) {
  if (!customData) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(customData)
      .filter(([key]) => allowedKeys.includes(key))
      .flatMap(([key, value]) => {
        if (typeof value === 'boolean') {
          return []
        }

        if (key === 'currency' && typeof value === 'string') {
          return [[key, value.toUpperCase().slice(0, 3)]]
        }

        return [[key, value]]
      }),
  )
}

function stableFallbackClientId(incoming: IncomingRelayEvent) {
  const digest = createHash('sha256')
    .update(`${incoming.siteId}:${incoming.eventId ?? incoming.url}`)
    .digest('hex')
    .slice(0, 24)

  return `relay.${digest}`
}
