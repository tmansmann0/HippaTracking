import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import { parse, serialize } from 'cookie'

export type AdminSession = {
  userId: string
  email: string
  exp: number
}

const cookieName = 'ht_admin'

export function createSessionCookie(secret: string, session: AdminSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = sign(secret, payload)

  return serialize(cookieName, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
}

export function clearSessionCookie() {
  return serialize(cookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function readSession(request: Request, secret: string): AdminSession | null {
  const raw = parse(request.headers.cookie ?? '')[cookieName]
  if (!raw) return null

  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return null

  if (!signatureMatches(sign(secret, payload), signature)) {
    return null
  }

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession
  return parsed.exp > Date.now() ? parsed : null
}

export function requireSession(
  request: Request,
  response: Response,
  secret: string,
) {
  const session = readSession(request, secret)
  if (!session) {
    response.redirect('/login')
    return null
  }

  return session
}

function sign(secret: string, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function signatureMatches(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  )
}
