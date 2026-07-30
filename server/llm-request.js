import { resolveProvider } from './providers/factory.js';
import { isKnownProvider, resolveSlot } from './providers/model-support.js';

// The provider is no longer a boot-time singleton: the settings menu sends
// { provider, deep: {model, level}, fast: {model, level} } with every call. LLM_PROVIDER
// stays the fallback so a stale client, a curl call, or the OpenAI path still works.

export class BadRequest extends Error {
  constructor(message) { super(message); this.status = 400; }
}

/** Which slot a call runs on. Deep Thinking Mode in the UI is what sets `creative`. */
export function slotFor(mode) {
  return (mode === 'creative' || mode === 'creative-json') ? 'deep' : 'fast';
}

/**
 * Validate the client's provider/model/level against the catalog and resolve one slot.
 *
 * The request body is untrusted input: an unknown provider is rejected with a 400 rather
 * than allowed to reach resolveProvider() and surface as a 500. An unknown *model* is not
 * an error — it falls back to the provider's first catalog entry, so a client running
 * older code degrades instead of breaking. Returns slot === null for providers with no
 * catalog entry (OpenAI), which keeps their own internal defaults.
 *
 * `getProvider` is injectable purely so tests can exercise this without API keys.
 */
export function resolveRequest(body, slotName, fallbackProvider, getProvider = resolveProvider) {
  const requested = body?.provider;
  if (requested !== undefined && requested !== null && !isKnownProvider(String(requested).toLowerCase())) {
    throw new BadRequest(`Unknown LLM provider: "${requested}".`);
  }

  const provider = String(requested || fallbackProvider).toLowerCase();
  // Tier drives the fallback when the body carries no settings, so an unconfigured request
  // still runs the Fast slot on a cheap model rather than the catalog's first (premium) one.
  const slot = isKnownProvider(provider)
    ? resolveSlot(provider, body?.[slotName], slotName === 'deep' ? 'premium' : 'fast')
    : null;
  return { provider, instance: getProvider(provider), slot };
}
