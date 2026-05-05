import { Injectable } from '@angular/core';
import { GoogleGenAI, Chat, ThinkingLevel } from "@google/genai";

declare const GEMINI_API_KEY: string;

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  
  // Models configuration
  // Updated to stable recommended models to avoid rate limits on preview models
  private flashModel = 'gemini-3-flash-preview';
  private thinkingModel = 'gemini-3.1-pro-preview'; 
  private searchModel = 'gemini-3-flash-preview';
  private fallbackModel = 'gemini-flash-lite-latest';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  // Generic Retry Wrapper with Exponential Backoff
  private async retry<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 3000): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Try to parse message if it's a JSON string
        let parsedError = error;
        if (error?.message && typeof error.message === 'string' && error.message.startsWith('{')) {
            try {
                const parsed = JSON.parse(error.message);
                if (parsed.error) parsedError = parsed;
            } catch (e) { /* ignore */ }
        }

        // Extract status/code from various error structures provided by SDK or raw API
        const status = parsedError?.status || parsedError?.response?.status || parsedError?.error?.code || parsedError?.error?.status;
        const message = parsedError?.message || parsedError?.error?.message || JSON.stringify(parsedError);
        
        const isRateLimit = 
          status === 429 || 
          status === 503 || // Service Unavailable often requires retry
          status === 'RESOURCE_EXHAUSTED' ||
          (typeof message === 'string' && (
            message.includes('429') || 
            message.includes('quota') || 
            message.includes('RESOURCE_EXHAUSTED') ||
            message.includes('overloaded')
          ));

        if (isRateLimit && attempt < maxRetries) {
          // Increased backoff factor and random jitter
          const backoffTime = (delayMs * Math.pow(2, attempt - 1)) + (Math.random() * 1000); 
          console.warn(`[GeminiService] Rate limit hit (Attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(backoffTime)}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async generateText(prompt: string, useThinking = false): Promise<string> {
    if (useThinking) {
      return this.generateCreativeContent(prompt);
    }
    
    try {
        return await this.retry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.flashModel,
            contents: prompt,
          });
          return response.text || '';
        });
    } catch (error) {
        console.warn('Primary model failed, trying fallback...');
        return this.retry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.fallbackModel,
            contents: prompt,
          });
          return response.text || '';
        });
    }
  }

  async generateCreativeContent(prompt: string, thinkingLevel: ThinkingLevel = ThinkingLevel.HIGH): Promise<string> {
    return this.retry(async () => {
      const response = await this.ai.models.generateContent({
        model: this.thinkingModel,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel }
        }
      });
      return response.text || '';
    });
  }

  async extractFromUrl(url: string): Promise<string> {
    return this.retry(async () => {
      const response = await this.ai.models.generateContent({
        model: this.searchModel,
        contents: `Visit this URL: ${url}. Extract the full product description and technical specifications found on the page. Return the content as clear text.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      return response.text || '';
    });
  }

  async extractFromPdf(base64Data: string): Promise<string> {
    try {
        return await this.retry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.flashModel,
            contents: {
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                { text: "Extract the full product description and technical specifications from document. Return them as plain text." }
              ]
            }
          });
          return response.text || '';
        });
    } catch (error) {
        return this.retry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.fallbackModel,
            contents: {
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                { text: "Extract the full product description and technical specifications from document. Return them as plain text." }
              ]
            }
          });
          return response.text || '';
        });
    }
  }

  async generateJson(prompt: string, useThinking = false): Promise<any> {
    try {
        return await this.retry(async () => {
          const model = useThinking ? this.thinkingModel : this.flashModel;
          const config: any = {
            responseMimeType: 'application/json'
          };
          
          if (useThinking) {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const response = await this.ai.models.generateContent({
            model: model,
            contents: prompt,
            config: config
          });
          
          const text = response.text || '{}';
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        });
    } catch (error) {
        if (useThinking) throw error; // Don't fallback for thinking mode as it might degrade quality too much
        
        console.warn('Primary JSON generation failed, trying fallback...');
        return await this.retry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.fallbackModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
          });
          
          const text = response.text || '{}';
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        });
    }
  }

  async generateKeywords(productName: string, description: string): Promise<string[]> {
    const prompt = `
        Act as an SEO Specialist.
        Analyze the following product information and generate a list of 10 high-impact, relevant SEO keywords and phrases (including long-tail).
        Focus on terms potential buyers would search for related to this 3D printing equipment/product.
        
        Product Name: ${productName}
        Description Context: ${description.substring(0, 2000)}

        Return ONLY a raw JSON array of strings. Example: ["keyword 1", "keyword 2"]
      `;

    try {
        return await this.retry(async () => {
          const response = await this.ai.models.generateContent({
              model: this.flashModel,
              contents: prompt,
              config: {
                responseMimeType: 'application/json'
              }
          });

          const text = response.text || '[]';
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        });
    } catch (error) {
        return await this.retry(async () => {
          const response = await this.ai.models.generateContent({
              model: this.fallbackModel,
              contents: prompt,
              config: {
                responseMimeType: 'application/json'
              }
          });

          const text = response.text || '[]';
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        });
    }
  }

  async optimizeHtmlContent(htmlInput: string, productName: string = '', useThinking = false): Promise<string> {
    const contextInstruction = productName ? ` + "${productName}"` : '';
    const prompt = `🛠️ Role
You are an Advanced HTML Parser & SEO Optimizer. Your job is to refactor dirty HTML into clean, semantic, and high-performance HTML5 code.
⚡️ Execution Pipeline (Follow Strictly)
PHASE 1: Structural Cleanup & Unwrapping
Remove Junk Tags: Delete all <noscript> tags and their content.
Unwrap Content Containers:
Target: <div class="wpb-content-wrapper">...</div>
Action: Remove the <div> wrapper entirely, but keep all inner HTML content (paragraphs, headings, images, etc.) exactly as is.
Unwrap Images (Smart Extraction):
Anchor Tags: <a href...><img ...></a> → Keep ONLY the <img ...>.
Picture Tags: <picture>...<img ...>...</picture> → Keep ONLY the <img ...> (discard <source> tags).
Wordpress Captions:
Pattern: <div class="wp-caption..."><img ...><p class="wp-caption-text">Text</p></div>
Action: Extract the <img> and the text.
Output: Return just the <img> followed immediately by <p>Text</p> (remove the wrapper div and class from p).
Heading Hygiene:
Inside <h2>, <h3>, <h4>: Remove all <strong>, <b>, <span> tags but preserve their text.
Result: <h2><b>Title</b></h2> becomes <h2>Title</h2>.
Tag Replacement:
Target: <pre>...</pre>
Action: Replace all <pre> tags with <small> tags. Preserve the inner text content exactly as is.
Target: <p><br /></p> or <p><br/></p>
Action: Replace with <br> tag.
Target: <b>...</b>
Action: Replace all <b> tags with <strong> tags.
PHASE 2: Image Optimization (<img>)
For every <img> tag found:
Source Fix: If data-src is present, move its value to src. Remove data-src.
Attribute Purge:
REMOVE: class, style, loading, decoding, srcset, sizes, border.
KEEP: width, height (Crucial for CLS/SEO), alt, title.
Note on Dimensions: If width/height are missing, do NOT invent them. Just leave them absent.
[SEO IMAGES OPTIMIZATION]
Check all <img> tags:
1. **Alt Attribute:** If missing/empty, generate a descriptive text (4-8 words) based on context${contextInstruction}.
2. **Title Attribute:** REMOVE if present, or leave empty. (It provides no SEO value and harms accessibility if duplicated).
PHASE 3: Semantic Highlighting (<strong>)
Rule: Enhance readability by bolding High-Value Technical Specs only.
Target: Specific numbers with units that define performance (44,2 MPa, 70 °C, 1,93 GPa).
Constraint 1 (The "1 l" Fix): Do NOT bold standard packaging volumes or weights if they appear as part of a product title or repeated identifier (e.g., skip "1 l", "1kg", "500ml").
Constraint 2: Do NOT bold common material acronyms like ABS, PLA, PETG inside paragraphs (keep them for lists or titles only).
Constraint 3 (Value Priority): If a paragraph contains both a generic spec (like "1 l") and a performance spec (like "10^8 Ohms"), always prioritize the performance spec.
Constraint 4: Max 1 highlight per paragraph. If the only candidate is a packaging volume, do not bold anything.
Lists: Bold only the label before the colon (e.g., <li><strong>Nozzle:</strong> 0.4mm</li>).
⛔️ Output Restrictions & Format
CRITICAL: Do NOT output Python code, scripts, or explanations.
EXECUTE the rules internally and output ONLY the final processed HTML string.
Structure Safety: Do not close <div> tags that were not opened in the input snippet (maintain fragment validity).
Raw HTML Only: Do not wrap in markdown code blocks (no \`\`\`html).
📥 Input HTML:
${htmlInput}`;
    
    if (useThinking) {
      return this.generateCreativeContent(prompt, ThinkingLevel.LOW);
    }
    return this.generateText(prompt);
  }

  async translateContent(content: string, targetLang: string): Promise<string> {
    const prompt = `
### 🛠️ Role & Task
Act as a **Native ${targetLang} Technical Translator** for the **3D Printing Industry**. 
Translate the provided product description to **${targetLang}**.

### 🛡️ Critical Safety Rules (DO NOT IGNORE)
1.  **HTML Integrity:** 
    *   **NEVER** translate tag names, IDs, classes, URLs, or variable placeholders ({{...}}).
    *   **ONLY** translate visible text and the contents of \`alt="..."\` and \`title="..."\`.
2.  **Brand Protection:**
    *   Keep **Brand Names** (Creality, Anycubic, Elegoo) and **Model Names** (Ender, Saturn, Neptune) in **Latin/English**. Do NOT transliterate.
3.  **Terminology:**
    *   Use correct technical terms for 3D printing (e.g., "Resin" -> correct local term for photopolymer, not "glue" or "rubber").
    *   Keep technical specs (mm, W, V) unchanged.

### ✍️ Style & SEO
*   **Tone:** Professional, commercial, concise. Avoid robotic "translationese".
*   **Output:** Return **ONLY** the raw HTML string. No markdown blocks.

### 📥 Input HTML:
${content}
`;
    return this.generateText(prompt);
  }

  async analyzeReadability(text: string): Promise<any> {
    const prompt = `
      Act as a Professional Editor and Accessibility Specialist.
      Analyze the following text for clarity, readability, and accessibility.
      
      Text to analyze:
      ${text.substring(0, 5000)}

      Provide the analysis in the following JSON format:
      {
        "score": number (0-100, where 100 is extremely clear and easy to read),
        "level": "string (e.g., Easy, Moderate, Difficult, Technical)",
        "issues": ["string list of specific clarity or accessibility issues found"],
        "suggestions": ["string list of specific improvements to make the text more accessible"],
        "optimizedText": "string (a rewritten version of the text that implements the suggestions while preserving all technical facts and SEO keywords)"
      }

      Return ONLY the raw JSON object.
    `;

    return this.generateJson(prompt, false);
  }

  async generateImageAltText(base64Data: string, mimeType: string): Promise<string> {
    const prompt = `Generate professional, technical SEO alt text for this product image.
    
Rules:
1. Be Specific: Mention technical specs visible in the image (e.g., wavelengths like 1064nm, 355nm, spot sizes, material types).
2. Comparative Analysis: If the image shows a comparison, describe the 'before/after' or 'left/right' differences clearly (e.g., 'scorched edges vs. clean cold processing').
3. Function over Form: Focus on the result of the technology shown (e.g., 'relief engraving', 'thermal processing characteristics').
4. Tone: Scientific, precise, and professional. Avoid marketing fluff like 'amazing' or 'beautiful'.
5. Structure: Start with the main subject, followed by technical details and the specific machine/process used.
6. Conciseness: Maximum 20 words. No introductory phrases like "This image shows".`;

    try {
        return await this.retry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.flashModel,
            contents: {
              parts: [
                { inlineData: { mimeType: mimeType, data: base64Data } },
                { text: prompt }
              ]
            }
          });
          return response.text?.trim() || '';
        });
    } catch (error) {
        return await this.retry(async () => {
          const response = await this.ai.models.generateContent({
            model: this.fallbackModel,
            contents: {
              parts: [
                { inlineData: { mimeType: mimeType, data: base64Data } },
                { text: prompt }
              ]
            }
          });
          return response.text?.trim() || '';
        });
    }
  }

  // --- CHAT CAPABILITIES ---

  startChat(systemInstruction: string) {
    this.chatSession = this.ai.chats.create({
      model: this.thinkingModel,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        tools: [
          {
            functionDeclarations: [
              {
                name: "restart_generation",
                description: "Restart the content generation process. Use this when the user asks to regenerate the content, or after you have helped the user update the inputs and they want to see the new result."
              }
            ]
          }
        ]
      }
    });
  }

  // Returns text and potentially a requested tool call
  async sendChatMessage(message: string): Promise<{ text: string, toolCall?: string }> {
    if (!this.chatSession) {
      throw new Error('Chat session not initialized');
    }
    return this.retry(async () => {
      const result = await this.chatSession!.sendMessage({ message });
      
      // Check for function calls
      const call = result.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
      if (call && call.functionCall) {
        return { 
          text: result.text || '', 
          toolCall: call.functionCall.name 
        };
      }

      return { text: result.text || 'I could not generate a response.', toolCall: undefined };
    });
  }

  // Send the result of the tool execution back to the model
  async sendToolResponse(toolName: string, response: any): Promise<string> {
    if (!this.chatSession) return '';
    return this.retry(async () => {
      const result = await this.chatSession!.sendMessage({
        message: [
          {
            functionResponse: {
              name: toolName,
              response: { result: response }
            }
          }
        ]
      });
      return result.text || '';
    });
  }
}