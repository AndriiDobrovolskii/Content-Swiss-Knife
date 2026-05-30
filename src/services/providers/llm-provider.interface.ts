export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
  toolCall?: { name: string; id: string };
}

export interface ChatTool {
  name: string;
  description: string;
}

export interface ChatResponse {
  text: string;
  toolCall?: { name: string; id: string };
}

export interface LlmProvider {
  generateText(prompt: string, useThinking?: boolean): Promise<string>;
  generateCreativeContent(prompt: string): Promise<string>;
  generateJson<T = any>(prompt: string): Promise<T>;
  analyzeImage(base64Data: string, mimeType: string, prompt: string): Promise<string>;
  extractFromPdf(base64Data: string): Promise<string>;
  startChat(systemInstruction: string, tools?: ChatTool[]): void;
  sendChatMessage(message: string): Promise<ChatResponse>;
  sendToolResponse(toolName: string, response: any): Promise<string>;
}
