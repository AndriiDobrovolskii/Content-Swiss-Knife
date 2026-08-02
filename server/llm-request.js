import { resolveProvider } from './providers/factory.js';
import { isKnownProvider, resolveSlot } from './providers/model-support.js';

// The provider is no longer a boot-time singleton: the settings menu sends
// { deep: {provider, model, level}, fast: {provider, model, level} } with every call, and
// each slot names its own provider — Deep on Claude and Fast on Gemini in the same run is a
// supported configuration. A top-level `provider` is still honoured as a fallback, so a
// browser on an older bundle keeps working; LLM_PROVIDER backs both, which is what keeps a
// curl call and the OpenAI path alive.

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
 * Only the provider actually used is validated: a body naming a valid provider on the slot
 * being resolved is served even if some other field is junk.
 *
 * `getProvider` is injectable purely so tests can exercise this without API keys.
 */
export function resolveRequest(body, slotName, fallbackProvider, getProvider = resolveProvider) {
  const requested = body?.[slotName]?.provider ?? body?.provider;
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
