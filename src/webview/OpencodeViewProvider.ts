import * as vscode from "vscode";
import { OpencodeServer } from "../server/OpencodeServer";
import { OpencodeClient } from "../api/client";
import { EventStream } from "../api/events";
import { HostToWeb, WebToHost, Mode } from "../types";

const ACTIVE_SESSION_KEY = "opencode.activeSessionId";

export class OpencodeViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "opencode.main";
  static readonly editorViewType = "opencode.editor";

  private view: vscode.WebviewView | null = null;
  private editorPanels = new Map<string, vscode.WebviewPanel>();
  private lastSessions: any[] = [];
  private client: OpencodeClient;
  private events: EventStream;

  constructor(
    private readonly ctx: vscode.ExtensionContext,
    private readonly server: OpencodeServer
  ) {
    this.client = new OpencodeClient("");
    this.events = new EventStream("");

    server.onStateChange(async ({ state, message }) => {
      this.post({ type: "serverState", state, message });
      if (state === "ready") {
        this.client.setBaseUrl(server.url);
        this.events.setBaseUrl(server.url);
        this.events.start();
        await this.refreshSessions();
        await this.refreshProviders();
      }
    });

    this.events.onEvent((evt) => {
      this.post({ type: "event", event: evt });
      if (evt?.type === "permission.updated" || evt?.type === "permission.asked") {
        const p = evt.properties || {};
        const req = {
          id: p.id || p.requestID || p.permissionID,
          tool: p.tool || p.type,
          title: p.title,
          description: p.description || p.message,
          metadata: p.metadata,
        };
        const sid = p.sessionID || p.sessionId;
        if (req.id && sid) this.post({ type: "permission", sessionId: sid, request: req });
      }
      if (evt?.type === "permission.replied" || evt?.type === "permission.resolved") {
        const id = evt.properties?.id || evt.properties?.requestID;
        if (id) this.post({ type: "permissionResolved", requestId: id });
      }
      const sid =
        evt?.properties?.sessionID ||
        evt?.properties?.info?.sessionID ||
        evt?.properties?.part?.sessionID;
      const active = this.ctx.workspaceState.get<string>(ACTIVE_SESSION_KEY);
      const isMsgEvt =
        evt.type === "message.updated" ||
        evt.type === "message.part.updated" ||
        evt.type === "session.idle";
      if (sid && isMsgEvt) {
        if (active && sid === active) this.refreshMessages(active).catch(() => {});
        if (this.editorPanels.has(sid)) this.refreshMessages(sid).catch(() => {});
      }
      if (evt?.type === "session.updated" || evt?.type === "session.deleted") {
        this.refreshSessions().catch(() => {});
      }
    });
  }

  resolveWebviewView(view: vscode.WebviewView): void | Thenable<void> {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, "media")],
    };
    view.webview.html = this.renderHtml(view.webview, "sidebar");

    view.webview.onDidReceiveMessage(async (msg: WebToHost) => {
      try {
        if (msg.type === "ready") {
          this.pushInitialStateToSidebar();
          return;
        }
        await this.handle(msg);
      } catch (e: any) {
        this.post({ type: "serverState", state: "error", message: e.message });
      }
    });
  }

  private pushInitialStateToSidebar() {
    if (!this.view) return;
    const active = this.ctx.workspaceState.get<string>(ACTIVE_SESSION_KEY) || null;
    this.view.webview.postMessage({ type: "init", serverUrl: this.server.url, activeSessionId: active } as HostToWeb);
    this.view.webview.postMessage({ type: "serverState", state: this.server.state } as HostToWeb);
    if (this.server.state === "ready") {
      this.refreshSessions().catch(() => {});
    }
  }

  openSessionInEditor(sessionId: string) {
    const existing = this.editorPanels.get(sessionId);
    if (existing) {
      existing.reveal(vscode.ViewColumn.Active);
      return;
    }
    const session = this.lastSessions.find((s) => s.id === sessionId);
    const title = session?.title || `Session ${sessionId.slice(0, 8)}`;
    const panel = vscode.window.createWebviewPanel(
      OpencodeViewProvider.editorViewType,
      `OpenCode · ${title}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, "media")],
      }
    );
    panel.iconPath = vscode.Uri.joinPath(this.ctx.extensionUri, "media", "icon.svg");
    panel.webview.html = this.renderHtml(panel.webview, "editor", sessionId);
    panel.webview.onDidReceiveMessage(async (msg: WebToHost) => {
      try {
        if (msg.type === "ready") {
          this.pushInitialStateToPanel(panel, sessionId);
          return;
        }
        await this.handle(msg, sessionId);
      } catch (e: any) {
        panel.webview.postMessage({ type: "serverState", state: "error", message: e.message } as HostToWeb);
      }
    });
    panel.onDidDispose(() => {
      this.editorPanels.delete(sessionId);
    });
    this.editorPanels.set(sessionId, panel);
  }

  reveal() {
    if (this.view) this.view.show?.(true);
    else vscode.commands.executeCommand("opencode.main.focus");
  }

  private pushInitialStateToPanel(panel: vscode.WebviewPanel, sessionId: string) {
    panel.webview.postMessage({ type: "init", serverUrl: this.server.url, activeSessionId: sessionId } as HostToWeb);
    panel.webview.postMessage({ type: "serverState", state: this.server.state } as HostToWeb);
    if (this.server.state === "ready") {
      this.refreshSessions().catch(() => {});
      this.refreshProviders().catch(() => {});
      this.refreshMessages(sessionId).catch(() => {});
    }
  }

  private async handle(msg: WebToHost, pinnedSessionId?: string) {
    switch (msg.type) {
      case "ready":
        return;
      case "createSession": {
        if (pinnedSessionId) return;
        const s = await this.client.createSession();
        await this.ctx.workspaceState.update(ACTIVE_SESSION_KEY, s.id);
        await this.refreshSessions();
        await this.refreshMessages(s.id);
        this.view?.webview.postMessage({ type: "init", serverUrl: this.server.url, activeSessionId: s.id } as HostToWeb);
        return;
      }
      case "deleteSession": {
        const session = this.lastSessions.find((s) => s.id === msg.id);
        const label = session?.title || msg.id.slice(0, 8);
        const choice = await vscode.window.showWarningMessage(
          `Delete session "${label}"?`,
          { modal: true },
          "Delete"
        );
        if (choice !== "Delete") return;
        await this.client.deleteSession(msg.id);
        const active = this.ctx.workspaceState.get<string>(ACTIVE_SESSION_KEY);
        if (active === msg.id) await this.ctx.workspaceState.update(ACTIVE_SESSION_KEY, undefined);
        const panel = this.editorPanels.get(msg.id);
        if (panel) panel.dispose();
        await this.refreshSessions();
        return;
      }
      case "selectSession": {
        if (pinnedSessionId) return;
        await this.ctx.workspaceState.update(ACTIVE_SESSION_KEY, msg.id);
        this.view?.webview.postMessage({ type: "init", serverUrl: this.server.url, activeSessionId: msg.id } as HostToWeb);
        await this.refreshMessages(msg.id);
        return;
      }
      case "sendMessage": {
        await this.client.sendMessage(msg.sessionId, {
          text: msg.text,
          mode: msg.mode,
          providerID: msg.providerID,
          modelID: msg.modelID,
        });
        await this.refreshMessages(msg.sessionId);
        return;
      }
      case "abort": {
        await this.client.abort(msg.sessionId);
        return;
      }
      case "loadProviders":
        await this.refreshProviders();
        return;
      case "openSessionInEditor":
        this.openSessionInEditor(msg.sessionId);
        return;
      case "replyPermission": {
        try {
          await this.client.replyPermission(msg.requestId, msg.response, msg.sessionId);
        } catch (e: any) {
          this.post({ type: "serverState", state: "error", message: `permission reply failed: ${e.message}` });
        }
        return;
      }
      case "setSessionModel": {
        // opencode doesn't support changing session-default model server-side;
        // we pass the model in each sendMessage instead. Just acknowledge.
        return;
      }
      case "renameSession": {
        try {
          await this.client.updateSession(msg.id, { title: msg.title });
        } catch {
          /* opencode may not support PATCH; ignore */
        }
        await this.refreshSessions();
        const panel = this.editorPanels.get(msg.id);
        if (panel) panel.title = `OpenCode · ${msg.title}`;
        return;
      }
    }
  }

  private async refreshSessions() {
    const all = await this.client.listSessions();
    this.lastSessions = all;
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const sessions = cwd ? all.filter((s: any) => !s.directory || s.directory === cwd) : all;
    this.post({ type: "sessions", sessions });
  }

  private async refreshMessages(sessionId: string) {
    const raw: any = await this.client.listMessages(sessionId);
    const messages = Array.isArray(raw)
      ? raw.map((m: any) => (m.info ? { ...m.info, parts: m.parts } : m))
      : [];
    const payload: HostToWeb = { type: "messages", sessionId, messages };
    this.view?.webview.postMessage(payload);
    const panel = this.editorPanels.get(sessionId);
    panel?.webview.postMessage(payload);
  }

  private async refreshProviders() {
    try {
      const r: any = await this.client.listProviders();
      const providers = r?.providers || [];
      this.post({ type: "providers", providers });
    } catch {
      this.post({ type: "providers", providers: [] });
    }
  }

  private post(msg: HostToWeb) {
    this.view?.webview.postMessage(msg);
    for (const panel of this.editorPanels.values()) panel.webview.postMessage(msg);
  }

  private renderHtml(webview: vscode.Webview, mode: "sidebar" | "editor", sessionId?: string): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.ctx.extensionUri, "media", "webview.js")
    );
    const nonce = Math.random().toString(36).slice(2);
    const csp = [
      "default-src 'none'",
      `script-src 'nonce-${nonce}'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `img-src ${webview.cspSource} data:`,
    ].join("; ");
    const sid = sessionId ? JSON.stringify(sessionId) : "null";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OpenCode</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">window.__OPENCODE_MODE__ = ${JSON.stringify(mode)}; window.__OPENCODE_SESSION_ID__ = ${sid};</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
