/** Strip code fences and parse the LLM response as JSON. */
export function parseJsonResponse(text) {
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
}
