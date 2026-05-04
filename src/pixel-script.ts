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
  var consent = currentScript && currentScript.getAttribute('data-consent') || getStoredConsent() || 'unknown'
  var endpoint = currentScript && currentScript.getAttribute('data-endpoint') || baseUrl + '/collect'
  var configEndpoint = baseUrl + '/client-config?siteId=' + encodeURIComponent(siteId)
  var sessionId = getSessionId()
  var recordingBuffer = []
  var recordingTimer = null
  var runtimeConfig = null

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

  function fbcFromLocation() {
    try {
      var params = new URLSearchParams(window.location.search)
      var fbclid = params.get('fbclid')
      return fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : undefined
    } catch (_error) {
      return undefined
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
    var body = {
      siteId: siteId,
      eventName: eventName,
      eventId: data.eventId || uuid(),
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      clientId: getClientId(),
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc') || fbcFromLocation(),
      userAgent: window.navigator.userAgent,
      consent: data.consent || consent,
      customData: data.customData || data,
      timestamp: Date.now()
    }

    return postJson(endpoint, body)
  }

  function sendConsent(nextConsent, categories) {
    consent = nextConsent
    setCookie('hipaa_tracking_consent', nextConsent, 180)
    return postJson(baseUrl + '/consent', {
      siteId: siteId,
      clientId: getClientId(),
      consent: nextConsent,
      categories: categories || { analytics: nextConsent === 'granted', recording: nextConsent === 'granted', advertising: nextConsent === 'granted' },
      url: window.location.href,
      timestamp: Date.now()
    }).then(function () {
      if (nextConsent === 'granted') startRecordingIfAllowed()
    })
  }

  function showConsentBanner() {
    if (getStoredConsent() || document.getElementById('hipaa-tracking-consent')) return
    var banner = document.createElement('div')
    banner.id = 'hipaa-tracking-consent'
    banner.style.cssText = 'position:fixed;z-index:2147483647;left:16px;right:16px;bottom:16px;background:#111827;color:#fff;border-radius:8px;padding:14px;box-shadow:0 16px 40px rgba(0,0,0,.25);font:14px system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;display:flex;gap:12px;align-items:center;justify-content:space-between;'
    banner.innerHTML = '<span>We use privacy-preserving analytics to improve the site. Sensitive page details are redacted before leaving this site.</span><span style="white-space:nowrap"><button data-ht-deny style="margin-right:8px;border:1px solid #4b5563;background:transparent;color:#fff;border-radius:6px;padding:8px 10px;font:inherit">Decline</button><button data-ht-accept style="border:0;background:#2f6f73;color:#fff;border-radius:6px;padding:8px 10px;font:inherit;font-weight:700">Allow</button></span>'
    document.body.appendChild(banner)
    banner.querySelector('[data-ht-deny]').onclick = function () {
      sendConsent('denied')
      banner.remove()
    }
    banner.querySelector('[data-ht-accept]').onclick = function () {
      sendConsent('granted')
      banner.remove()
    }
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

  function startRecordingIfAllowed() {
    if (!runtimeConfig || !runtimeConfig.features.sessionRecording || consent !== 'granted') return
    if (window.__hipaaTrackingRecordingStarted) return
    window.__hipaaTrackingRecordingStarted = true

    loadScript(baseUrl + '/vendor/rrweb-record.min.js', function () {
      if (!window.rrweb || !window.rrweb.record) return
      window.rrweb.record({
        emit: function (event) {
          recordingBuffer.push(event)
          scheduleRecordingFlush()
        },
        maskAllInputs: true,
        maskTextSelector: '[data-ht-mask], input, textarea, select, [contenteditable=true]',
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
    if (runtimeConfig.features.consentManager) showConsentBanner()
    if (autoPageView) send('PageView', {})
    startRecordingIfAllowed()
  }

  window.hipaaTracking = window.hipaaTracking || {}
  window.hipaaTracking.track = send
  window.hipaaTracking.consent = sendConsent
  window.hipaaTracking.flushRecording = flushRecording

  window.fetch(configEndpoint, { credentials: 'omit' })
    .then(function (response) { return response.json() })
    .then(boot)
    .catch(function () { boot({ features: {} }) })
})();`
}
