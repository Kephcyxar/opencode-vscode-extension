import * as http from "http";
import { Session, Message, Provider, Mode } from "../types";

export class OpencodeClient {
  constructor(private baseUrl: string) {}

  setBaseUrl(url: string) { this.baseUrl = url; }

  private request<T>(method: string, path: string, body?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl + path);
      const data = body ? Buffer.from(JSON.stringify(body)) : null;
      const req = http.request(
        {
          method,
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          headers: {
            "content-type": "application/json",
            ...(data ? { "content-length": String(data.length) } : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`${method} ${path} → ${res.statusCode}: ${text.slice(0, 500)}`));
            }
            try {
              resolve(text ? JSON.parse(text) : (undefined as any));
            } catch (e: any) {
              reject(new Error(`bad JSON from ${path}: ${e.message}`));
            }
          });
        }
      );
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });
  }

  listSessions(): Promise<Session[]> { return this.request("GET", "/session"); }
  createSession(): Promise<Session> { return this.request("POST", "/session", {}); }
  deleteSession(id: string): Promise<void> { return this.request("DELETE", `/session/${id}`); }
  updateSession(id: string, patch: { title?: string; providerID?: string; modelID?: string; model?: { providerID: string; modelID: string } }): Promise<Session> { return this.request("PATCH", `/session/${id}`, patch); }
  listMessages(sessionId: string): Promise<Message[] | { info?: Message; parts?: any[] }[]> {
    return this.request("GET", `/session/${sessionId}/message`);
  }
  sendMessage(sessionId: string, args: { text: string; mode: Mode; providerID: string; modelID: string }): Promise<any> {
    const body: any = {
      parts: [{ type: "text", text: args.text }],
      mode: args.mode,
      agent: args.mode, // newer opencode uses "agent" field; send both
    };
    if (args.providerID && args.modelID) {
      // opencode expects nested { model: { providerID, modelID } }; also send flat for older versions
      body.model = { providerID: args.providerID, modelID: args.modelID };
      body.providerID = args.providerID;
      body.modelID = args.modelID;
    }
    return this.request("POST", `/session/${sessionId}/message`, body);
  }
  abort(sessionId: string): Promise<any> { return this.request("POST", `/session/${sessionId}/abort`, {}); }
  replyPermission(requestId: string, response: "once" | "always" | "reject", sessionId?: string): Promise<any> {
    // Try new endpoint first, then fall back to deprecated session-scoped one
    return this.request("POST", `/permission/${requestId}/reply`, { response }).catch(() => {
      if (!sessionId) throw new Error("permission reply failed: no sessionId for fallback");
      return this.request("POST", `/session/${sessionId}/permissions/${requestId}`, { response });
    });
  }
  listProviders(): Promise<{ providers: Provider[]; default?: Record<string, string> }> {
    return this.request("GET", "/config/providers");
  }
  replyQuestion(requestId: string, answers: string[][]): Promise<any> {
    return this.request("POST", `/question/${requestId}/reply`, { answers });
  }
  rejectQuestion(requestId: string): Promise<any> {
    return this.request("POST", `/question/${requestId}/reject`);
  }
  listPendingQuestions(): Promise<any[]> {
    return this.request("GET", "/question").catch(() => []);
  }
}
