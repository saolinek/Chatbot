export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Settings {
  apiKey: string;
  model: string;
  systemPrompt: string;
}
