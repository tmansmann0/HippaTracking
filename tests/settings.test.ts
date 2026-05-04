import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'
import {
  defaultConsentTheme,
  defaultSettings,
  normalizeConsentTheme,
} from '../src/settings.js'

describe('settings normalization', () => {
  it('sanitizes consent theme values before they reach banner CSS', () => {
    const defaults = defaultConsentTheme()
    const normalized = normalizeConsentTheme({
      ...defaults,
      fontFamily: 'Inter; background:red',
      panelBackgroundColor: 'red',
      textColor: '#123ABC',
      borderRadiusPx: 99,
    })

    expect(normalized.fontFamily).toBe(defaults.fontFamily)
    expect(normalized.panelBackgroundColor).toBe(defaults.panelBackgroundColor)
    expect(normalized.textColor).toBe('#123abc')
    expect(normalized.borderRadiusPx).toBe(24)
  })

  it('includes default consent theme in fresh settings', () => {
    const settings = defaultSettings(loadConfig())

    expect(settings.consent.theme.fontFamily).toContain('system-ui')
    expect(settings.consent.theme.borderRadiusPx).toBe(8)
  })
})
