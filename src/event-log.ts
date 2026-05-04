import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'
import type { CollectResponse, RelayConfig, SanitizedRelayEvent } from './types.js'

export async function writeSanitizedEventLog(
  config: RelayConfig,
  event: SanitizedRelayEvent,
  response: CollectResponse,
) {
  if (!config.eventLogPath) {
    return
  }

  await mkdir(path.dirname(config.eventLogPath), { recursive: true })
  await appendFile(
    config.eventLogPath,
    `${JSON.stringify({
      receivedAt: new Date().toISOString(),
      event,
      destinations: response.destinations.map((destination) => ({
        destination: destination.destination,
        skipped: destination.skipped,
        ok: destination.ok,
        statusCode: destination.statusCode,
        message: destination.message,
      })),
    })}\n`,
  )
}
