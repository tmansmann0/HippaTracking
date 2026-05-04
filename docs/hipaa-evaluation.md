# HIPAA Evaluation

This document is an engineering-oriented gap review, not legal advice. HIPAA
compliance depends on the deploying organization, contracts, policies, workforce
practices, hosting environment, and risk analysis.

## Name

Correct acronym: **HIPAA**. The project has been renamed to **HIPAATracking**.

## Official Sources Reviewed

- HHS OCR, Summary of the HIPAA Privacy Rule:
  <https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html>
- HHS OCR, Summary of the HIPAA Security Rule:
  <https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html>
- HHS OCR, Online Tracking Technologies Guidance:
  <https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/hipaa-online-tracking/index.html>
- HHS OCR, Breach Notification Rule:
  <https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html>
- HHS OCR, HIPAA and Cloud Computing:
  <https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html>
- HHS OCR, Business Associate Contract sample provisions:
  <https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions>

## What The Law/Guidance Means For This Product

### Covered entity / business associate status

HIPAA applies to covered entities and business associates. HHS says a covered
entity includes health plans, health care clearinghouses, and health care
providers that conduct certain electronic transactions. HHS also says a business
associate is an entity that creates, receives, maintains, or transmits PHI on
behalf of a covered entity.

Engineering implication:

- If a clinic self-hosts this relay for its own internal use, the relay is part
  of that clinic's HIPAA environment.
- If we host or operate the relay for clinics that are covered entities, we are
  very likely acting as a business associate.
- Any cloud provider storing or processing ePHI for the relay also needs a BAA.

### Tracking technologies and PHI

OCR's tracking guidance says tracking technologies can collect page activity,
cookies, pixels, session replay, and fingerprinting data. OCR specifically calls
out session replay scripts. OCR says tracking on authenticated pages generally
has access to PHI. OCR also says appointment scheduling, symptom checker, portal
login, and registration pages can involve PHI even when unauthenticated.

Important nuance:

- On June 20, 2024, a federal court vacated OCR guidance to the extent it said
  HIPAA obligations are triggered merely by connecting an IP address with a visit
  to an unauthenticated public page about conditions/providers.
- That does not make appointment forms, portal pages, mobile apps, or typed
  health information safe to send to ad platforms.

Engineering implication:

- The relay's core idea is appropriate: block direct third-party pixels from
  sensitive pages and forward only minimized server-side events.
- Session recording is high risk and should stay off by default.
- Consent banners do not equal HIPAA authorization.

### Minimum necessary

The Privacy Rule includes a minimum necessary standard. HHS says covered
entities must make reasonable efforts to use/disclose/request only the minimum
PHI needed for the purpose.

Current implementation alignment:

- Redacts query strings, hashes, referrers, titles, and sensitive routes.
- Allows only configured custom-data keys.
- Defaults to strict mode.
- Does not forward raw emails, phone numbers, IP addresses, page titles, or
  referrers downstream.

Remaining gap:

- We still need a documented data-flow map and formal minimum-necessary policy
  for each destination/event type.
- Meta/GA4 event schemas need a per-event allowlist, not just broad custom-data
  keys.

### Security Rule safeguards

HHS says regulated entities must implement reasonable and appropriate
administrative, physical, and technical safeguards to protect ePHI. HHS also
calls out risk analysis, risk management, access authorization, security
awareness/training, security incident procedures, contingency planning, and
technical protections.

Current implementation alignment:

- Admin login exists.
- Session cookies are HTTP-only and signed.
- Consent and recording payloads can be encrypted at rest with AES-256-GCM.
- Audience members are HMAC-pseudonymous.
- Postgres durable storage is supported.

Major gaps before production:

- No MFA.
- No role-based access control.
- No immutable audit log for admin actions.
- No account lockout or suspicious-login alerts.
- No password reset/recovery flow using the recovery key.
- No retention/deletion policy enforcement.
- No backup/restore procedure.
- No formal incident response workflow.
- No vulnerability scanning/dependency monitoring policy.
- No documented risk analysis.
- No BAA/subprocessor management.
- No production secrets rotation workflow.

### Cloud hosting / Railway

HHS cloud guidance says a cloud service provider that creates, receives,
maintains, or transmits ePHI on behalf of a covered entity or business associate
is itself a business associate, even if it stores only encrypted ePHI and lacks
the encryption key. HHS says a BAA is required before using a cloud service for
ePHI.

Engineering implication:

- Do not process ePHI on Railway unless Railway provides an executed BAA for the
  deployed service and database.
- If Railway does not provide a BAA for the account/project, use a HIPAA-eligible
  cloud environment with an executed BAA instead.
- The one-click Railway setup is useful for demo/pilot/non-HIPAA traffic, but it
  should be labeled as not HIPAA-ready unless BAA coverage is confirmed.

### Breach Notification Rule

HHS says breach notification applies to breaches of unsecured PHI. HHS guidance
identifies encryption and destruction as methods that can render PHI unusable,
unreadable, or indecipherable.

Current implementation alignment:

- App-layer AES-GCM encryption helps reduce breach impact for stored recording
  and consent payloads.

Remaining gap:

- Encryption key handling must be separate from data storage and rotated.
- We need breach detection, breach-risk assessment records, affected-user
  identification, and notification playbooks.

## Compliance Readiness Verdict

Current state: **promising technical prototype, not HIPAA-ready production
system**.

The strongest pieces are:

- first-party relay architecture;
- server-side sanitization before Meta/GA4;
- strict default privacy mode;
- encrypted storage for high-risk payloads;
- server-controlled feature flags;
- session recording off unless enabled and consented.

The biggest blockers are:

- no executed BAAs;
- no formal risk analysis;
- no production-grade access controls/MFA/admin auditing;
- no retention/deletion automation;
- no incident/breach workflow;
- no evidence package for HIPAA Security Rule safeguards;
- session recording remains inherently high risk, even with masking.

## Recommended Next Engineering Work

1. Add a production compliance mode that disables session recording unless
   `DATABASE_URL`, `APP_ENCRYPTION_KEY`, and `HIPAA_MODE_ACKNOWLEDGED=true` are
   present.
2. Add MFA for admin login.
3. Add admin action audit logs.
4. Add retention policies and deletion jobs for recordings, consent events, and
   audience membership.
5. Add per-destination/per-event allowlists for Meta and GA4.
6. Add a BAA/subprocessor checklist to setup.
7. Add data export/delete APIs for individual rights workflows.
8. Add security headers, rate limits, brute-force protection, and CSRF tokens for
   admin forms.
9. Add a production deployment guide for a cloud provider with signed BAA
   coverage.
10. Add an incident response and breach notification runbook.
