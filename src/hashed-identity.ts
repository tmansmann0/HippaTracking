import { hmacIdentifier } from './crypto-box.js'
import type { SanitizedRelayEvent } from './types.js'

export function hashedEventUserKey(
  secret: string,
  scope: 'audience' | 'event-log' | 'ga4-client' | 'meta-external',
  event: Pick<SanitizedRelayEvent, 'siteId' | 'clientId' | 'eventId'>,
) {
  const sourceId = event.clientId ?? event.eventId
  return hmacIdentifier(secret, `${scope}:${event.siteId}:${sourceId}`)
}

