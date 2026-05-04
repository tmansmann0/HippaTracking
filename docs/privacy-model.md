# Privacy Model

HippaTracking's default mode is intentionally conservative.

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
