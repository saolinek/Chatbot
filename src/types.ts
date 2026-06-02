export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Settings {
  apiKey: string;
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  memoryMode?: 'full' | 'limit' | 'summary';
  maxHistoryMessages?: number;
  userNickname?: string;
  aiPersonaName?: string;
  customMemoryContext?: string;
  userFacts?: string[];
}

