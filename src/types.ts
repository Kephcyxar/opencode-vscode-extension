export interface Provider {
  id: string;
  name: string;
  models: Record<string, Model>;
}

export interface Model {
  id: string;
  name: string;
  cost?: { input?: number; output?: number };
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

// Messages exchanged between extension host and webview
export type HostToWeb =
  | { type: "init"; serverUrl: string; activeSessionId: string | null }
  | { type: "serverState"; state: "starting" | "ready" | "error" | "stopped"; message?: string }
  | { type: "sessions"; sessions: Session[] }
  | { type: "messages"; sessionId: string; messages: Message[] }
  | { type: "providers"; providers: Provider[] }
  | { type: "event"; event: any }
  | { type: "permission"; sessionId: string; request: { id: string; tool?: string; title?: string; description?: string; metadata?: any } }
  | { type: "permissionResolved"; requestId: string };

export type WebToHost =
  | { type: "ready" }
  | { type: "createSession" }
  | { type: "deleteSession"; id: string }
  | { type: "selectSession"; id: string }
  | { type: "sendMessage"; sessionId: string; text: string; mode: Mode; providerID: string; modelID: string }
  | { type: "abort"; sessionId: string }
  | { type: "loadProviders" }
  | { type: "openSessionInEditor"; sessionId: string }
  | { type: "renameSession"; id: string; title: string }
  | { type: "replyPermission"; sessionId: string; requestId: string; response: "once" | "always" | "reject" }
  | { type: "setSessionModel"; sessionId: string; providerID: string; modelID: string };
