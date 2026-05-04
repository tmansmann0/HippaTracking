import { z } from 'zod'
import type { ConsentEvent, IncomingRelayEvent, RecordingChunk } from './types.js'

const customValueSchema = z.union([z.string(), z.number(), z.boolean()])

export const collectEventSchema = z.object({
  siteId: z.string().min(1).max(80),
  eventName: z.string().min(1).max(80),
  eventId: z.string().min(1).max(120).optional(),
  url: z.string().min(1).max(4096),
  title: z.string().max(512).optional(),
  referrer: z.string().max(4096).optional(),
  clientId: z.string().max(160).optional(),
  fbp: z.string().max(180).optional(),
  fbc: z.string().max(220).optional(),
  userAgent: z.string().max(512).optional(),
  consent: z.enum(['granted', 'denied', 'unknown']).optional(),
  customData: z.record(z.string(), customValueSchema).optional(),
  timestamp: z.number().int().positive().optional(),
}) satisfies z.ZodType<IncomingRelayEvent>

export const consentEventSchema = z.object({
  siteId: z.string().min(1).max(80),
  clientId: z.string().min(1).max(180),
  consent: z.enum(['granted', 'denied', 'unknown']),
  categories: z.record(z.string(), z.boolean()).default({}),
  url: z.string().max(4096).optional(),
  timestamp: z.number().int().positive().default(() => Date.now()),
}) satisfies z.ZodType<ConsentEvent>

export const recordingChunkSchema = z.object({
  siteId: z.string().min(1).max(80),
  sessionId: z.string().min(1).max(180),
  clientId: z.string().min(1).max(180),
  url: z.string().min(1).max(4096),
  events: z.array(z.unknown()).max(1000),
  timestamp: z.number().int().positive().default(() => Date.now()),
}) satisfies z.ZodType<RecordingChunk>
