import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'

export class CryptoBox {
  private readonly key: Buffer

  constructor(secret: string) {
    this.key = createHash('sha256').update(secret).digest()
  }

  encryptJson(value: unknown) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ])
    const tag = cipher.getAuthTag()

    return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
  }

  decryptJson<T>(sealed: string): T {
    const [version, iv, tag, ciphertext] = sealed.split('.')
    if (version !== 'v1' || !iv || !tag || !ciphertext) {
      throw new Error('Unsupported encrypted payload.')
    }

    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ])

    return JSON.parse(plaintext.toString('utf8')) as T
  }
}

export function hmacIdentifier(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('hex')
}
