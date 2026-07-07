/** A single system block; cache=true marks a cache breakpoint on it. */
export interface SystemBlock { text: string; cache?: boolean; }

/** What every prompt builder now returns instead of a flat string. */
export interface PromptPayload {
  systemBlocks: SystemBlock[]; // [0]=master (cached), [1]=task template (cached)
  userContent: string;         // dynamic, never cached
}

/** Attribution tags sent alongside a call so the server can record what it was for.
 *  Purely for cost/usage tracking — never affects prompt content or the LLM call itself. */
export interface UsageMeta {
  taskLabel: string;
  productName?: string;
  store?: string;
  lang?: string;
}

