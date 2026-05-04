import express from 'express'
import helmet from 'helmet'
import { compare, hash } from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateAudiences } from './audiences.js'
import { loadConfig, destinationReadiness } from './config.js'
import { sendToGa4 } from './destinations/ga4.js'
import { sendToMeta } from './destinations/meta.js'
import { writeSanitizedEventLog } from './event-log.js'
import {
  advancedSettingsPage,
  dashboardPage,
  developerDocs,
  loginPage,
  setupPage,
  usageDocs,
} from './html.js'
import { createPixelScript } from './pixel-script.js'
import { sanitizeRecordingChunkEvents } from './recording-sanitize.js'
import { sanitizeIncomingEvent } from './sanitize.js'
import { clearSessionCookie, createSessionCookie, requireSession } from './session.js'
import { defaultSettings, parseCsv, parseRegionCodes } from './settings.js'
import { createStore } from './store.js'
import type { AppSettings, CollectResponse, RelayConfig } from './types.js'
import {
  collectEventSchema,
  consentEventSchema,
  recordingChunkSchema,
} from './validation.js'

const config = loadConfig()
const store = createStore(config)
const app = express()
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: '512kb' }))

app.get('/', async (_request, response) => {
  response.redirect((await store.hasAdmin()) ? '/dashboard' : '/setup')
})

app.get('/setup', async (_request, response) => {
  if (await store.hasAdmin()) {
    response.redirect('/dashboard')
    return
  }

  response.type('html').send(setupPage())
})

app.post('/setup', async (request, response) => {
  if (await store.hasAdmin()) {
    response.redirect('/dashboard')
    return
  }

  const recoveryKey = `htrec_${randomBytes(24).toString('base64url')}`
  const settings = settingsFromSetupForm(request.body, config)
  await store.saveSettings(settings)
  await store.createAdmin({
    email: stringField(request.body.email).toLowerCase(),
    passwordHash: await hash(stringField(request.body.password), 12),
    recoveryKeyHash: await hash(recoveryKey, 12),
  })

  response.type('html').send(setupPage(recoveryKey))
})

app.get('/login', (_request, response) => {
  response.type('html').send(loginPage())
})

app.post('/login', async (request, response) => {
  const admin = await store.findAdminByEmail(stringField(request.body.email))
  const valid = admin
    ? await compare(stringField(request.body.password), admin.passwordHash)
    : false

  if (!admin || !valid) {
    response.status(401).type('html').send(loginPage('Invalid email or password.'))
    return
  }

  response.setHeader(
    'Set-Cookie',
    createSessionCookie(config.appSecret, {
      userId: admin.id,
      email: admin.email,
      exp: Date.now() + 1000 * 60 * 60 * 8,
    }),
  )
  response.redirect('/dashboard')
})

app.post('/logout', (_request, response) => {
  response.setHeader('Set-Cookie', clearSessionCookie())
  response.redirect('/login')
})

app.get('/dashboard', async (request, response) => {
  if (!(await store.hasAdmin())) {
    response.redirect('/setup')
    return
  }

  const session = requireSession(request, response, config.appSecret)
  if (!session) return

  const [settings, stats] = await Promise.all([
    store.getSettings(),
    store.getStats(),
  ])

  response.type('html').send(
    dashboardPage({
      settings,
      stats,
      publicBaseUrl: config.publicBaseUrl.replace(/\/$/, ''),
      destinations: destinationReadiness(effectiveDestinationConfig(config, settings)),
    }),
  )
})

app.post('/settings/features', async (request, response) => {
  const session = requireSession(request, response, config.appSecret)
  if (!session) return

  const settings = await store.getSettings()
  await store.saveSettings({
    ...settings,
    features: {
      metaTracking: request.body.metaTracking === 'on',
      googleAnalytics: request.body.googleAnalytics === 'on',
      sessionRecording: request.body.sessionRecording === 'on',
      consentManager: request.body.consentManager === 'on',
      audienceBuilder: settings.features.audienceBuilder,
    },
  })
  response.redirect('/dashboard')
})

app.get('/settings/advanced', async (request, response) => {
  const session = requireSession(request, response, config.appSecret)
  if (!session) return

  const [settings, stats, audiences] = await Promise.all([
    store.getSettings(),
    store.getStats(),
    store.listAudienceRules(),
  ])

  response.type('html').send(
    advancedSettingsPage({
      settings,
      stats,
      audiences,
    }),
  )
})

app.post('/settings/audience-builder', async (request, response) => {
  const session = requireSession(request, response, config.appSecret)
  if (!session) return

  const settings = await store.getSettings()
  const requestedEnable = request.body.audienceBuilder === 'on'
  const riskAccepted = request.body.audienceBuilderRiskAccepted === 'on'

  await store.saveSettings({
    ...settings,
    features: {
      ...settings.features,
      audienceBuilder: requestedEnable && riskAccepted,
    },
  })

  response.redirect('/settings/advanced')
})

