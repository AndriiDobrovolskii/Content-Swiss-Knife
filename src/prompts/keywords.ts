export function buildKeywordsPrompt(productName: string, description: string): string {
  return `Act as an SEO Specialist.
Analyze the following product information and generate a list of 10 high-impact, relevant SEO keywords
and phrases (including long-tail). Focus on terms potential buyers would search for related to
3D printing equipment.

Product Name: ${productName}
Description Context: ${description.substring(0, 2000)}

Return ONLY a raw JSON array of strings. Example: ["keyword 1", "keyword 2"]`;
}
