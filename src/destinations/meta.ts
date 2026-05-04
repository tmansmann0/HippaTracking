import type { DestinationResult, RelayConfig, SanitizedRelayEvent } from '../types.js'

type MetaEvent = {
  event_name: string
  event_time: number
  event_id: string
  action_source: 'website'
  event_source_url: string
  user_data: Record<string, string>
  custom_data?: Record<string, string | number>
}

export function buildMetaPayload(event: SanitizedRelayEvent, config: RelayConfig) {
  const metaEvent: MetaEvent = {
    event_name: event.eventName,
    event_time: event.eventTime,
    event_id: event.eventId,
    action_source: 'website',
    event_source_url: event.safeUrl,
    user_data: buildMetaUserData(event),
    ...(Object.keys(event.customData).length ? { custom_data: event.customData } : {}),
  }

  return {
    data: [metaEvent],
    ...(config.meta.testEventCode ? { test_event_code: config.meta.testEventCode } : {}),
  }
}

export async function sendToMeta(
  event: SanitizedRelayEvent,
  config: RelayConfig,
): Promise<DestinationResult> {
  if (!config.meta.enabled) {
    return skipped('Meta forwarding disabled.')
  }

  if (!config.meta.pixelId || !config.meta.accessToken) {
    return skipped('Meta forwarding enabled, but META_PIXEL_ID or META_ACCESS_TOKEN is missing.')
  }

  const requestBody = buildMetaPayload(event, config)
  const endpoint = `https://graph.facebook.com/${config.meta.graphVersion}/${config.meta.pixelId}/events?access_token=${encodeURIComponent(config.meta.accessToken)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })
  const responseBody = await safeJson(response)

  return {
    destination: 'meta',
    skipped: false,
    ok: response.ok,
    statusCode: response.status,
    message: response.ok ? 'Forwarded to Meta Conversions API.' : 'Meta API returned an error.',
    requestBody: redactMetaRequest(requestBody),
    responseBody,
  }
}

function buildMetaUserData(event: SanitizedRelayEvent) {
  const userData: Record<string, string> = {}

  if (event.fbp) userData.fbp = event.fbp
  if (event.fbc) userData.fbc = event.fbc
  if (event.userAgent) userData.client_user_agent = event.userAgent

  return userData
}

function skipped(message: string): DestinationResult {
  return {
    destination: 'meta',
    skipped: true,
    message,
  }
}

function redactMetaRequest(requestBody: ReturnType<typeof buildMetaPayload>) {
  return {
    ...requestBody,
    data: requestBody.data.map((event) => ({
      ...event,
      user_data: Object.fromEntries(
        Object.entries(event.user_data).map(([key]) => [key, '[present]']),
      ),
    })),
  }
}

async function safeJson(response: Response) {
  const text = await response.text()
  if (!text) return undefined

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}
