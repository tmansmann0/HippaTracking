# Railway Setup

## From GitHub

Do not use Railway for production ePHI unless your Railway account/project has
an executed HIPAA BAA covering the deployed service and Postgres database. HHS
cloud guidance treats a cloud provider that stores or processes ePHI as a
business associate even if the data is encrypted and the provider does not hold
the key.

1. Push this repository to GitHub.
2. Open Railway.
3. Click **New Project**.
4. Select **Deploy from GitHub repo**.
5. Choose this repository.
6. Add a Postgres service.
7. Add variables:
   - `DATABASE_URL`
   - `APP_SECRET`
   - `APP_ENCRYPTION_KEY`
   - `PUBLIC_BASE_URL`
   - `ALLOWED_ORIGINS`
   - `RELAY_SITE_ID`
   - `PRIVACY_MODE`
8. Add Meta and GA4 variables if those destinations should be active.
9. Deploy.
10. Open `/setup` on the deployed service.

Railway reads `railway.json` and uses:

```json
{
  "build": {
    "buildCommand": "npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/healthz"
  }
}
```

## Create A One-Click Template

Railway deploy buttons point to a Railway template code. To create that:

1. Go to Railway workspace settings.
2. Open **Templates**.
3. Create a template from this GitHub repo.
4. Add service variables.
5. Enable public HTTP networking.
6. Set `/healthz` as the healthcheck path.
7. Copy the generated `https://railway.com/deploy/...` URL.
8. Put it in the README deploy button.

Template variable suggestions:

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. |
| `APP_SECRET` | Yes | Generate with `openssl rand -base64 32`. |
| `APP_ENCRYPTION_KEY` | Yes | Generate with `openssl rand -base64 32`. |
| `PUBLIC_BASE_URL` | Yes | Railway app URL after deploy. |
| `ALLOWED_ORIGINS` | Yes | Site origins allowed to use the pixel. |
| `RELAY_SITE_ID` | Yes | Public ID in the pixel snippet. |
| `PRIVACY_MODE` | No | Default `strict`. |
| `META_ENABLED` | No | Set `true` after adding Meta credentials. |
| `META_PIXEL_ID` | No | Required only if Meta is enabled. |
| `META_ACCESS_TOKEN` | No | Required only if Meta is enabled. |
| `GA4_ENABLED` | No | Set `true` after adding GA4 credentials. |
| `GA4_MEASUREMENT_ID` | No | Required only if GA4 is enabled. |
| `GA4_API_SECRET` | No | Required only if GA4 is enabled. |

## Volumes

Postgres is the primary durable store. A Railway volume is not required unless
you also set `EVENT_LOG_PATH` for a local JSONL audit log.
