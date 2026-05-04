import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import type {
  AdminUser,
  AppSettings,
  AudienceInput,
  AudienceRule,
  ConsentEvent,
  DashboardStats,
  RecordingChunk,
  RelayConfig,
} from './types.js'
import { CryptoBox, hmacIdentifier } from './crypto-box.js'
import { defaultSettings } from './settings.js'

export type Store = {
  init(): Promise<void>
  hasAdmin(): Promise<boolean>
  createAdmin(input: {
    email: string
    passwordHash: string
    recoveryKeyHash: string
  }): Promise<AdminUser>
  findAdminByEmail(email: string): Promise<AdminUser | null>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
  saveConsent(event: ConsentEvent): Promise<void>
  saveRecordingChunk(chunk: RecordingChunk): Promise<void>
  createAudienceRule(input: AudienceInput): Promise<AudienceRule>
  listAudienceRules(): Promise<AudienceRule[]>
  addAudienceMember(ruleId: string, clientId: string): Promise<void>
  getStats(): Promise<DashboardStats>
}

export function createStore(config: RelayConfig): Store {
  if (config.databaseUrl) {
    return new PostgresStore(config)
  }

  return new MemoryStore(config)
}

class MemoryStore implements Store {
  private admin: AdminUser | null = null
  private settings: AppSettings
  private readonly consents: ConsentEvent[] = []
  private readonly recordings: RecordingChunk[] = []
  private readonly audienceRules: AudienceRule[] = []
  private readonly audienceMembers = new Map<string, Set<string>>()

  constructor(private readonly config: RelayConfig) {
    this.settings = defaultSettings(config)
  }

  async init() {}

  async hasAdmin() {
    return Boolean(this.admin)
  }

  async createAdmin(input: {
    email: string
    passwordHash: string
    recoveryKeyHash: string
  }) {
    this.admin = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      recoveryKeyHash: input.recoveryKeyHash,
      createdAt: new Date().toISOString(),
    }
    return this.admin
  }

  async findAdminByEmail(email: string) {
    return this.admin?.email.toLowerCase() === email.toLowerCase() ? this.admin : null
  }

  async getSettings() {
    return this.settings
  }

  async saveSettings(settings: AppSettings) {
    this.settings = settings
  }

  async saveConsent(event: ConsentEvent) {
    this.consents.push(event)
  }

  async saveRecordingChunk(chunk: RecordingChunk) {
    this.recordings.push(chunk)
  }

  async createAudienceRule(input: AudienceInput) {
    const rule: AudienceRule = {
      id: randomUUID(),
      name: input.name,
      eventName: input.eventName,
      urlContains: input.urlContains,
      minValue: input.minValue,
      createdAt: new Date().toISOString(),
    }
    this.audienceRules.push(rule)
    return rule
  }

  async listAudienceRules() {
    return this.audienceRules
  }

  async addAudienceMember(ruleId: string, clientId: string) {
    const set = this.audienceMembers.get(ruleId) ?? new Set<string>()
    set.add(hmacIdentifier(this.config.appSecret, clientId))
    this.audienceMembers.set(ruleId, set)
  }

  async getStats() {
    return {
      consentEvents: this.consents.length,
      recordingChunks: this.recordings.length,
      audienceRules: this.audienceRules.length,
      audienceMembers: [...this.audienceMembers.values()].reduce(
        (total, set) => total + set.size,
        0,
      ),
    }
  }
}

class PostgresStore implements Store {
  private readonly pool: Pool
  private readonly box: CryptoBox

  constructor(private readonly config: RelayConfig) {
    this.pool = new Pool({ connectionString: config.databaseUrl })
    this.box = new CryptoBox(config.encryptionKey)
  }

  async init() {
    await this.pool.query(`
      create table if not exists admins (
        id text primary key,
        email text not null unique,
        password_hash text not null,
        recovery_key_hash text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists app_settings (
        id integer primary key default 1,
        data jsonb not null,
        updated_at timestamptz not null default now()
      );

      create table if not exists consent_events (
        id text primary key,
        site_id text not null,
        client_key text not null,
        payload_ciphertext text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists recording_chunks (
        id text primary key,
        site_id text not null,
        session_key text not null,
        client_key text not null,
        payload_ciphertext text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists audience_rules (
        id text primary key,
        name text not null,
        event_name text,
        url_contains text,
        min_value numeric,
        created_at timestamptz not null default now()
      );

      create table if not exists audience_members (
        rule_id text not null references audience_rules(id) on delete cascade,
        client_key text not null,
        first_seen_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now(),
        match_count integer not null default 1,
        primary key (rule_id, client_key)
      );
    `)

    const existing = await this.pool.query('select id from app_settings where id = 1')
    if (existing.rowCount === 0) {
      await this.saveSettings(defaultSettings(this.config))
    }
  }

  async hasAdmin() {
    const result = await this.pool.query('select 1 from admins limit 1')
    return (result.rowCount ?? 0) > 0
  }