app.post('/settings/policy', async (request, response) => {
  const session = requireSession(request, response, config.appSecret)
  if (!session) return

  const settings = await store.getSettings()
  await store.saveSettings({
    ...settings,
    allowedOrigins: linesOrCsv(stringField(request.body.allowedOrigins)),
    privacyMode: request.body.privacyMode === 'attribution' ? 'attribution' : 'strict',
    sensitivePathPatterns: linesOrCsv(stringField(request.body.sensitivePathPatterns)),
    allowedCustomDataKeys: parseCsv(stringField(request.body.allowedCustomDataKeys)),
  })
  response.redirect('/dashboard')
})

app.post('/settings/consent', async (request, response) => {
  const session = requireSession(request, response, config.appSecret)
  if (!session) return

  const settings = await store.getSettings()
  await store.saveSettings({
    ...settings,
    consent: {
      preset: consentPresetFromForm(request.body.consentPreset),
      respectOptOutSignals: request.body.respectOptOutSignals === 'on',
      requiredRegionCodes: parseRegionCodes(stringField(request.body.requiredRegionCodes)),
    },
  })
  response.redirect('/dashboard')
})

app.post('/audiences', async (request, response) => {
  const session = requireSession(request, response, config.appSecret)
  if (!session) return

  const settings = await store.getSettings()
  if (!settings.features.audienceBuilder) {
    response.redirect('/settings/advanced')
    return
  }

  const name = stringField(request.body.name).trim()
  if (name) {
    const minValue = Number(request.body.minValue)
    await store.createAudienceRule({
      name,
      eventName: optionalString(request.body.eventName),
      urlContains: optionalString(request.body.urlContains),
      minValue: Number.isFinite(minValue) ? minValue : undefined,
    })
  }
  response.redirect('/settings/advanced')
})

app.get('/docs/usage', (_request, response) => {
  response.type('html').send(usageDocs(config.publicBaseUrl.replace(/\/$/, '')))
})

app.get('/docs/developers', (_request, response) => {
  response.type('html').send(developerDocs())
})

app.get('/healthz', async (_request, response) => {
  const settings = await store.getSettings()
  response.json({
    ok: true,
    service: 'hipaa-tracking',
    privacyMode: settings.privacyMode,
    siteId: settings.siteId,
    setupComplete: await store.hasAdmin(),
    storage: config.databaseUrl ? 'postgres' : 'memory',
    features: settings.features,
    destinations: destinationReadiness(effectiveDestinationConfig(config, settings)),
  })
})

app.get('/.well-known/gpc.json', (_request, response) => {
  response.json({
    gpc: true,
    lastUpdate: '2026-05-04',
  })
})

app.get('/client-config', async (request, response) => {
  const settings = await store.getSettings()
  if (String(request.query.siteId ?? settings.siteId) !== settings.siteId) {
    response.status(403).json({ error: 'Unknown siteId.' })
    return
  }

  response.setHeader('Cache-Control', 'no-store')
  response.json({
    siteId: settings.siteId,
    privacyMode: settings.privacyMode,
    features: settings.features,
    consent: settings.consent,
    signals: {
      gpcHeader: request.get('sec-gpc') === '1',
    },
    regionCode: detectRegionCode(request),
    endpoints: {
      collect: `${config.publicBaseUrl.replace(/\/$/, '')}/collect`,
      consent: `${config.publicBaseUrl.replace(/\/$/, '')}/consent`,
      record: `${config.publicBaseUrl.replace(/\/$/, '')}/record`,
    },
  })
})

app.get('/pixel.js', async (request, response) => {
  const settings = await store.getSettings()
  if (!originAllowed(settings, request.get('origin'))) {
    response.status(403).send('Origin not allowed.')
    return
  }

  response
    .setHeader('Access-Control-Allow-Origin', request.get('origin') ?? '*')
    .setHeader('Cache-Control', 'public, max-age=300')
    .type('application/javascript')
    .send(createPixelScript({ ...config, siteId: settings.siteId }))
})

app.get('/vendor/rrweb-record.min.js', (_request, response) => {
  response
    .setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    .sendFile(path.join(rootDir, 'node_modules/rrweb/dist/record/rrweb-record.min.js'))
})

app.options(['/collect', '/consent', '/record'], async (request, response) => {
  applyCors(await store.getSettings(), request, response)
  response.status(204).send()
})

app.post('/collect', async (request, response) => {
  const settings = await store.getSettings()
  if (!originAllowed(settings, request.get('origin'))) {
    response.status(403).send('Origin not allowed.')
    return
  }

  applyCors(settings, request, response)

  const parsed = collectEventSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid collect payload.', issues: parsed.error.issues })
    return
  }

  if (parsed.data.siteId !== settings.siteId) {
    response.status(403).json({ error: 'Unknown siteId.' })
    return
  }

  const event = sanitizeIncomingEvent(parsed.data, settingsToRelayConfig(config, settings))
  const destinationConfig = effectiveEventDestinationConfig(
    effectiveDestinationConfig(config, settings),
    event,
  )
  const destinations = await Promise.all([
    sendToMeta(event, destinationConfig),
    sendToGa4(event, destinationConfig),
  ])

  if (settings.features.audienceBuilder) {
    await evaluateAudiences(store, event)
  }

  const collectResponse: CollectResponse = {
    accepted: true,
    eventId: event.eventId,
    sensitiveContext: event.sensitiveContext,
    detectedSignals: event.detectedSignals,
    droppedFields: event.droppedFields,
    destinations,
  }

  await writeSanitizedEventLog(destinationConfig, event, collectResponse)

  response.status(202).json(collectResponse)
})

