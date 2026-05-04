import { describe, expect, it } from 'vitest'
import {
  redactRecordingText,
  sanitizeRecordingChunkEvents,
} from '../src/recording-sanitize.js'

describe('recording sanitization', () => {
  it('redacts common PII and numbers from recording text', () => {
    expect(
      redactRecordingText(
        'Dr. Jane Smith called 555-123-4567 about DOB: 01/02/1980 from 123 Main Street and jane@example.com',
      ),
    ).toBe('[name] called [phone] about [redacted] from [address] and [email]')
  })

  it('fully redacts sensitive recording object fields before storage', () => {
    const [event] = sanitizeRecordingChunkEvents([
      {
        type: 3,
        data: {
          source: 5,
          text: 'Appointment on 05/04/2026',
          value: 'patient@example.com',
          attributes: {
            patientId: 'MRN-12345',
            ariaLabel: 'Step 2',
          },
        },
      },
    ])

    expect(event).toEqual({
      type: 3,
      data: {
        source: 5,
        text: 'Appointment on [date]',
        value: '[redacted]',
        attributes: {
          patientId: '[redacted]',
          ariaLabel: 'Step [number]',
        },
      },
    })
  })
})
