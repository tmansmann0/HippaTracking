import type { AudienceRule, SanitizedRelayEvent } from './types.js'
import type { Store } from './store.js'

type AudienceStore = Pick<Store, 'listAudienceRules' | 'addAudienceMember'>

export async function evaluateAudiences(
  store: AudienceStore,
  event: SanitizedRelayEvent,
) {
  const rules = await store.listAudienceRules()
  const matches = rules.filter((rule) => ruleMatches(rule, event))

  await Promise.all(matches.map((rule) => store.addAudienceMember(rule.id, audienceSourceId(event))))

  return matches
}

function audienceSourceId(event: SanitizedRelayEvent) {
  return event.clientId ?? event.eventId
}

function ruleMatches(rule: AudienceRule, event: SanitizedRelayEvent) {
  if (rule.eventName && rule.eventName !== event.eventName) {
    return false
  }

  if (rule.urlContains && !event.safeUrl.includes(rule.urlContains)) {
    return false
  }

  if (typeof rule.minValue === 'number') {
    const value = event.customData.value
    if (typeof value !== 'number' || value < rule.minValue) {
      return false
    }
  }

  return true
}
