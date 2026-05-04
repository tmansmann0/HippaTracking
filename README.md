# HippaTracking

HippaTracking is a hostable pixel relay for clinics and other sensitive-service
businesses that need conversion measurement without sending raw treatment-page
context directly to ad platforms.

The flow is:

```text
website pixel -> HippaTracking relay -> sanitizer/policy layer -> Meta CAPI and/or GA4
```

This is backend infrastructure, not a landing page. It serves a configurable
tracking script at `/pixel.js`, receives browser events at `/collect`, strips
risky context, and forwards only the minimum viable event data to configured
destinations.

## What It Does

- Generates a drop-in browser pixel script.
- Auto-tracks `PageView` and exposes `window.hippaTracking.track(...)`.
- Receives events server-side through `POST /collect`.
- Removes query strings, hashes, referrers, page titles, IPs, email, phone, and
  other direct identifiers from downstream payloads.
- Redacts sensitive routes such as treatment or condition pages.
- Sends sanitized events to Meta Conversions API.
- Sends sanitized events to GA4 Measurement Protocol.
- Defaults to `PRIVACY_MODE=strict`.
- Supports an optional `attribution` mode that forwards `_fbp`, `_fbc`, and user
  agent only when consent is granted and the page is not sensitive.
- Includes Railway config-as-code for hosting.

## Install On A Site

After deploying the relay, place this on the site you want to track:

```html
<script
  async
  src="https://YOUR-RELAY-DOMAIN/pixel.js"
  data-site-id="default"
  data-consent="unknown"
></script>
```

Track a conversion:

```html
<script>
  window.hippaTracking?.track('Lead', {
    customData: {
      value: 125,
      currency: 'USD'
    }
  })
</script>
```

If you have a consent banner, update consent before tracking:

```html
<script>
  window.hippaTracking?.consent('granted')
</script>
```

## API

### `GET /healthz`

Healthcheck used by Railway and uptime monitors.

### `GET /pixel.js`

Returns the browser pixel script. The script posts to `/collect` on the same
relay host unless `data-endpoint` is provided.

### `POST /collect`

Receives browser event data.

```json
{
  "siteId": "default",
  "eventName": "Lead",
  "eventId": "evt_123",
  "url": "https://clinic.example/semaglutide?utm_source=google",
  "title": "Semaglutide Consultation",
  "referrer": "https://google.com/search?q=semaglutide",
  "clientId": "ht.example-client-id",
  "consent": "unknown",
  "customData": {
    "value": 125,
    "currency": "USD"
  }
}
```

Sensitive page output uses a redacted URL:

```json
{
  "event_source_url": "https://clinic.example/redacted",
  "custom_data": {
    "value": 125,
    "currency": "USD"
  }
}
```

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:3000/healthz
http://localhost:3000/pixel.js
```

Run checks:

```bash
npm run lint
npm run test
npm run build
```

## Environment Variables

Required for basic hosting:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_BASE_URL` | Public relay URL, for example `https://relay.example.com`. |
| `ALLOWED_ORIGINS` | Comma-separated website origins allowed to use the relay. |
| `RELAY_SITE_ID` | Public site ID used by the browser pixel. |

Privacy policy:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PRIVACY_MODE` | `strict` | `strict` or `attribution`. |
| `SENSITIVE_PATH_PATTERNS` | medspa defaults | Comma-separated route/title/referrer fragments to redact. |
| `ALLOWED_CUSTOM_DATA_KEYS` | `value,currency` | Only these event custom-data keys can be forwarded. |

Meta:

| Variable | Purpose |
| --- | --- |
| `META_ENABLED` | Set `true` to send to Meta. |
| `META_PIXEL_ID` | Meta Pixel ID. |
| `META_ACCESS_TOKEN` | Meta Conversions API token. |
| `META_GRAPH_VERSION` | Graph API version, default `v21.0`. |
| `META_TEST_EVENT_CODE` | Optional Events Manager test code. |

GA4:

| Variable | Purpose |
| --- | --- |
| `GA4_ENABLED` | Set `true` to send to GA4. |
| `GA4_MEASUREMENT_ID` | GA4 web stream measurement ID. |
| `GA4_API_SECRET` | Measurement Protocol API secret. |
| `GA4_ENDPOINT_REGION` | `global` or `eu`. |

## Deploy To Railway

This repo includes `railway.json`, so Railway can build with `npm ci && npm run
build`, start with `npm run start`, and healthcheck `/healthz`.

Fast path:

1. Push this repo to GitHub.
2. In Railway, choose **New Project** -> **Deploy from GitHub repo**.
3. Select this repo.
4. Add the environment variables above.
5. Deploy.

CLI path:

```bash
railway init
railway variables set PUBLIC_BASE_URL=https://YOUR-RAILWAY-DOMAIN
railway variables set ALLOWED_ORIGINS=https://YOUR-WEBSITE
railway variables set RELAY_SITE_ID=default
railway up
```

One-click template path:

1. In Railway, open workspace **Templates**.
2. Create a new template from this GitHub repo.
3. Add required variables: `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`, `RELAY_SITE_ID`.
4. Add optional variables for Meta and GA4.
5. Copy Railway's generated template URL.
6. Replace the placeholder below:

```md
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/YOUR_TEMPLATE_CODE?utm_medium=integration&utm_source=template&utm_campaign=hippatracking)
```

Railway creates deploy buttons from Railway templates, not arbitrary GitHub repos,
so this last step has to happen once in your Railway workspace.

## Platform Notes

- Meta Conversions API is server-to-server event delivery tied to a Pixel.
- GA4 Measurement Protocol sends events directly to Google Analytics over HTTPS.
- GA4 Measurement Protocol is intended to supplement normal tagging, not replace
  all client-side collection.
- This relay intentionally prioritizes privacy and minimum viable attribution
  over maximum ad-platform match quality.

See `docs/references.md` for the official docs used while shaping the first
implementation.

## License

Public source, but not standard open source. Small businesses under USD
`$10k/mo` may self-host for internal use. Agencies, resellers, white-label
client delivery, hosted resale, and managed-service use require separate written
permission. See `LICENSE`.

This is not legal advice and does not guarantee HIPAA compliance. You still need
legal, security, privacy, BAA, and operational review.
