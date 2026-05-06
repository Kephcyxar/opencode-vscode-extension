import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";
import * as net from "net";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export type ServerState = "starting" | "ready" | "error" | "stopped";

export class OpencodeServer {
  private proc: ChildProcess | null = null;
  private _state: ServerState = "stopped";
  private _url = "";
  private readonly _emitter = new vscode.EventEmitter<{ state: ServerState; message?: string }>();
  readonly onStateChange = this._emitter.event;

  constructor(private readonly output: vscode.OutputChannel) {}

  get state(): ServerState { return this._state; }
  get url(): string { return this._url; }

  async start(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration("opencode-ui");
    const externalProxy = (cfg.get<string>("httpProxy") || "").trim();
    if (externalProxy) {
      const url = /^https?:\/\//.test(externalProxy) ? externalProxy : `http://127.0.0.1:${externalProxy}`;
      this._url = url.replace(/\/$/, "");
      this.output.appendLine(`[opencode] using external server at ${this._url}`);
      this.setState("starting");
      const ok = await this.waitReady(this._url, 5000);
      this.setState(ok ? "ready" : "error", ok ? undefined : `cannot reach ${this._url}`);
      return;
    }

    if (this.proc) return;

    const configured = cfg.get<string>("binaryPath") || "opencode";
    const bin = resolveBinary(configured);
    if (!bin) {
      const msg = `cannot find opencode binary '${configured}'. Set 'opencode-ui.binaryPath' to its absolute path (e.g. ${os.homedir()}/.opencode/bin/opencode).`;
      this.output.appendLine(`[opencode] ${msg}`);
      this.setState("error", msg);
      return;
    }

    const fixedPort = cfg.get<number>("port") ?? 0;
    const rangeStr = (cfg.get<string>("portRange") || "").trim();
    const maxAttempts = Math.max(1, cfg.get<number>("maxStartAttempts") ?? 8);
    const ports = await this.buildPortCandidates(fixedPort, rangeStr, maxAttempts);

    this.setState("starting");

    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      const ok = await this.tryStart(bin, port);
      if (ok) return;
      this.output.appendLine(`[opencode] port ${port} failed; ${i + 1 < ports.length ? "trying next" : "giving up"}`);
    }

    this.setState("error", `opencode failed to start on ${ports.length} port(s) (tried: ${ports.join(", ")})`);
  }

  private async tryStart(bin: string, port: number): Promise<boolean> {
    this._url = `http://127.0.0.1:${port}`;
    this.output.appendLine(`[opencode] spawn: ${bin} serve --port ${port}`);

    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const augmentedPath = augmentPath(process.env.PATH || "", bin);
    const proc = spawn(bin, ["serve", "--port", String(port), "--hostname", "127.0.0.1"], {
      cwd,
      env: { ...process.env, PATH: augmentedPath },
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.proc = proc;

    let earlyExit = false;
    proc.stdout?.on("data", (d) => this.output.append(d.toString()));
    proc.stderr?.on("data", (d) => this.output.append(d.toString()));
    proc.on("exit", (code, signal) => {
      this.output.appendLine(`[opencode] exited (code=${code} signal=${signal})`);
      if (this.proc === proc) this.proc = null;
      earlyExit = true;
      if (this._state === "ready") this.setState("stopped");
    });
    proc.on("error", (e) => {
      this.output.appendLine(`[opencode] spawn error: ${e.message}`);
      earlyExit = true;
    });

    const ok = await this.waitReady(this._url, 15000, () => earlyExit);
    if (ok && !earlyExit) {
      this.setState("ready");
      return true;
    }
    // failed: kill if still alive, then let caller try next port
    if (this.proc === proc) {
      try { proc.kill("SIGTERM"); } catch {}
      this.proc = null;
    }
    return false;
  }

  private async buildPortCandidates(fixedPort: number, rangeStr: string, maxAttempts: number): Promise<number[]> {
    if (fixedPort > 0) return [fixedPort];
    const range = parsePortRange(rangeStr);
    if (range) {
      const [lo, hi] = range;
      const list: number[] = [];
      for (let p = lo; p <= hi && list.length < maxAttempts; p++) list.push(p);
      return list;
    }
    // no range — pick N OS-assigned free ports
    const list: number[] = [];
    for (let i = 0; i < maxAttempts; i++) list.push(await pickFreePort());
    return list;
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill("SIGTERM");
      this.proc = null;
    }
    this.setState("stopped");
  }

  private setState(state: ServerState, message?: string) {
    this._state = state;
    this._emitter.fire({ state, message });
  }

  private waitReady(baseUrl: string, timeoutMs: number, abort?: () => boolean): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok: boolean) => { if (done) return; done = true; resolve(ok); };
      const tick = () => {
        if (done) return;
        if (abort?.()) return finish(false);
        const req = http.get(`${baseUrl}/doc`, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) return finish(true);
          retry();
        });
        req.on("error", retry);
        req.setTimeout(2000, () => { req.destroy(); retry(); });
      };
      const retry = () => {
        if (done) return;
        if (Date.now() >= deadline) return finish(false);
        setTimeout(tick, 400);
      };
      tick();
    });
  }
}

