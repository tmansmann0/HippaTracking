const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const phonePattern = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g
const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g
const cardLikePattern = /\b(?:\d[ -]*?){13,19}\b/g
const datePattern = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g
const addressPattern =
  /\b\d{1,6}\s+[A-Z0-9][A-Z0-9.'\s-]{1,80}\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|way|parkway|pkwy|place|pl)\b/gi
const titleNamePattern = /\b(?:[Mm]r|[Mm]rs|[Mm]s|[Mm]iss|[Dd]r)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g
const sensitiveDateLabelPattern =
  /\b(?:dob|date of birth|birth date|ssn)\s*[:#-]?\s*[0-9/_.-]+/gi
const sensitiveIdLabelPattern =
  /\b(?:mrn|medical record|member id|patient id)\s*[:#-]?\s*[A-Z0-9_.-]+/gi
const numberPattern = /\b\d+(?:[.,]\d+)?\b/g
const fullRedactionKeys = new Set([
  'input',
  'inputvalue',
  'innertext',
  'value',
])

export function sanitizeRecordingChunkEvents(events: unknown[]) {
  return events.map((event) => sanitizeRecordingValue(event))
}

export function redactRecordingText(value: string) {
  return value
    .replace(emailPattern, '[email]')
    .replace(phonePattern, '[phone]')
    .replace(ssnPattern, '[ssn]')
    .replace(cardLikePattern, '[number]')
    .replace(sensitiveDateLabelPattern, '[redacted]')
    .replace(sensitiveIdLabelPattern, '[redacted]')
    .replace(datePattern, '[date]')
    .replace(addressPattern, '[address]')
    .replace(titleNamePattern, '[name]')
    .replace(numberPattern, '[number]')
}

function sanitizeRecordingValue(value: unknown, key = '', depth = 0): unknown {
  if (depth > 16) {
    return '[redacted]'
  }

  if (typeof value === 'string') {
    return shouldFullyRedactKey(key) ? '[redacted]' : redactRecordingText(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRecordingValue(item, key, depth + 1))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeRecordingValue(entryValue, entryKey, depth + 1),
    ]),
  )
}

function shouldFullyRedactKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, '')
  return (
    fullRedactionKeys.has(normalized) ||
    normalized.includes('email') ||
    normalized.includes('phone') ||
    normalized.includes('address') ||
    normalized.includes('birth') ||
    normalized.includes('patient') ||
    normalized.includes('medical') ||
    normalized.includes('member') ||
    normalized.includes('ssn')
  )
}
