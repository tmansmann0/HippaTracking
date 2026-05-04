import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'
import { buildGa4Payload } from '../src/destinations/ga4.js'
import { buildMetaPayload } from '../src/destinations/meta.js'
import { sanitizeIncomingEvent } from '../src/sanitize.js'
import { hmacIdentifier } from '../src/crypto-box.js'

const config = loadConfig({
  PRIVACY_MODE: 'strict',
  APP_SECRET: 'test-app-secret',
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
      user_data: {
        external_id: hmacIdentifier(
          'test-app-secret',
          'meta-external:default:client.123',
        ),
      },
      custom_data: { value: 99, currency: 'USD' },
    })
    expect(payload.data[0]?.user_data).not.toHaveProperty('fbp')
    expect(payload.data[0]?.user_data).not.toHaveProperty('fbc')
    expect(payload.data[0]?.user_data).not.toHaveProperty('client_user_agent')
    expect(payload.test_event_code).toBe('TEST123')
  })

  it('builds a GA4 Measurement Protocol payload with hashed identity and sanitized page_location', () => {
    const payload = buildGa4Payload(event, config)
    const expectedUserKey = hmacIdentifier('test-app-secret', 'ga4-client:default:client.123')

    expect(payload.client_id).toBe(expectedUserKey)
    expect(payload.user_id).toBe(expectedUserKey)
    expect(payload.client_id).not.toBe('client.123')
    expect(payload.consent).toEqual({
      ad_user_data: 'DENIED',
      ad_personalization: 'DENIED',
    })
    expect(payload.events[0]?.name).toBe('schedule')
    expect(payload.events[0]?.params.page_location).toBe('https://clinic.example/redacted')
    expect(Object.hasOwn(payload.events[0]?.params ?? {}, 'service')).toBe(false)
  })
})