function resolveBinary(configured: string): string | null {
  // absolute or relative path with separator
  if (configured.includes(path.sep) || configured.startsWith(".")) {
    try { fs.accessSync(configured, fs.constants.X_OK); return configured; } catch { return null; }
  }
  const isWin = process.platform === "win32";
  const exeNames = isWin
    ? [`${configured}.exe`, `${configured}.cmd`, `${configured}.bat`, configured]
    : [configured];
  // search PATH plus common install locations
  const candidates: string[] = [];
  const PATH = process.env.PATH || "";
  for (const dir of PATH.split(path.delimiter)) {
    if (!dir) continue;
    for (const exe of exeNames) candidates.push(path.join(dir, exe));
  }
  const home = os.homedir();
  const extraDirs = isWin
    ? [
        path.join(home, ".opencode", "bin"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "opencode"),
        path.join(process.env.APPDATA || "", "npm"),
      ]
    : [
        path.join(home, ".opencode", "bin"),
        path.join(home, ".local", "bin"),
        "/usr/local/bin",
        "/opt/homebrew/bin",
      ];
  for (const dir of extraDirs) {
    if (!dir) continue;
    for (const exe of exeNames) candidates.push(path.join(dir, exe));
  }
  for (const c of candidates) {
    try {
      // X_OK isn't meaningful on Windows; fall back to F_OK
      const mode = isWin ? fs.constants.F_OK : fs.constants.X_OK;
      fs.accessSync(c, mode);
      return c;
    } catch {}
  }
  return null;
}

function augmentPath(current: string, binAbsPath: string): string {
  const isWin = process.platform === "win32";
  const home = os.homedir();
  const extra = isWin
    ? [
        path.dirname(binAbsPath),
        path.join(home, ".opencode", "bin"),
        path.join(process.env.LOCALAPPDATA || "", "Programs", "opencode"),
        path.join(process.env.APPDATA || "", "npm"),
      ]
    : [
        path.dirname(binAbsPath),
        path.join(home, ".opencode", "bin"),
        path.join(home, ".local", "bin"),
        "/usr/local/bin",
        "/opt/homebrew/bin",
      ];
  const parts = current ? current.split(path.delimiter) : [];
  for (const e of extra) if (e && !parts.includes(e)) parts.unshift(e);
  return parts.join(path.delimiter);
}

function parsePortRange(s: string): [number, number] | null {
  const m = s.match(/^\s*(\d{2,5})\s*-\s*(\d{2,5})\s*$/);
  if (!m) return null;
  const lo = parseInt(m[1], 10);
  const hi = parseInt(m[2], 10);
  if (lo <= 0 || hi <= 0 || lo > 65535 || hi > 65535 || lo > hi) return null;
  return [lo, hi];
}

function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}
