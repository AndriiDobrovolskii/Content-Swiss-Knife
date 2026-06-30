export function buildReadabilityPrompt(text: string): string {
  return `Act as a Professional Editor and Accessibility Specialist.
Analyze the following text for clarity, readability, and accessibility.

Text to analyze:
${text.substring(0, 5000)}

Provide analysis in this JSON format:
{
  "score": number (0–100, 100 = extremely clear),
  "level": "Easy | Moderate | Difficult | Technical",
  "issues": ["specific clarity/accessibility issues"],
  "suggestions": ["specific improvements"],
  "optimizedText": "rewritten version implementing the suggestions while preserving technical facts and SEO keywords"
}

Return ONLY the raw JSON object.`;
}
