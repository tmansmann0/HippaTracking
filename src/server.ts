import express from 'express'
import helmet from 'helmet'
import { loadConfig, destinationReadiness } from './config.js'
import { sendToGa4 } from './destinations/ga4.js'
import { sendToMeta } from './destinations/meta.js'
import { writeSanitizedEventLog } from './event-log.js'
import { createPixelScript } from './pixel-script.js'
import { sanitizeIncomingEvent } from './sanitize.js'
import type { CollectResponse, RelayConfig } from './types.js'
import { collectEventSchema } from './validation.js'

const config = loadConfig()
const app = express()

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(express.json({ limit: '64kb' }))

app.get('/', (_request, response) => {
  const pixelUrl = new URL('/pixel.js', config.publicBaseUrl)
  pixelUrl.searchParams.set('site_id', config.siteId)

  response.type('text/plain').send(
    [
      'HippaTracking pixel relay is running.',
      '',
      'Install snippet:',
      `<script async src="${pixelUrl.toString()}" data-site-id="${config.siteId}" data-consent="unknown"></script>`,
      '',
      'Health: /healthz',
      'Collect endpoint: POST /collect',
    ].join('\n'),
  )
})

app.get('/healthz', (_request, response) => {
  response.json({
    ok: true,
    service: 'hippatracking',
    privacyMode: config.privacyMode,
    siteId: config.siteId,
    destinations: destinationReadiness(config),
  })
})

app.get('/pixel.js', (request, response) => {
  if (!originAllowed(config, request.get('origin'))) {
    response.status(403).send('Origin not allowed.')
    return
  }

  response
    .setHeader('Access-Control-Allow-Origin', request.get('origin') ?? '*')
    .setHeader('Cache-Control', 'public, max-age=300')
    .type('application/javascript')
    .send(createPixelScript(config))
})

app.options('/collect', (request, response) => {
  applyCors(config, request, response)
  response.status(204).send()
})

app.post('/collect', async (request, response) => {
  if (!originAllowed(config, request.get('origin'))) {
    response.status(403).send('Origin not allowed.')
    return
  }

  applyCors(config, request, response)

  const parsed = collectEventSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid collect payload.', issues: parsed.error.issues })
    return
  }

  if (parsed.data.siteId !== config.siteId) {
    response.status(403).json({ error: 'Unknown siteId.' })
    return
  }

  const event = sanitizeIncomingEvent(parsed.data, config)
  const destinations = await Promise.all([sendToMeta(event, config), sendToGa4(event, config)])
  const collectResponse: CollectResponse = {
    accepted: true,
    eventId: event.eventId,
    sensitiveContext: event.sensitiveContext,
    detectedSignals: event.detectedSignals,
    droppedFields: event.droppedFields,
    destinations,
  }

  await writeSanitizedEventLog(config, event, collectResponse)

  response.status(202).json(collectResponse)
})

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found.' })
})

app.listen(config.port, () => {
  console.log(`HippaTracking relay listening on :${config.port}`)
})

function applyCors(config: RelayConfig, request: express.Request, response: express.Response) {
  const origin = request.get('origin')
  if (origin && originAllowed(config, origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
  }

  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

function originAllowed(config: RelayConfig, origin: string | undefined) {
  if (!origin || config.allowedOrigins.length === 0) {
    return true
  }

  return config.allowedOrigins.includes(origin)
}
