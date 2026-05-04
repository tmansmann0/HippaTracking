import type { AppSettings, AudienceRule, DashboardStats } from './types.js'

export function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · HIPAATracking</title>
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
      .warning { background:#fff7ed; border-color:#fed7aa; }
      .danger { background:#fef2f2; border-color:#fecaca; }
      .danger strong, .danger h2 { color:#991b1b; }
      .inline-check { display:flex; align-items:flex-start; gap:8px; font-weight:700; }
      .inline-check input { width:auto; margin-top:4px; }
      .theme-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
      .theme-grid label { margin:0; }
      .theme-grid input[type="color"] { height:42px; padding:4px; }
      .preview-stack { display:grid; gap:12px; margin-top:14px; }
      .consent-preview { border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; background:#f8fafc; min-height:160px; position:relative; }
      .consent-preview.modal { display:grid; place-items:center; background:color-mix(in srgb, var(--ht-overlay), transparent 62%); padding:16px; }
      .consent-preview.bottom { display:flex; align-items:flex-end; justify-content:flex-start; padding:16px; min-height:130px; }
      .consent-preview .panel { width:min(460px, 100%); background:var(--ht-panel); color:var(--ht-text); border:1px solid var(--ht-border); border-radius:calc(var(--ht-radius) * 1px); box-shadow:0 14px 34px rgba(15,23,42,.16); padding:16px; font-family:var(--ht-font); }
      .consent-preview h3 { margin:0 0 8px; color:var(--ht-text); font-size:18px; }
      .consent-preview p { margin:0 0 12px; color:var(--ht-muted); }
      .preview-actions { display:flex; gap:8px; flex-wrap:wrap; }
      .preview-actions span { display:inline-flex; border-radius:8px; border:1px solid var(--ht-border); padding:8px 10px; font-weight:800; }
      .preview-actions .primary { background:var(--ht-primary); color:var(--ht-primary-text); border-color:var(--ht-primary); }
      .preview-actions .secondary { background:var(--ht-secondary); color:var(--ht-secondary-text); }
      pre { background:#0b1020; color:#d1e7ff; padding:14px; border-radius:8px; overflow:auto; }
      code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
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
    <a href="/dashboard" class="brand"><span class="mark">HT</span> HIPAATracking</a>
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
                <option value="attribution">Attribution with hashed identity</option>
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
        </div>
        <p class="muted">Audience building is hidden under advanced risk settings and starts disabled.</p>
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
          </div>
          <p><button type="submit">Save features</button></p>
        </form>
        <p class="muted">Meta and GA4 also require environment variables before events can forward.</p>
        <p class="muted">Session recording is high risk and should stay off for production patient traffic until a risk analysis approves it.</p>
        <p class="muted"><a href="/settings/advanced">Advanced risk settings</a></p>
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
              <option value="attribution"${input.settings.privacyMode === 'attribution' ? ' selected' : ''}>Attribution with hashed identity</option>
            </select>
          </label>
          <button type="submit">Save policy</button>
        </form>
      </article>

      <article class="card">
        <h2>Consent collector</h2>
        <form action="/settings/consent" method="post">
          <label>Preset
            <select name="consentPreset">
              <option value="modal_accept_options"${input.settings.consent.preset === 'modal_accept_options' ? ' selected' : ''}>Center modal: accept or more options</option>
              <option value="modal_accept_manage_deny"${input.settings.consent.preset === 'modal_accept_manage_deny' ? ' selected' : ''}>Center modal: accept, manage, deny</option>
              <option value="bottom_auto_except_required"${input.settings.consent.preset === 'bottom_auto_except_required' ? ' selected' : ''}>Bottom notice: auto-consent except required regions</option>
            </select>
          </label>
          <label class="inline-check"><input type="checkbox" name="respectOptOutSignals" value="on"${input.settings.consent.respectOptOutSignals ? ' checked' : ''}> Automatically deny tracking when GPC or Do Not Track opt-out signals are present</label>
          <label>Regions requiring explicit consent <textarea name="requiredRegionCodes">${escapeHtml(input.settings.consent.requiredRegionCodes.join('\n'))}</textarea></label>
          <h3>Banner style</h3>
          <label>Font family <input name="themeFontFamily" data-consent-theme-input="font" value="${escapeHtml(input.settings.consent.theme.fontFamily)}"></label>
          <div class="theme-grid">
            ${colorInput('themePanelBackgroundColor', 'Panel', input.settings.consent.theme.panelBackgroundColor, 'panel')}
            ${colorInput('themeTextColor', 'Text', input.settings.consent.theme.textColor, 'text')}
            ${colorInput('themeMutedTextColor', 'Muted text', input.settings.consent.theme.mutedTextColor, 'muted')}
            ${colorInput('themeBorderColor', 'Border', input.settings.consent.theme.borderColor, 'border')}
            ${colorInput('themePrimaryButtonBackgroundColor', 'Primary button', input.settings.consent.theme.primaryButtonBackgroundColor, 'primary')}
            ${colorInput('themePrimaryButtonTextColor', 'Primary text', input.settings.consent.theme.primaryButtonTextColor, 'primaryText')}
            ${colorInput('themeSecondaryButtonBackgroundColor', 'Secondary button', input.settings.consent.theme.secondaryButtonBackgroundColor, 'secondary')}
            ${colorInput('themeSecondaryButtonTextColor', 'Secondary text', input.settings.consent.theme.secondaryButtonTextColor, 'secondaryText')}
            ${colorInput('themeOverlayColor', 'Overlay', input.settings.consent.theme.overlayColor, 'overlay')}
            <label>Radius <input type="number" min="0" max="24" name="themeBorderRadiusPx" data-consent-theme-input="radius" value="${escapeHtml(input.settings.consent.theme.borderRadiusPx)}"></label>
          </div>
          <p><button type="submit">Save consent settings</button></p>
        </form>
        <p class="muted">Region detection uses <code>data-region-code</code> on the pixel script, <code>?regionCode=</code>, or common edge headers. Unknown regions use the selected preset default.</p>
      </article>

      <article class="card">
        <h2>Consent banner preview</h2>
        <div id="consent-theme-preview" class="preview-stack" style="${consentThemeVars(input.settings.consent.theme)}">
          ${consentPreview('modal', 'Accept or more options', ['Accept', 'More options'])}
          ${consentPreview('modal', 'Accept, manage, deny', ['Accept', 'Manage preferences', 'Deny'])}
          ${consentPreview('bottom', 'Bottom notice', ['Privacy settings', 'Close'])}
        </div>
      </article>

      <article class="card">
        <h2>Destination readiness</h2>
        <pre>${escapeHtml(JSON.stringify(input.destinations, null, 2))}</pre>
      </article>
    </section>
    ${consentThemePreviewScript()}`,
  )
}

export function advancedSettingsPage(input: {
  settings: AppSettings
  stats: DashboardStats
  audiences: AudienceRule[]
}) {
  const audienceDisabled = !input.settings.features.audienceBuilder
  const disabled = audienceDisabled ? ' disabled' : ''

  return layout(
    'Advanced risk settings',
    `${topNav()}
    <header class="card danger">
      <p class="pill">Advanced risk settings</p>
      <h1>Handle with care</h1>
      <p><strong>Audience building can create serious HIPAA and ad-platform risk.</strong> Keep it disabled unless counsel and your risk analysis approve the exact use case. Do not build or export treatment, diagnosis, condition, medication, or procedure audiences for Meta, Google, or other ad platforms.</p>
    </header>

    <section class="grid">
      <article class="card danger">
        <h2>Audience builder</h2>
        <p>When enabled, rules evaluate already-sanitized relay events and store HMAC-pseudonymous members. This is still sensitive operational data and should remain internal.</p>
        <form action="/settings/audience-builder" method="post">
          <label class="inline-check"><input type="checkbox" name="audienceBuilder" value="on"${input.settings.features.audienceBuilder ? ' checked' : ''}> Enable audience builder</label>
          <label class="inline-check"><input type="checkbox" name="audienceBuilderRiskAccepted" value="on"> I understand this must not be used to create treatment, condition, diagnosis, medication, or procedure audiences for ad platforms.</label>
          <p><button type="submit">Save advanced setting</button></p>
        </form>
        <p class="muted">Current audience rules: ${input.stats.audienceRules}. Current pseudonymous members: ${input.stats.audienceMembers}.</p>
      </article>

      <article class="card ${audienceDisabled ? 'warning' : ''}">
        <h2>Create internal audience</h2>
        <p class="muted">${audienceDisabled ? 'Enable audience builder and acknowledge the warning before creating rules.' : 'Rules should be generic conversion or funnel rules, not treatment or condition segments.'}</p>
        <form action="/audiences" method="post">
          <label>Name <input name="name" placeholder="High value leads"${disabled}></label>
          <label>Event name <input name="eventName" placeholder="Lead"${disabled}></label>
          <label>URL contains <input name="urlContains" placeholder="/thank-you"${disabled}></label>
          <label>Minimum value <input name="minValue" type="number" min="0" step="0.01"${disabled}></label>
          <button class="secondary" type="submit"${disabled}>Create audience</button>
        </form>
      </article>
    </section>

    <section class="card">
      <h2>Existing internal audiences</h2>
      ${
        input.audiences.length
          ? input.audiences
              .map(
                (audience) =>
                  `<div class="row"><strong>${escapeHtml(audience.name)}</strong><span class="muted">${escapeHtml([audience.eventName, audience.urlContains, audience.minValue].filter(Boolean).join(' · ') || 'All matched events')}</span></div>`,
              )
              .join('')
          : '<p class="muted">No audience rules created.</p>'
      }
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
      <pre>${escapeHtml(`window.hipaaTracking.track('Lead', {
  customData: { value: 125, currency: 'USD' }
})`)}</pre>
      <h2>Update consent</h2>
      <pre>${escapeHtml(`window.hipaaTracking.consent('granted')`)}</pre>
      <h2>Set region for consent mode</h2>
      <pre>${escapeHtml(`<script async src="${publicBaseUrl}/pixel.js" data-site-id="default" data-region-code="CA"></script>`)}</pre>
      <p>Feature flags are server-controlled. You do not need to replace the installed pixel when session recording, consent management, Meta, or GA4 are toggled. Audience builder controls are intentionally isolated under advanced risk settings.</p>
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
      <h2>Consent collector</h2>
      <p>The pixel can run its own consent collector. It supports a center modal with accept/options, a center modal with accept/manage/deny, and a small bottom notice that auto-consents outside configured explicit-consent regions. GPC and Do Not Track signals automatically deny optional tracking when enabled.</p>
      <h2>Session recording</h2>
      <p>The recorder uses rrweb under its MIT license. It batches incremental events and posts chunks with sendBeacon/fetch. Inputs are masked with a custom input masker, editable regions are blocked, visible text is scrubbed for emails, phones, numbers, addresses, dates, and sensitive labels, selected elements can be blocked with <code>ht-block</code> or <code>data-ht-block</code>, and collection only starts when the feature is enabled and consent is granted.</p>
      <h2>Audience builder</h2>
      <p>Audience builder is intentionally buried under advanced risk settings. It should be used only for internal, generic funnel analysis after legal and risk review. Do not create treatment, condition, diagnosis, medication, or procedure audiences for ad platforms.</p>
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

function colorInput(name: string, label: string, value: string, key: string) {
  return `<label>${escapeHtml(label)} <input type="color" name="${escapeHtml(name)}" data-consent-theme-input="${escapeHtml(key)}" value="${escapeHtml(value)}"></label>`
}

function consentThemeVars(theme: AppSettings['consent']['theme']) {
  return [
    `--ht-font:${theme.fontFamily}`,
    `--ht-panel:${theme.panelBackgroundColor}`,
    `--ht-text:${theme.textColor}`,
    `--ht-muted:${theme.mutedTextColor}`,
    `--ht-primary:${theme.primaryButtonBackgroundColor}`,
    `--ht-primary-text:${theme.primaryButtonTextColor}`,
    `--ht-secondary:${theme.secondaryButtonBackgroundColor}`,
    `--ht-secondary-text:${theme.secondaryButtonTextColor}`,
    `--ht-border:${theme.borderColor}`,
    `--ht-overlay:${theme.overlayColor}`,
    `--ht-radius:${theme.borderRadiusPx}`,
  ]
    .map(escapeHtml)
    .join(';')
}

function consentPreview(kind: 'modal' | 'bottom', title: string, actions: string[]) {
  return `<div class="consent-preview ${kind}">
    <div class="panel">
      <h3>${escapeHtml(title)}</h3>
      <p>We use a privacy-preserving relay for analytics and conversion measurement.</p>
      <div class="preview-actions">
        ${actions.map((action, index) => `<span class="${index === 0 ? 'primary' : 'secondary'}">${escapeHtml(action)}</span>`).join('')}
      </div>
    </div>
  </div>`
}

function consentThemePreviewScript() {
  return `<script>
    ;(function () {
      var preview = document.getElementById('consent-theme-preview')
      if (!preview) return
      var map = {
        font: '--ht-font',
        panel: '--ht-panel',
        text: '--ht-text',
        muted: '--ht-muted',
        primary: '--ht-primary',
        primaryText: '--ht-primary-text',
        secondary: '--ht-secondary',
        secondaryText: '--ht-secondary-text',
        border: '--ht-border',
        overlay: '--ht-overlay',
        radius: '--ht-radius'
      }
      document.querySelectorAll('[data-consent-theme-input]').forEach(function (input) {
        input.addEventListener('input', function () {
          var prop = map[input.getAttribute('data-consent-theme-input')]
          if (!prop) return
          preview.style.setProperty(prop, input.value)
        })
      })
    })()
  </script>`
}
