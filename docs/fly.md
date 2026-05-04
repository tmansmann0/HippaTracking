# Fly.io Setup

Fly.io is the recommended first production target for this repo because it has
public HIPAA/BAA positioning at a lower platform floor than Render's HIPAA
workspace pricing.

Do not collect ePHI until the account has an executed Fly.io BAA and the BAA
scope covers every Fly service that will touch the data, including the app,
Managed Postgres, and any object storage or extensions.

## Why Fly

- Fly advertises HIPAA-compliant workload support, including BAAs and SOC2
  materials, for `$99/mo` plus infrastructure usage.
- Fly's BAA is described as pre-signed by Fly.io and active when the customer
  signs it.
- Fly deploys Dockerfile apps directly and stores app secrets in its secret
  vault.
- Fly Managed Postgres starts at the Basic plan and includes high availability,
  backups, connection pooling, and encryption at rest and in transit.

Sources:

- Fly pricing: https://fly.io/pricing
- Fly compliance and BAA: https://fly.io/compliance
- Fly compliance documents: https://fly.io/documents
- Fly Dockerfile deployment: https://fly.io/docs/languages-and-frameworks/dockerfile/
- Fly secrets: https://fly.io/docs/apps/secrets/
- Fly Managed Postgres: https://fly.io/docs/mpg/

## Cost Shape

As of the May 2026 public pages, a small production deployment is roughly:

| Item | Public price signal |
| --- | --- |
| Fly HIPAA/compliance support | `$99/mo` |
| One always-on shared VM | Usage based |
| Managed Postgres Basic | `$38/mo` plus storage |
| Managed Postgres storage | `$0.28/GB/mo` |
| North America or Europe egress | `$0.02/GB` |

The relay should keep at least one Machine running. Cold starts are bad for
paid-ad attribution because browser beacons often have short lifetimes.

## Deploy

Install and log in:

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

Create the app without deploying yet:

```bash
fly launch --no-deploy
```

Choose:

- A unique app name, such as `hipaa-tracking-yourclinic`.
- Region `iad` or another US region close to the tracked site.
- No Redis.
- Managed Postgres if prompted, or create it separately with the next step.

If `fly launch` rewrites `fly.toml`, keep these relay choices:

```toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "off"
  auto_start_machines = true
  min_machines_running = 1
```

Create Managed Postgres if it was not created during launch:

```bash
fly mpg create --name hipaa-tracking-db --region iad --plan basic --volume-size 10
fly mpg list
fly mpg attach <CLUSTER_ID> -a <APP_NAME>
```

Set required secrets:

```bash
fly secrets set \
  APP_SECRET="$(openssl rand -base64 32)" \
  APP_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  PUBLIC_BASE_URL="https://<APP_NAME>.fly.dev" \
  ALLOWED_ORIGINS="https://example.com" \
  RELAY_SITE_ID="default"
```

Set destination secrets only when ready:

```bash
fly secrets set \
  META_ENABLED="true" \
  META_PIXEL_ID="1234567890" \
  META_ACCESS_TOKEN="your-meta-token"

fly secrets set \
  GA4_ENABLED="true" \
  GA4_MEASUREMENT_ID="G-XXXXXXXXXX" \
  GA4_API_SECRET="your-ga4-secret"
```

Deploy:

```bash
fly deploy
fly status
fly apps open
```

Finish setup at:

```text
https://<APP_NAME>.fly.dev/setup
```

## Production Guardrails

Before enabling session recording or audience building for real patient traffic:

- Confirm the BAA is signed and covers app compute plus the database.
- Keep `PRIVACY_MODE=strict` until counsel approves attribution mode. Even in
  attribution mode, Meta and GA4 receive keyed-hash identity rather than raw
  browser IDs.
- Keep `auto_stop_machines="off"` and `min_machines_running=1`.
- Use a custom domain with HTTPS before installing the pixel broadly.
- Restrict `ALLOWED_ORIGINS` to exact production origins.
- Disable `EVENT_LOG_PATH` unless a Fly volume and retention policy are in
  place.
- Treat session recording chunks as ePHI even with masking enabled.
- Add the remaining HIPAA controls tracked in `docs/hipaa-evaluation.md`.
