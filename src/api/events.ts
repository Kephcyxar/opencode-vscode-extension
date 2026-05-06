import * as http from "http";
import * as vscode from "vscode";

export class EventStream {
  private req: http.ClientRequest | null = null;
  private buf = "";
  private closedByUser = false;
  private retryDelay = 500;
  private readonly _emitter = new vscode.EventEmitter<any>();
  readonly onEvent = this._emitter.event;

  constructor(private baseUrl: string) {}

  setBaseUrl(url: string) {
    this.baseUrl = url;
    if (this.req) { this.req.destroy(); this.req = null; }
    if (!this.closedByUser) this.connect();
  }

  start() { this.closedByUser = false; this.connect(); }

  stop() {
    this.closedByUser = true;
    if (this.req) { this.req.destroy(); this.req = null; }
  }

  private connect() {
    if (!this.baseUrl) return;
    const url = new URL(this.baseUrl + "/event");
    const req = http.request(
      {
        method: "GET",
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: { accept: "text/event-stream" },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return this.scheduleReconnect();
        }
        this.retryDelay = 500;
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => this.feed(chunk));
        res.on("end", () => this.scheduleReconnect());
        res.on("error", () => this.scheduleReconnect());
      }
    );
    req.on("error", () => this.scheduleReconnect());
    req.end();
    this.req = req;
  }

  private feed(chunk: string) {
    this.buf += chunk;
    let idx: number;
    while ((idx = this.buf.indexOf("\n\n")) !== -1) {
      const raw = this.buf.slice(0, idx);
      this.buf = this.buf.slice(idx + 2);
      const dataLines = raw
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart());
      if (!dataLines.length) continue;
      const payload = dataLines.join("\n");
      try {
        this._emitter.fire(JSON.parse(payload));
      } catch {
        // ignore malformed
      }
    }
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    setTimeout(() => this.connect(), this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 10000);
  }
}
