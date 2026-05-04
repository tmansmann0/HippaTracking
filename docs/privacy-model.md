# Privacy Model

HIPAATracking's default mode is intentionally conservative.

## Always Dropped Downstream

- Raw query strings
- URL fragments
- Referrers
- Page titles
- IP addresses
- Email addresses
- Phone numbers
- Names
- Arbitrary custom data

The server may receive some of this data as part of the browser request, but it
does not forward it to Meta or Google.

## Sensitive Route Redaction

If a URL, title, referrer, or event name contains a configured sensitive pattern,
the downstream `event_source_url` or `page_location` becomes:

```text
https://example.com/redacted
```

This prevents treatment or condition intent from being sent in ad-platform event
payloads.

## Strict Mode

`PRIVACY_MODE=strict` drops browser ad IDs and user agent from Meta payloads.
GA4 still receives a first-party relay client ID because Measurement Protocol
requires a client identifier.

## Attribution Mode

`PRIVACY_MODE=attribution` may forward `_fbp`, `_fbc`, and user agent only when:

- the event has `consent: "granted"`;
- the route is not sensitive;
- Meta forwarding is enabled.

It still does not forward email, phone, IP address, raw URL query strings, page
titles, or referrers.

## Session Recording

Session recording is off by default. When enabled, the installed pixel loads
rrweb from the relay host only after runtime configuration says recording is
enabled and consent is granted. The recorder uses:

- `maskAllInputs: true`;
- a custom `maskInputFn` for editable field values;
- `maskInputOptions` for text, email, phone, URL, search, date, number,
  password, textarea, and select fields;
- `maskTextSelector: "body"` plus a text scrubber that replaces common emails,
  phone numbers, SSNs, card-like numbers, dates, addresses, sensitive labels,
  and numbers;
- `blockSelector` for `data-ht-block`, `ht-block`, contenteditable regions,
  textbox roles, and multiline editable regions;
- `blockClass: "ht-block"` for regions that should not be serialized;
- batched uploads to reduce network overhead.

Recording chunks are also scrubbed server-side before being encrypted with
AES-256-GCM for database storage. This is defense-in-depth, not a guarantee
that recordings are safe to enable on pages where PHI may appear.

## Consent Events

Consent events are stored as encrypted payloads. They are not forwarded to ad
platforms.

## Audiences

Audience builder is intentionally buried under advanced risk settings and starts
disabled. Audience rules evaluate sanitized relay events. Audience members are
keyed with an HMAC of the browser client ID, not the raw client ID.

Do not use audience builder to create treatment, condition, diagnosis,
medication, or procedure audiences for ad platforms. It should remain internal
unless counsel and a documented risk analysis approve the exact use case.
