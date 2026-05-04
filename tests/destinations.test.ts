import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'
import { buildGa4Payload } from '../src/destinations/ga4.js'
import { buildMetaPayload } from '../src/destinations/meta.js'
import { sanitizeIncomingEvent } from '../src/sanitize.js'

const config = loadConfig({
  PRIVACY_MODE: 'strict',
  META_TEST_EVENT_CODE: 'TEST123',
})

const event = sanitizeIncomingEvent(
  {
    siteId: 'default',
    eventName: 'Schedule',
    eventId: 'evt_123',
    url: 'https://clinic.example/semaglutide?patient=1',
    title: 'Semaglutide consult',
    referrer: 'https://google.com/search?q=semaglutide',
    clientId: 'client.123',
    customData: { value: 99, currency: 'usd', service: 'semaglutide' },
  },
  config,
)

describe('destination payload builders', () => {
  it('builds a minimal Meta CAPI payload without direct identifiers', () => {
    const payload = buildMetaPayload(event, config)

    expect(payload.data[0]).toMatchObject({
      event_name: 'Schedule',
      event_time: event.eventTime,
      event_id: 'evt_123',
      action_source: 'website',
      event_source_url: 'https://clinic.example/redacted',
      user_data: {},
      custom_data: { value: 99, currency: 'USD' },
    })
    expect(payload.test_event_code).toBe('TEST123')
  })

  it('builds a GA4 Measurement Protocol payload with sanitized page_location', () => {
    const payload = buildGa4Payload(event)

    expect(payload.client_id).toBe('client.123')
    expect(payload.non_personalized_ads).toBe(true)
    expect(payload.events[0]?.name).toBe('schedule')
    expect(payload.events[0]?.params.page_location).toBe('https://clinic.example/redacted')
    expect(Object.hasOwn(payload.events[0]?.params ?? {}, 'service')).toBe(false)
  })
})
