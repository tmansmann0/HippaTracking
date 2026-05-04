import type { RelayConfig } from './types.js'

export function createPixelScript(config: RelayConfig) {
  const baseUrl = config.publicBaseUrl.replace(/\/$/, '')

  return `;(function () {
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script')
    return scripts[scripts.length - 1]
  })()

  var baseUrl = ${JSON.stringify(baseUrl)}
  var siteId = currentScript && currentScript.getAttribute('data-site-id') || ${JSON.stringify(config.siteId)}
  var autoPageView = !(currentScript && currentScript.getAttribute('data-auto-pageview') === 'false')
  var scriptConsent = currentScript && currentScript.getAttribute('data-consent')
  var consent = initialConsent(scriptConsent)
  var consentCategories = getStoredConsentCategories() || categoriesForConsent(consent)
  var endpoint = currentScript && currentScript.getAttribute('data-endpoint') || baseUrl + '/collect'
  var regionCode = normalizeRegionCode(currentScript && currentScript.getAttribute('data-region-code') || '')
  var configEndpoint = baseUrl + '/client-config?siteId=' + encodeURIComponent(siteId) + (regionCode ? '&regionCode=' + encodeURIComponent(regionCode) : '')
  var sessionId = getSessionId()
  var recordingBuffer = []
  var recordingTimer = null
  var runtimeConfig = null
  var autoPageViewSent = false

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID()
    return 'evt_' + Date.now() + '_' + Math.random().toString(16).slice(2)
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\\]\\\\/+^]/g, '\\\\$&') + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : undefined
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax'
  }

  function getStoredConsent() {
    return getCookie('hipaa_tracking_consent')
  }

  function initialConsent(value) {
    if (value === 'granted' || value === 'denied') return value
    return getStoredConsent() || value || 'unknown'
  }

  function getStoredConsentCategories() {
    var stored = getCookie('hipaa_tracking_consent_categories')
    if (!stored) return null
    try {
      return normalizeCategories(JSON.parse(stored), categoriesForConsent(consent))
    } catch (_error) {
      return null
    }
  }

  function setStoredConsentCategories(categories) {
    setCookie('hipaa_tracking_consent_categories', JSON.stringify(categories), 180)
  }

  function categoriesForConsent(nextConsent) {
    var granted = nextConsent === 'granted'
    return { analytics: granted, advertising: granted, recording: granted }
  }

  function autoConsentCategories() {
    return { analytics: true, advertising: true, recording: false }
  }

  function deniedCategories() {
    return { analytics: false, advertising: false, recording: false }
  }

  function normalizeCategories(categories, fallback) {
    fallback = fallback || deniedCategories()
    categories = categories || {}
    return {
      analytics: typeof categories.analytics === 'boolean' ? categories.analytics : fallback.analytics,
      advertising: typeof categories.advertising === 'boolean' ? categories.advertising : fallback.advertising,
      recording: typeof categories.recording === 'boolean' ? categories.recording : fallback.recording
    }
  }

  function normalizeRegionCode(value) {
    return String(value || '').trim().toUpperCase().replace(/^US-/, '')
  }

  function getClientId() {
    var key = 'hipaa_tracking_client_id'
    try {
      var existing = window.localStorage.getItem(key)
      if (existing) return existing
      var created = 'ht.' + uuid()
      window.localStorage.setItem(key, created)
      return created
    } catch (_error) {
      return 'ht.' + uuid()
    }
  }

  function getSessionId() {
    var key = 'hipaa_tracking_session_id'
    try {
      var existing = window.sessionStorage.getItem(key)
      if (existing) return existing
      var created = 'hrs.' + uuid()
      window.sessionStorage.setItem(key, created)
      return created
    } catch (_error) {
      return 'hrs.' + uuid()
    }
  }

  function postJson(url, body) {
    var json = JSON.stringify(body)

    if (window.navigator.sendBeacon) {
      var sent = window.navigator.sendBeacon(url, new Blob([json], { type: 'application/json' }))
      if (sent) return Promise.resolve({ queued: true })
    }

    return window.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
      credentials: 'omit'
    })
  }

  function send(eventName, data) {
    data = data || {}
    if (!trackingAllowed(data)) {
      return Promise.resolve({ skipped: true, reason: 'consent_not_granted' })
    }

    var categories = normalizeCategories(data.consentCategories, consentCategories)
    var body = {
      siteId: siteId,
      eventName: eventName,
      eventId: data.eventId || uuid(),
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      clientId: getClientId(),
      consent: data.consent || consent,
      consentCategories: categories,
      customData: data.customData || data,
      timestamp: Date.now()
    }

    return postJson(endpoint, body)
  }

  function sendConsent(nextConsent, categories, reason) {
    consent = nextConsent
    consentCategories = normalizeCategories(categories, categoriesForConsent(nextConsent))
    setCookie('hipaa_tracking_consent', nextConsent, 180)
    setStoredConsentCategories(consentCategories)
    return postJson(baseUrl + '/consent', {
      siteId: siteId,
      clientId: getClientId(),
      consent: nextConsent,
      categories: consentCategories,
      reason: reason || 'user_choice',
      regionCode: regionCode || runtimeConfig && runtimeConfig.regionCode || '',
      url: window.location.href,
      timestamp: Date.now()
    }).then(function () {
      if (nextConsent === 'granted') {
        maybeSendAutoPageView()
        startRecordingIfAllowed()
      }
    })
  }

  function trackingAllowed(data) {
    if (!runtimeConfig || !runtimeConfig.features || !runtimeConfig.features.consentManager) return true
    if ((data && data.consent) === 'granted') return true
    return consent === 'granted' && (consentCategories.analytics || consentCategories.advertising)
  }

  function maybeSendAutoPageView() {
    if (!autoPageView || autoPageViewSent || !trackingAllowed({})) return
    autoPageViewSent = true
    send('PageView', {})
  }

  function optOutSignalReason() {
    var consentConfig = runtimeConfig && runtimeConfig.consent || {}
    if (consentConfig.respectOptOutSignals === false) return ''
    if ((runtimeConfig && runtimeConfig.signals && runtimeConfig.signals.gpcHeader) || window.navigator.globalPrivacyControl === true) return 'global_privacy_control'
    if (window.navigator.doNotTrack === '1' || window.doNotTrack === '1' || window.navigator.msDoNotTrack === '1') return 'do_not_track'
    return ''
  }

  function requiresExplicitConsent() {
    var consentConfig = runtimeConfig && runtimeConfig.consent || {}
    var detectedRegion = normalizeRegionCode(regionCode || runtimeConfig && runtimeConfig.regionCode || '')
    var regions = consentConfig.requiredRegionCodes || []
    return !!detectedRegion && regions.map(normalizeRegionCode).indexOf(detectedRegion) >= 0
  }

  function applyConsentPolicy() {
    if (!runtimeConfig || !runtimeConfig.features || !runtimeConfig.features.consentManager) {
      return Promise.resolve()
    }

    if (getStoredConsent()) return Promise.resolve()

    var optOutReason = optOutSignalReason()
    if (optOutReason) {
      return sendConsent('denied', deniedCategories(), optOutReason).then(function () {
        showConsentNotice('Your browser privacy signal has been honored. Optional tracking is off.')
      })
    }

    var consentConfig = runtimeConfig.consent || {}
    if (consentConfig.preset === 'bottom_auto_except_required' && !requiresExplicitConsent()) {
      return sendConsent('granted', autoConsentCategories(), 'auto_consent').then(function () {
        showConsentNotice('Privacy-preserving analytics are on. Session recording stays off unless you enable it.')
      })
    }

    showConsentBanner()
    return Promise.resolve()
  }

  function ensureConsentStyles() {
    if (document.getElementById('hipaa-tracking-consent-style')) return
    var theme = consentTheme()
    var style = document.createElement('style')
    style.id = 'hipaa-tracking-consent-style'
    style.textContent = '#hipaa-tracking-consent{position:fixed;z-index:2147483647;font:14px ' + theme.fontFamily + ';color:' + theme.textColor + '}#hipaa-tracking-consent.ht-modal{inset:0;background:' + hexToRgba(theme.overlayColor, 0.38) + ';display:flex;align-items:center;justify-content:center;padding:18px}#hipaa-tracking-consent.ht-bottom{left:16px;right:16px;bottom:16px;display:flex;justify-content:flex-start}.ht-consent-panel{width:min(520px,100%);background:' + theme.panelBackgroundColor + ';border:1px solid ' + theme.borderColor + ';border-radius:' + theme.borderRadiusPx + 'px;box-shadow:0 22px 60px rgba(15,23,42,.22);padding:18px}.ht-bottom .ht-consent-panel{width:min(460px,100%);padding:14px}.ht-consent-title{font-size:18px;font-weight:800;margin:0 0 8px;color:' + theme.textColor + '}.ht-consent-text{line-height:1.45;color:' + theme.mutedTextColor + ';margin:0 0 14px}.ht-consent-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ht-consent-actions button{border:1px solid ' + theme.borderColor + ';background:' + theme.secondaryButtonBackgroundColor + ';color:' + theme.secondaryButtonTextColor + ';border-radius:' + theme.borderRadiusPx + 'px;padding:9px 11px;font:inherit;font-weight:800;cursor:pointer}.ht-consent-actions [data-ht-accept],.ht-consent-actions [data-ht-save]{background:' + theme.primaryButtonBackgroundColor + ';color:' + theme.primaryButtonTextColor + ';border-color:' + theme.primaryButtonBackgroundColor + '}.ht-consent-check{display:flex;gap:8px;align-items:flex-start;margin:10px 0;font-weight:700;color:' + theme.textColor + '}.ht-consent-check input{margin-top:3px}@media(max-width:640px){#hipaa-tracking-consent.ht-modal{align-items:flex-end;padding:0}.ht-modal .ht-consent-panel{border-radius:' + theme.borderRadiusPx + 'px ' + theme.borderRadiusPx + 'px 0 0;min-height:50vh}.ht-bottom{left:0!important;right:0!important;bottom:0!important}.ht-bottom .ht-consent-panel{width:100%;border-radius:' + theme.borderRadiusPx + 'px ' + theme.borderRadiusPx + 'px 0 0}}'
    document.head.appendChild(style)
  }

  function consentTheme() {
    var theme = runtimeConfig && runtimeConfig.consent && runtimeConfig.consent.theme || {}
    return {
      fontFamily: safeFont(theme.fontFamily, 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'),
      panelBackgroundColor: safeColor(theme.panelBackgroundColor, '#ffffff'),
      textColor: safeColor(theme.textColor, '#111827'),
      mutedTextColor: safeColor(theme.mutedTextColor, '#4b5563'),
      primaryButtonBackgroundColor: safeColor(theme.primaryButtonBackgroundColor, '#111827'),
      primaryButtonTextColor: safeColor(theme.primaryButtonTextColor, '#ffffff'),
      secondaryButtonBackgroundColor: safeColor(theme.secondaryButtonBackgroundColor, '#ffffff'),
      secondaryButtonTextColor: safeColor(theme.secondaryButtonTextColor, '#111827'),
      borderColor: safeColor(theme.borderColor, '#e5e7eb'),
      overlayColor: safeColor(theme.overlayColor, '#0f172a'),
      borderRadiusPx: safeRadius(theme.borderRadiusPx, 8)
    }
  }

  function safeColor(value, fallback) {
    value = String(value || '').trim()
    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
  }

  function safeFont(value, fallback) {
    value = String(value || '').trim().slice(0, 180)
    return /^[a-zA-Z0-9\\s"',.-]+$/.test(value) ? value : fallback
  }

  function safeRadius(value, fallback) {
    var numeric = Number(value)
    return Number.isFinite(numeric) ? Math.min(Math.max(Math.round(numeric), 0), 24) : fallback
  }

  function hexToRgba(hex, opacity) {
    var normalized = safeColor(hex, '#0f172a')
    var red = parseInt(normalized.slice(1, 3), 16)
    var green = parseInt(normalized.slice(3, 5), 16)
    var blue = parseInt(normalized.slice(5, 7), 16)
    return 'rgba(' + red + ',' + green + ',' + blue + ',' + opacity + ')'
  }

  function showConsentBanner() {
    if (getStoredConsent() || document.getElementById('hipaa-tracking-consent')) return
    ensureConsentStyles()
    var preset = runtimeConfig && runtimeConfig.consent && runtimeConfig.consent.preset || 'modal_accept_manage_deny'
    var isBottom = preset === 'bottom_auto_except_required'
    var banner = document.createElement('div')
    banner.id = 'hipaa-tracking-consent'
    banner.className = isBottom ? 'ht-bottom' : 'ht-modal'
    banner.innerHTML = consentChoiceHtml(preset)
    document.body.appendChild(banner)
    wireConsentBanner(banner, preset)
  }

  function showConsentNotice(message) {
    if (document.getElementById('hipaa-tracking-consent')) return
    ensureConsentStyles()
    var banner = document.createElement('div')
    banner.id = 'hipaa-tracking-consent'
    banner.className = 'ht-bottom'
    banner.innerHTML = '<div class="ht-consent-panel"><p class="ht-consent-text">' + escapeHtml(message) + '</p><div class="ht-consent-actions"><button data-ht-manage>Privacy settings</button><button data-ht-close>Close</button></div></div>'
    document.body.appendChild(banner)
    banner.querySelector('[data-ht-close]').onclick = function () {
      banner.remove()
    }
    banner.querySelector('[data-ht-manage]').onclick = function () {
      banner.remove()
      showPreferencesPanel()
    }
  }

  function consentChoiceHtml(preset) {
    var denyButton = preset === 'modal_accept_options' ? '' : '<button data-ht-deny>Deny</button>'
    return '<div class="ht-consent-panel"><h2 class="ht-consent-title">Privacy choices</h2><p class="ht-consent-text">We use a privacy-preserving relay for analytics and conversion measurement. Sensitive page details are redacted before ad or analytics platforms receive events.</p><div class="ht-consent-actions"><button data-ht-accept>Accept</button><button data-ht-manage>' + (preset === 'modal_accept_options' ? 'More options' : 'Manage preferences') + '</button>' + denyButton + '</div></div>'
  }

  function preferencesHtml() {
    return '<div class="ht-consent-panel"><h2 class="ht-consent-title">Privacy preferences</h2><p class="ht-consent-text">Choose which optional modules can run. Opt-out browser signals always turn optional tracking off when signal support is enabled.</p><label class="ht-consent-check"><input type="checkbox" data-ht-cat="analytics" checked> Analytics</label><label class="ht-consent-check"><input type="checkbox" data-ht-cat="advertising" checked> Conversion measurement</label><label class="ht-consent-check"><input type="checkbox" data-ht-cat="recording"> Session recording</label><div class="ht-consent-actions"><button data-ht-save>Save preferences</button><button data-ht-deny>Deny all</button></div></div>'
  }

  function showPreferencesPanel() {
    var existing = document.getElementById('hipaa-tracking-consent')
    if (existing) existing.remove()
    ensureConsentStyles()
    var banner = document.createElement('div')
    banner.id = 'hipaa-tracking-consent'
    banner.className = 'ht-modal'
    banner.innerHTML = preferencesHtml()
    document.body.appendChild(banner)
    wireConsentBanner(banner, 'preferences')
  }

  function wireConsentBanner(banner, preset) {
    var accept = banner.querySelector('[data-ht-accept]')
    var deny = banner.querySelector('[data-ht-deny]')
    var manage = banner.querySelector('[data-ht-manage]')
    var save = banner.querySelector('[data-ht-save]')

    if (accept) accept.onclick = function () {
      sendConsent('granted', categoriesForConsent('granted'), 'user_accept_all')
      banner.remove()
    }
    if (deny) deny.onclick = function () {
      sendConsent('denied', deniedCategories(), 'user_deny_all')
      banner.remove()
    }
    if (manage) manage.onclick = function () {
      banner.remove()
      showPreferencesPanel()
    }
    if (save) save.onclick = function () {
      var categories = {
        analytics: !!banner.querySelector('[data-ht-cat="analytics"]:checked'),
        advertising: !!banner.querySelector('[data-ht-cat="advertising"]:checked'),
        recording: !!banner.querySelector('[data-ht-cat="recording"]:checked')
      }
      var nextConsent = categories.analytics || categories.advertising || categories.recording ? 'granted' : 'denied'
      sendConsent(nextConsent, categories, 'user_preferences')
      banner.remove()
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]
    })
  }

  function loadScript(src, onload) {
    var script = document.createElement('script')
    script.async = true
    script.src = src
    script.onload = onload
    document.head.appendChild(script)
  }

  function flushRecording() {
    if (!recordingBuffer.length) return
    var events = recordingBuffer.splice(0, recordingBuffer.length)
    postJson(baseUrl + '/record', {
      siteId: siteId,
      sessionId: sessionId,
      clientId: getClientId(),
      url: window.location.href,
      events: events,
      timestamp: Date.now()
    })
  }

  function scheduleRecordingFlush() {
    if (recordingBuffer.length >= 80) flushRecording()
    if (!recordingTimer) {
      recordingTimer = window.setTimeout(function () {
        recordingTimer = null
        flushRecording()
      }, 5000)
    }
  }

  function redactRecordingText(value) {
    var text = String(value || '')
    return text
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, '[email]')
      .replace(/(?:\\+?1[\\s.-]?)?(?:\\(?\\d{3}\\)?[\\s.-]?)\\d{3}[\\s.-]?\\d{4}/g, '[phone]')
      .replace(/\\b\\d{3}-\\d{2}-\\d{4}\\b/g, '[ssn]')
      .replace(/\\b(?:\\d[ -]*?){13,19}\\b/g, '[number]')
      .replace(/\\b(?:dob|date of birth|birth date|ssn)\\s*[:#-]?\\s*[0-9/_.-]+/gi, '[redacted]')
      .replace(/\\b(?:mrn|medical record|member id|patient id)\\s*[:#-]?\\s*[A-Z0-9_.-]+/gi, '[redacted]')
      .replace(/\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\b/g, '[date]')
      .replace(/\\b\\d{1,6}\\s+[A-Z0-9][A-Z0-9.'\\s-]{1,80}\\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|way|parkway|pkwy|place|pl)\\b/gi, '[address]')
      .replace(/\\b(?:[Mm]r|[Mm]rs|[Mm]s|[Mm]iss|[Dd]r)\\.?\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,2}\\b/g, '[name]')
      .replace(/\\b\\d+(?:[.,]\\d+)?\\b/g, '[number]')
  }

  function redactRecordingInput(value) {
    return value ? '[redacted-input]' : ''
  }

  function scrubRecordingEvent(value, key, depth) {
    depth = depth || 0
    key = key || ''
    if (depth > 16) return '[redacted]'
    if (typeof value === 'string') {
      var normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '')
      if (
        normalizedKey === 'value' ||
        normalizedKey === 'input' ||
        normalizedKey === 'inputvalue' ||
        normalizedKey.indexOf('email') >= 0 ||
        normalizedKey.indexOf('phone') >= 0 ||
        normalizedKey.indexOf('address') >= 0 ||
        normalizedKey.indexOf('birth') >= 0 ||
        normalizedKey.indexOf('patient') >= 0 ||
        normalizedKey.indexOf('medical') >= 0 ||
        normalizedKey.indexOf('member') >= 0 ||
        normalizedKey.indexOf('ssn') >= 0
      ) return '[redacted]'
      return redactRecordingText(value)
    }
    if (!value || typeof value !== 'object') return value
    if (Array.isArray(value)) {
      return value.map(function (item) { return scrubRecordingEvent(item, key, depth + 1) })
    }
    var next = {}
    Object.keys(value).forEach(function (entryKey) {
      next[entryKey] = scrubRecordingEvent(value[entryKey], entryKey, depth + 1)
    })
    return next
  }

  function startRecordingIfAllowed() {
    if (!runtimeConfig || !runtimeConfig.features.sessionRecording || consent !== 'granted' || !consentCategories.recording) return
    if (window.__hipaaTrackingRecordingStarted) return
    window.__hipaaTrackingRecordingStarted = true

    loadScript(baseUrl + '/vendor/rrweb-record.min.js', function () {
      if (!window.rrweb || !window.rrweb.record) return
      window.rrweb.record({
        emit: function (event) {
          recordingBuffer.push(scrubRecordingEvent(event))
          scheduleRecordingFlush()
        },
        maskAllInputs: true,
        maskInputOptions: {
          color: true,
          date: true,
          'datetime-local': true,
          email: true,
          month: true,
          number: true,
          range: true,
          search: true,
          tel: true,
          text: true,
          time: true,
          url: true,
          week: true,
          textarea: true,
          select: true,
          password: true
        },
        maskInputFn: redactRecordingInput,
        maskTextSelector: 'body',
        maskTextFn: redactRecordingText,
        blockSelector: '[data-ht-block], .ht-block, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [aria-multiline="true"]',
        blockClass: 'ht-block',
        ignoreClass: 'ht-ignore',
        collectFonts: false,
        sampling: {
          mousemove: 50,
          mouseInteraction: true,
          scroll: 150,
          input: 'last'
        }
      })
      window.addEventListener('pagehide', flushRecording)
    })
  }

  function boot(nextConfig) {
    runtimeConfig = nextConfig || { features: {} }
    regionCode = normalizeRegionCode(regionCode || runtimeConfig.regionCode || '')
    applyConsentPolicy().then(function () {
      maybeSendAutoPageView()
      startRecordingIfAllowed()
    })
  }

  window.hipaaTracking = window.hipaaTracking || {}
  window.hipaaTracking.track = send
  window.hipaaTracking.consent = sendConsent
  window.hipaaTracking.showConsentPreferences = showPreferencesPanel
  window.hipaaTracking.flushRecording = flushRecording

  window.fetch(configEndpoint, { credentials: 'omit' })
    .then(function (response) { return response.json() })
    .then(boot)
    .catch(function () { boot({ features: {} }) })
})();`
}
