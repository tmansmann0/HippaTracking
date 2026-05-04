import type { DestinationResult, RelayConfig, SanitizedRelayEvent } from '../types.js'

export function buildGa4Payload(event: SanitizedRelayEvent) {
  return {
    client_id: event.clientId,
    non_personalized_ads: true,
    timestamp_micros: event.eventTime * 1_000_000,
    events: [
      {
        name: toGa4EventName(event.eventName),
        params: {
          event_id: event.eventId,
          page_location: event.safeUrl,
          sensitive_context: event.sensitiveContext ? 'redacted' : 'none',
          ...event.customData,
        },
      },
    ],
  }
}

export async function sendToGa4(
  event: SanitizedRelayEvent,
  config: RelayConfig,
): Promise<DestinationResult> {
  if (!config.ga4.enabled) {
    return skipped('GA4 forwarding disabled.')
  }

  if (!config.ga4.measurementId || !config.ga4.apiSecret) {
    return skipped('GA4 forwarding enabled, but GA4_MEASUREMENT_ID or GA4_API_SECRET is missing.')
  }

  const requestBody = buildGa4Payload(event)
  const base =
    config.ga4.endpointRegion === 'eu'
      ? 'https://region1.google-analytics.com/mp/collect'
      : 'https://www.google-analytics.com/mp/collect'
  const endpoint = new URL(base)
  endpoint.searchParams.set('measurement_id', config.ga4.measurementId)
  endpoint.searchParams.set('api_secret', config.ga4.apiSecret)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  return {
    destination: 'ga4',
    skipped: false,
    ok: response.ok,
    statusCode: response.status,
    message: response.ok ? 'Forwarded to GA4 Measurement Protocol.' : 'GA4 endpoint returned an error.',
    requestBody,
    responseBody: await response.text(),
  }
}

function toGa4EventName(eventName: string) {
  return eventName
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^([^a-zA-Z])/, 'event_$1')
    .slice(0, 40)
    .toLowerCase()
}

function skipped(message: string): DestinationResult {
  return {
    destination: 'ga4',
    skipped: true,
    message,
  }
}