app.post('/consent', async (request, response) => {
  const settings = await store.getSettings()
  if (!settings.features.consentManager) {
    response.status(204).send()
    return
  }

  if (!originAllowed(settings, request.get('origin'))) {
    response.status(403).send('Origin not allowed.')
    return
  }

  applyCors(settings, request, response)
  const parsed = consentEventSchema.safeParse(request.body)
  if (!parsed.success || parsed.data.siteId !== settings.siteId) {
    response.status(400).json({ error: 'Invalid consent payload.' })
    return
  }

  await store.saveConsent(parsed.data)
  response.status(202).json({ accepted: true })
})

app.post('/record', async (request, response) => {
  const settings = await store.getSettings()
  if (!settings.features.sessionRecording) {
    response.status(204).send()
    return
  }

  if (!originAllowed(settings, request.get('origin'))) {
    response.status(403).send('Origin not allowed.')
    return
  }

  applyCors(settings, request, response)
  const parsed = recordingChunkSchema.safeParse(request.body)
  if (!parsed.success || parsed.data.siteId !== settings.siteId) {
    response.status(400).json({ error: 'Invalid recording payload.' })
    return
  }

  await store.saveRecordingChunk({
    ...parsed.data,
    events: sanitizeRecordingChunkEvents(parsed.data.events),
  })
  response.status(202).json({ accepted: true })
})

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found.' })
})

await store.init()
app.listen(config.port, () => {
  console.log(`HIPAATracking relay listening on :${config.port}`)
})

function applyCors(settings: AppSettings, request: express.Request, response: express.Response) {
  const origin = request.get('origin')
  if (origin && originAllowed(settings, origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
  }

  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

function originAllowed(settings: AppSettings, origin: string | undefined) {
  if (!origin || settings.allowedOrigins.length === 0) {
    return true
  }

  return settings.allowedOrigins.includes(origin)
}

function effectiveDestinationConfig(config: RelayConfig, settings: AppSettings): RelayConfig {
  return {
    ...settingsToRelayConfig(config, settings),
    meta: {
      ...config.meta,
      enabled: config.meta.enabled && settings.features.metaTracking,
    },
    ga4: {
      ...config.ga4,
      enabled: config.ga4.enabled && settings.features.googleAnalytics,
    },
  }
}

function effectiveEventDestinationConfig(
  config: RelayConfig,
  event: ReturnType<typeof sanitizeIncomingEvent>,
): RelayConfig {
  const canUseAnalytics = event.consent === 'granted' && event.consentCategories.analytics
  const canUseAdvertising = event.consent === 'granted' && event.consentCategories.advertising

  return {
    ...config,
    meta: {
      ...config.meta,
      enabled: config.meta.enabled && canUseAdvertising,
    },
    ga4: {
      ...config.ga4,
      enabled: config.ga4.enabled && canUseAnalytics,
    },
  }
}

function settingsToRelayConfig(config: RelayConfig, settings: AppSettings): RelayConfig {
  return {
    ...config,
    siteId: settings.siteId,
    allowedOrigins: settings.allowedOrigins,
    privacyMode: settings.privacyMode,
    sensitivePathPatterns: settings.sensitivePathPatterns,
    allowedCustomDataKeys: settings.allowedCustomDataKeys,
  }
}

function settingsFromSetupForm(body: Record<string, unknown>, config: RelayConfig): AppSettings {
  const settings = defaultSettings(config)

  return {
    ...settings,
    siteId: stringField(body.siteId) || settings.siteId,
    allowedOrigins: linesOrCsv(stringField(body.allowedOrigins)),
    privacyMode: body.privacyMode === 'attribution' ? 'attribution' : 'strict',
    features: {
      metaTracking: body.metaTracking === 'on',
      googleAnalytics: body.googleAnalytics === 'on',
      sessionRecording: body.sessionRecording === 'on',
      consentManager: body.consentManager === 'on',
      audienceBuilder: false,
    },
  }
}

function consentPresetFromForm(value: unknown) {
  if (
    value === 'modal_accept_options' ||
    value === 'modal_accept_manage_deny' ||
    value === 'bottom_auto_except_required'
  ) {
    return value
  }

  return 'modal_accept_manage_deny'
}

function detectRegionCode(request: express.Request) {
  const value =
    stringField(request.query.regionCode).trim() ||
    stringField(request.query.region).trim() ||
    stringField(request.get('cf-region-code')).trim() ||
    stringField(request.get('x-vercel-ip-country-region')).trim() ||
    stringField(request.get('x-region-code')).trim()

  return value.toUpperCase().replace(/^US-/, '')
}

function linesOrCsv(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function optionalString(value: unknown) {
  const normalized = stringField(value).trim()
  return normalized || undefined
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value : ''
}
