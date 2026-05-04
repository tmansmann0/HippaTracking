import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'
import { sanitizeIncomingEvent } from '../src/sanitize.js'

const baseEvent = {
  siteId: 'default',
  eventName: 'Lead',
  url: 'https://clinic.example/botox-consultation?utm_source=ad&name=Jane',
  title: 'Botox Consultation',
  referrer: 'https://google.com/search?q=botox+near+me',
  clientId: 'client.123',
  fbp: 'fb.1.111.222',
  fbc: 'fb.1.111.click',
  userAgent: 'Example Browser',
  consent: 'granted' as const,
  customData: {
    value: 125,
    currency: 'usd',
    treatment: 'botox',
    debug: true,
  },
}

describe('sanitizeIncomingEvent', () => {
  it('redacts sensitive treatment pages and drops browser identifiers in strict mode', () => {
    const config = loadConfig({ PRIVACY_MODE: 'strict' })
    const sanitized = sanitizeIncomingEvent(baseEvent, config)

    expect(sanitized.sensitiveContext).toBe(true)
    expect(sanitized.safeUrl).toBe('https://clinic.example/redacted')
    expect(sanitized.detectedSignals).toContain('botox')
    expect(sanitized.fbp).toBeUndefined()
    expect(sanitized.fbc).toBeUndefined()
    expect(sanitized.userAgent).toBeUndefined()
    expect(sanitized.customData).toEqual({ value: 125, currency: 'USD' })
    expect(sanitized.droppedFields).toContain('referrer')
  })

  it('drops browser ad IDs and user agent even in attribution mode', () => {
    const config = loadConfig({ PRIVACY_MODE: 'attribution' })
    const sanitized = sanitizeIncomingEvent(
      {
        ...baseEvent,
        url: 'https://clinic.example/thank-you',
        title: 'Thank you',
        referrer: 'https://clinic.example/book',
      },
      config,
    )

    expect(sanitized.sensitiveContext).toBe(false)
    expect(sanitized.safeUrl).toBe('https://clinic.example/thank-you')
    expect(sanitized.fbp).toBeUndefined()
    expect(sanitized.fbc).toBeUndefined()
    expect(sanitized.userAgent).toBeUndefined()
    expect(sanitized.droppedFields).toEqual(expect.arrayContaining(['fbp', 'fbc', 'user_agent']))
  })
})