  async createAdmin(input: {
    email: string
    passwordHash: string
    recoveryKeyHash: string
  }) {
    const id = randomUUID()
    const result = await this.pool.query<{
      id: string
      email: string
      password_hash: string
      recovery_key_hash: string
      created_at: Date
    }>(
      `insert into admins (id, email, password_hash, recovery_key_hash)
       values ($1, $2, $3, $4)
       returning id, email, password_hash, recovery_key_hash, created_at`,
      [id, input.email.toLowerCase(), input.passwordHash, input.recoveryKeyHash],
    )

    return adminFromRow(result.rows[0])
  }

  async findAdminByEmail(email: string) {
    const result = await this.pool.query<{
      id: string
      email: string
      password_hash: string
      recovery_key_hash: string
      created_at: Date
    }>(
      `select id, email, password_hash, recovery_key_hash, created_at
       from admins
       where email = $1`,
      [email.toLowerCase()],
    )

    return result.rows[0] ? adminFromRow(result.rows[0]) : null
  }

  async getSettings() {
    const result = await this.pool.query<{ data: AppSettings }>(
      'select data from app_settings where id = 1',
    )
    return result.rows[0]?.data ?? defaultSettings(this.config)
  }

  async saveSettings(settings: AppSettings) {
    await this.pool.query(
      `insert into app_settings (id, data, updated_at)
       values (1, $1, now())
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [settings],
    )
  }

  async saveConsent(event: ConsentEvent) {
    await this.pool.query(
      `insert into consent_events (id, site_id, client_key, payload_ciphertext)
       values ($1, $2, $3, $4)`,
      [
        randomUUID(),
        event.siteId,
        hmacIdentifier(this.config.appSecret, event.clientId),
        this.box.encryptJson(event),
      ],
    )
  }

  async saveRecordingChunk(chunk: RecordingChunk) {
    await this.pool.query(
      `insert into recording_chunks
       (id, site_id, session_key, client_key, payload_ciphertext)
       values ($1, $2, $3, $4, $5)`,
      [
        randomUUID(),
        chunk.siteId,
        hmacIdentifier(this.config.appSecret, chunk.sessionId),
        hmacIdentifier(this.config.appSecret, chunk.clientId),
        this.box.encryptJson(chunk),
      ],
    )
  }

  async createAudienceRule(input: AudienceInput) {
    const id = randomUUID()
    const result = await this.pool.query<{
      id: string
      name: string
      event_name: string | null
      url_contains: string | null
      min_value: string | null
      created_at: Date
    }>(
      `insert into audience_rules (id, name, event_name, url_contains, min_value)
       values ($1, $2, $3, $4, $5)
       returning id, name, event_name, url_contains, min_value, created_at`,
      [id, input.name, input.eventName, input.urlContains, input.minValue],
    )

    return audienceRuleFromRow(result.rows[0])
  }

  async listAudienceRules() {
    const result = await this.pool.query<{
      id: string
      name: string
      event_name: string | null
      url_contains: string | null
      min_value: string | null
      created_at: Date
    }>('select id, name, event_name, url_contains, min_value, created_at from audience_rules order by created_at desc')

    return result.rows.map(audienceRuleFromRow)
  }

  async addAudienceMember(ruleId: string, clientId: string) {
    await this.pool.query(
      `insert into audience_members (rule_id, client_key)
       values ($1, $2)
       on conflict (rule_id, client_key)
       do update set last_seen_at = now(), match_count = audience_members.match_count + 1`,
      [ruleId, hmacIdentifier(this.config.appSecret, clientId)],
    )
  }

  async getStats() {
    const result = await this.pool.query<{
      consent_events: string
      recording_chunks: string
      audience_rules: string
      audience_members: string
    }>(`
      select
        (select count(*) from consent_events) as consent_events,
        (select count(*) from recording_chunks) as recording_chunks,
        (select count(*) from audience_rules) as audience_rules,
        (select count(*) from audience_members) as audience_members
    `)
    const row = result.rows[0]

    return {
      consentEvents: Number(row?.consent_events ?? 0),
      recordingChunks: Number(row?.recording_chunks ?? 0),
      audienceRules: Number(row?.audience_rules ?? 0),
      audienceMembers: Number(row?.audience_members ?? 0),
    }
  }
}

function adminFromRow(
  row:
    | {
        id: string
        email: string
        password_hash: string
        recovery_key_hash: string
        created_at: Date
      }
    | undefined,
): AdminUser {
  if (!row) {
    throw new Error('Expected admin row.')
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    recoveryKeyHash: row.recovery_key_hash,
    createdAt: row.created_at.toISOString(),
  }
}

function audienceRuleFromRow(
  row:
    | {
        id: string
        name: string
        event_name: string | null
        url_contains: string | null
        min_value: string | null
        created_at: Date
      }
    | undefined,
): AudienceRule {
  if (!row) {
    throw new Error('Expected audience rule row.')
  }

  return {
    id: row.id,
    name: row.name,
    eventName: row.event_name ?? undefined,
    urlContains: row.url_contains ?? undefined,
    minValue: row.min_value === null ? undefined : Number(row.min_value),
    createdAt: row.created_at.toISOString(),
  }
}
