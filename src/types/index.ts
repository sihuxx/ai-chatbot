export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokensUsed?: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  personaType: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface ChatSession {
  conversationId: string | null;
  sessionToken: string;
}
