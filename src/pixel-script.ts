import type { RelayConfig } from './types.js'

export function createPixelScript(config: RelayConfig) {
  const collectUrl = new URL('/collect', config.publicBaseUrl).toString()

  return `;(function () {
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script')
    return scripts[scripts.length - 1]
  })()

  var siteId = currentScript && currentScript.getAttribute('data-site-id') || ${JSON.stringify(config.siteId)}
  var autoPageView = !(currentScript && currentScript.getAttribute('data-auto-pageview') === 'false')
  var consent = currentScript && currentScript.getAttribute('data-consent') || 'unknown'
  var endpoint = currentScript && currentScript.getAttribute('data-endpoint') || ${JSON.stringify(collectUrl)}

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID()
    return 'evt_' + Date.now() + '_' + Math.random().toString(16).slice(2)
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\\]\\\\/+^]/g, '\\\\$&') + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : undefined
  }

  function getClientId() {
    var key = 'hippatracking_client_id'
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

  function fbcFromLocation() {
    try {
      var params = new URLSearchParams(window.location.search)
      var fbclid = params.get('fbclid')
      return fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : undefined
    } catch (_error) {
      return undefined
    }
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

    var json = JSON.stringify(body)

    if (window.navigator.sendBeacon) {
      var sent = window.navigator.sendBeacon(endpoint, new Blob([json], { type: 'application/json' }))
      if (sent) return Promise.resolve({ queued: true })
    }

    return window.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
      credentials: 'omit'
    })
  }

  window.hippaTracking = window.hippaTracking || {}
  window.hippaTracking.track = send
  window.hippaTracking.consent = function (nextConsent) { consent = nextConsent }

  if (autoPageView) send('PageView', {})
})();`
}
