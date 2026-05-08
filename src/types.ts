export interface Provider {
  id: string;
  name: string;
  models: Record<string, Model>;
}

export interface Model {
  id: string;
  name: string;
  cost?: { input?: number; output?: number };
  capabilities?: { reasoning?: boolean; [k: string]: any };
  variants?: Record<string, any>;
}

export interface Session {
  id: string;
  title?: string;
  time?: { created?: number; updated?: number };
  directory?: string;
  share?: { url?: string };
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning" | "thinking"; text: string }
  | { type: "tool"; tool: string; state: { status: string; input?: any; output?: any; title?: string } }
  | { type: "step-start" | "step-finish" }
  | { type: "file"; mime?: string; filename?: string; url?: string };

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  sessionID: string;
  time?: { created?: number };
  parts?: MessagePart[];
  modelID?: string;
  providerID?: string;
  cost?: number;
  tokens?: { input?: number; output?: number; reasoning?: number };
}

export type Mode = "build" | "plan";

export interface UIConfig {
  fontFamily?: string;
  fontSize?: number;
  fontLigatures?: boolean;
  hideStatusBar?: boolean;
}

// Messages exchanged between extension host and webview
export type HostToWeb =
  | { type: "init"; serverUrl: string; activeSessionId: string | null; uiConfig?: UIConfig }
  | { type: "serverState"; state: "starting" | "ready" | "error" | "stopped"; message?: string }
  | { type: "sessions"; sessions: Session[] }
  | { type: "messages"; sessionId: string; messages: Message[] }
  | { type: "providers"; providers: Provider[] }
  | { type: "event"; event: any }
  | { type: "permission"; sessionId: string; request: { id: string; tool?: string; title?: string; description?: string; metadata?: any } }
  | { type: "permissionResolved"; requestId: string }
  | { type: "question"; sessionId: string; request: QuestionRequest }
  | { type: "questionResolved"; requestId: string }
  | { type: "uiConfig"; config: UIConfig }
  | { type: "workspaceFiles"; files: string[] };

export interface QuestionOption { label: string; description?: string }
export interface QuestionInfo { question: string; header: string; options: QuestionOption[]; multiple?: boolean; custom?: boolean }
export interface QuestionRequest {
  id: string;
  sessionID: string;
  questions: QuestionInfo[];
  tool?: { messageID?: string; callID?: string };
}

export type WebToHost =
  | { type: "ready" }
  | { type: "createSession" }
  | { type: "deleteSession"; id: string }
  | { type: "selectSession"; id: string }
  | { type: "sendMessage"; sessionId: string; text: string; mode: Mode; providerID: string; modelID: string; variant?: string; thinking?: boolean }
  | { type: "abort"; sessionId: string }
  | { type: "loadProviders" }
  | { type: "openSessionInEditor"; sessionId: string }
  | { type: "renameSession"; id: string; title: string }
  | { type: "replyPermission"; sessionId: string; requestId: string; response: "once" | "always" | "reject" }
  | { type: "replyQuestion"; sessionId: string; requestId: string; answers: string[][] }
  | { type: "rejectQuestion"; sessionId: string; requestId: string }
  | { type: "setSessionModel"; sessionId: string; providerID: string; modelID: string }
  | { type: "listWorkspaceFiles"; query: string };
