import type { AppSettings, AudienceRule, DashboardStats } from './types.js'

export function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · HippaTracking</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f8fafc; }
      body { margin: 0; }
      a { color: #2563eb; }
      .shell { max-width: 1180px; margin: 0 auto; padding: 28px; }
      .top { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:22px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:800; color:#111827; text-decoration:none; }
      .mark { display:inline-flex; width:36px; height:36px; border-radius:8px; align-items:center; justify-content:center; background:#256f73; color:#fff; }
      .nav { display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
      .card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:20px; box-shadow:0 10px 30px rgba(15,23,42,.05); }
      .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:18px; align-items:start; }
      .stats { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:12px; margin-bottom:18px; }
      .stat strong { display:block; font-size:26px; }
      h1 { font-size:40px; line-height:1; margin:0 0 10px; }
      h2 { margin:0 0 12px; font-size:22px; }
      h3 { margin:18px 0 8px; }
      p { color:#4b5563; line-height:1.55; }
      label { display:grid; gap:6px; margin:12px 0; color:#374151; font-weight:700; }
      input, textarea, select { width:100%; box-sizing:border-box; border:1px solid #d1d5db; border-radius:8px; padding:10px 11px; font:inherit; }
      textarea { min-height:96px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size:13px; }
      button, .button { display:inline-flex; border:0; border-radius:8px; background:#111827; color:#fff; padding:10px 14px; font:inherit; font-weight:800; text-decoration:none; cursor:pointer; }
      .secondary { background:#256f73; }
      .muted { color:#6b7280; font-size:13px; }
      .pill { display:inline-flex; border-radius:999px; padding:4px 8px; background:#eef2ff; color:#3730a3; font-size:12px; font-weight:800; }
      .row { display:flex; justify-content:space-between; gap:12px; border-top:1px solid #e5e7eb; padding:12px 0; }
      .checks { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:8px; }
      .checks label { display:flex; align-items:center; gap:8px; margin:0; font-weight:650; }
      .checks input { width:auto; }
      pre { background:#0b1020; color:#d1e7ff; padding:14px; border-radius:8px; overflow:auto; }
      code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
      .warning { background:#fff7ed; border-color:#fed7aa; }
      @media (max-width: 820px) { .grid, .stats { grid-template-columns: 1fr; } .top { align-items:flex-start; flex-direction:column; } }
    </style>
  </head>
  <body>
    <main class="shell">
      ${body}
    </main>
  </body>
</html>`
}

export function topNav() {
  return `<div class="top">
    <a href="/dashboard" class="brand"><span class="mark">HT</span> HippaTracking</a>
    <nav class="nav">
      <a href="/dashboard">Dashboard</a>
      <a href="/docs/usage">Usage docs</a>
      <a href="/docs/developers">Developer docs</a>
      <form action="/logout" method="post"><button type="submit">Log out</button></form>
    </nav>
  </div>`
}

export function setupPage(generatedRecoveryKey: string | null = null) {
  if (generatedRecoveryKey) {
    return layout(
      'Recovery key',
      `<section class="card">
        <h1>Save your recovery key</h1>
        <p>This is shown once. Store it somewhere safe. It can be used to recover the admin account if the password is lost.</p>
        <pre>${escapeHtml(generatedRecoveryKey)}</pre>
        <a class="button" href="/dashboard">Continue to dashboard</a>
      </section>`,
    )
  }

  return layout(
    'Guided setup',
    `<section class="card">
      <h1>Set up your relay</h1>
      <p>Create the first admin, choose which modules should be active, and generate the stable pixel snippet.</p>
      <form action="/setup" method="post">
        <div class="grid">
          <div>
            <h2>Admin</h2>
            <label>Email <input name="email" type="email" required autocomplete="email"></label>
            <label>Password <input name="password" type="password" minlength="12" required autocomplete="new-password"></label>
            <label>Recovery key label <input name="recoveryLabel" placeholder="Owner recovery key"></label>
          </div>
          <div>
            <h2>Relay</h2>
            <label>Site ID <input name="siteId" value="default" required></label>
            <label>Allowed website origins <textarea name="allowedOrigins" placeholder="https://example.com&#10;https://www.example.com"></textarea></label>
            <label>Privacy mode
              <select name="privacyMode">
                <option value="strict">Strict</option>
                <option value="attribution">Attribution with consent</option>
              </select>
            </label>
          </div>
        </div>
        <h2>Features</h2>
        <div class="checks">
          <label><input type="checkbox" name="metaTracking" value="on"> Facebook / Meta CAPI</label>
          <label><input type="checkbox" name="googleAnalytics" value="on"> Google Analytics 4</label>
          <label><input type="checkbox" name="sessionRecording" value="on"> Session recording</label>
          <label><input type="checkbox" name="consentManager" value="on"> Consent manager</label>
          <label><input type="checkbox" name="audienceBuilder" value="on"> Audience builder</label>
        </div>
        <p><button type="submit">Create relay</button></p>
      </form>
    </section>`,
  )
}

export function loginPage(error = '') {
  return layout(
    'Login',
    `<section class="card" style="max-width:460px;margin:48px auto">
      <h1>Admin login</h1>
      ${error ? `<p class="muted">${escapeHtml(error)}</p>` : ''}
      <form action="/login" method="post">
        <label>Email <input name="email" type="email" required autocomplete="email"></label>
        <label>Password <input name="password" type="password" required autocomplete="current-password"></label>
        <button type="submit">Log in</button>
      </form>
    </section>`,
  )
}

export function dashboardPage(input: {
  settings: AppSettings
  stats: DashboardStats
  audiences: AudienceRule[]
  publicBaseUrl: string
  destinations: Record<string, unknown>
}) {
  const snippet = `<script async src="${input.publicBaseUrl}/pixel.js" data-site-id="${input.settings.siteId}" data-consent="unknown"></script>`

  return layout(
    'Dashboard',
    `${topNav()}
    <header class="card">
      <p class="pill">Guided install</p>
      <h1>Your relay is ready</h1>
      <p>Install this once. Feature toggles below are pulled from the server at runtime, so you can change collection behavior without replacing the pixel.</p>
      <pre>${escapeHtml(snippet)}</pre>
      <p class="muted">Conversion API endpoint: <code>${escapeHtml(input.publicBaseUrl)}/collect</code></p>
    </header>

    <section class="stats">
      <article class="card stat"><span class="muted">Consent events</span><strong>${input.stats.consentEvents}</strong></article>
      <article class="card stat"><span class="muted">Recording chunks</span><strong>${input.stats.recordingChunks}</strong></article>
      <article class="card stat"><span class="muted">Audience rules</span><strong>${input.stats.audienceRules}</strong></article>
      <article class="card stat"><span class="muted">Audience members</span><strong>${input.stats.audienceMembers}</strong></article>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Features</h2>
        <form action="/settings/features" method="post">
          <div class="checks">
            ${featureCheckbox('metaTracking', 'Facebook / Meta CAPI', input.settings.features.metaTracking)}
            ${featureCheckbox('googleAnalytics', 'Google Analytics 4', input.settings.features.googleAnalytics)}
            ${featureCheckbox('sessionRecording', 'Session recording', input.settings.features.sessionRecording)}
            ${featureCheckbox('consentManager', 'Consent manager', input.settings.features.consentManager)}
            ${featureCheckbox('audienceBuilder', 'Audience builder', input.settings.features.audienceBuilder)}
          </div>
          <p><button type="submit">Save features</button></p>
        </form>
        <p class="muted">Meta and GA4 also require environment variables before events can forward.</p>
      </article>

      <article class="card">
        <h2>Collection policy</h2>
        <form action="/settings/policy" method="post">
          <label>Allowed origins <textarea name="allowedOrigins">${escapeHtml(input.settings.allowedOrigins.join('\n'))}</textarea></label>
          <label>Sensitive route patterns <textarea name="sensitivePathPatterns">${escapeHtml(input.settings.sensitivePathPatterns.join('\n'))}</textarea></label>
          <label>Allowed custom data keys <input name="allowedCustomDataKeys" value="${escapeHtml(input.settings.allowedCustomDataKeys.join(', '))}"></label>
          <label>Privacy mode
            <select name="privacyMode">
              <option value="strict"${input.settings.privacyMode === 'strict' ? ' selected' : ''}>Strict</option>
              <option value="attribution"${input.settings.privacyMode === 'attribution' ? ' selected' : ''}>Attribution with consent</option>
            </select>
          </label>
          <button type="submit">Save policy</button>
        </form>
      </article>

      <article class="card">
        <h2>Audience builder</h2>
        <form action="/audiences" method="post">
          <label>Name <input name="name" placeholder="High value leads"></label>
          <label>Event name <input name="eventName" placeholder="Lead"></label>
          <label>URL contains <input name="urlContains" placeholder="/thank-you"></label>
          <label>Minimum value <input name="minValue" type="number" min="0" step="0.01"></label>
          <button class="secondary" type="submit">Create audience</button>
        </form>
        ${input.audiences.map((audience) => `<div class="row"><strong>${escapeHtml(audience.name)}</strong><span class="muted">${escapeHtml([audience.eventName, audience.urlContains, audience.minValue].filter(Boolean).join(' · ') || 'All matched events')}</span></div>`).join('')}
      </article>

      <article class="card">
        <h2>Destination readiness</h2>
        <pre>${escapeHtml(JSON.stringify(input.destinations, null, 2))}</pre>
      </article>
    </section>`,
  )
}

export function usageDocs(publicBaseUrl: string) {
  return layout(
    'Usage docs',
    `${topNav()}
    <section class="card">
      <h1>Usage docs</h1>
      <h2>Install the pixel</h2>
      <pre>${escapeHtml(`<script async src="${publicBaseUrl}/pixel.js" data-site-id="default" data-consent="unknown"></script>`)}</pre>
      <h2>Track a conversion</h2>
      <pre>${escapeHtml(`window.hippaTracking.track('Lead', {
  customData: { value: 125, currency: 'USD' }
})`)}</pre>
      <h2>Update consent</h2>
      <pre>${escapeHtml(`window.hippaTracking.consent('granted')`)}</pre>
      <p>Feature flags are server-controlled. You do not need to replace the installed pixel when session recording, consent management, audiences, Meta, or GA4 are toggled.</p>
    </section>`,
  )
}

export function developerDocs() {
  return layout(
    'Developer docs',
    `${topNav()}
    <section class="card">
      <h1>Developer docs</h1>
      <h2>Endpoints</h2>
      <div class="row"><strong>GET /pixel.js</strong><span>Browser pixel bootstrap</span></div>
      <div class="row"><strong>GET /client-config</strong><span>Runtime feature flags</span></div>
      <div class="row"><strong>POST /collect</strong><span>Conversion event ingest</span></div>
      <div class="row"><strong>POST /consent</strong><span>Consent event ingest</span></div>
      <div class="row"><strong>POST /record</strong><span>Encrypted rrweb recording chunks</span></div>
      <h2>Session recording</h2>
      <p>The recorder uses rrweb under its MIT license. It batches incremental events and posts chunks with sendBeacon/fetch. Inputs are masked, selected elements can be blocked with <code>ht-block</code>, and collection only starts when the feature is enabled and consent is granted.</p>
      <h2>Storage</h2>
      <p>Use Postgres through <code>DATABASE_URL</code>. Recording chunks and consent payloads are encrypted with AES-256-GCM before being stored. Audience membership keys are HMAC pseudonyms rather than raw client identifiers.</p>
    </section>`,
  )
}

export function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function featureCheckbox(name: string, label: string, checked: boolean) {
  return `<label><input type="checkbox" name="${escapeHtml(name)}" value="on"${checked ? ' checked' : ''}> ${escapeHtml(label)}</label>`
}
