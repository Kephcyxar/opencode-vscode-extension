import * as React from "react";
import { Markdown } from "./markdown";

interface Props {
  messages: any[];
  activeId: string | null;
  isWorking?: boolean;
}

const LOADING_VERBS = ["Thinking", "Pondering", "Cooking", "Reasoning", "Crafting", "Brewing", "Mulling", "Noodling", "Simmering"];

export function Conversation({ messages, activeId, isWorking }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const stickRef = React.useRef(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, isWorking]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  if (!activeId) {
    return (
      <div className="convo">
        <div className="empty">
          <div style={{ fontSize: 32, opacity: 0.4 }}>◇</div>
          <div>No session selected.</div>
          <div style={{ fontSize: 11 }}>Click <b>+</b> in SESSIONS to start.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="convo" ref={ref} onScroll={onScroll}>
      {messages.length === 0 && !isWorking && (
        <div className="empty">
          <div style={{ fontSize: 12 }}>Send a message to begin.</div>
        </div>
      )}
      {messages.map((m, i) => (
        <MessageBlock key={m.id || i} message={m} />
      ))}
      {isWorking && <LoadingIndicator />}
    </div>
  );
}

function LoadingIndicator() {
  const [verb, setVerb] = React.useState(LOADING_VERBS[0]);
  const [dots, setDots] = React.useState("");
  React.useEffect(() => {
    const v = setInterval(() => {
      setVerb(LOADING_VERBS[Math.floor(Math.random() * LOADING_VERBS.length)]);
    }, 2400);
    const d = setInterval(() => {
      setDots((x) => (x.length >= 3 ? "" : x + "."));
    }, 400);
    return () => { clearInterval(v); clearInterval(d); };
  }, []);
  return (
    <div className="loading">
      <span className="loading-glyph" aria-hidden>
        <span className="g-o">o</span>
        <span className="g-c">c</span>
      </span>
      <span className="loading-text">{verb}{dots}</span>
    </div>
  );
}

function MessageBlock({ message }: { message: any }) {
  const role = message.role || "assistant";
  const parts: any[] = message.parts || [];
  if (role === "user") {
    return (
      <div className="msg user">
        <div className="user-head">You</div>
        <div className="user-body">
          {parts.map((p, idx) => <Part key={idx} part={p} />)}
          {parts.length === 0 && message.text && <div className="part text">{message.text}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="msg assistant">
      {parts.map((p, idx) => <Part key={idx} part={p} />)}
      {parts.length === 0 && message.text && <div className="part text">{message.text}</div>}
      {message.tokens && (
        <div className="msg-meta">
          {message.modelID && <span className="meta-model">{message.modelID}</span>}
          {message.tokens.input ? <span>{message.tokens.input} in</span> : null}
          {message.tokens.output ? <span>{message.tokens.output} out</span> : null}
          {typeof message.cost === "number" && message.cost > 0 ? <span>${message.cost.toFixed(4)}</span> : null}
        </div>
      )}
    </div>
  );
}

function Part({ part }: { part: any }) {
  const t = part.type;
  if (t === "text") return <div className="part text"><Markdown text={part.text} /></div>;
  if (t === "reasoning" || t === "thinking") {
    return (
      <div className="part thinking">
        <span className="thinking-label">Thinking:</span> {part.text}
      </div>
    );
  }
  if (t === "tool") return <ToolPart part={part} />;
  if (t === "step-start") return null;
  if (t === "step-finish") return null;
  if (t === "file") return <div className="part text">📎 {part.filename || part.url}</div>;
  return null;
}

function ToolPart({ part }: { part: any }) {
  const tool = (part.tool || "tool").toLowerCase();
  const state = part.state || {};
  const input = state.input || {};
  const output = state.output;

  if (tool === "edit") return <EditTool input={input} state={state} />;
  if (tool === "write") return <WriteTool input={input} state={state} />;
  if (tool === "bash" || tool === "shell") return <BashTool input={input} output={output} state={state} />;
  if (tool === "read") return <ReadTool input={input} state={state} />;
  if (tool === "todowrite" || tool === "todo") return <TodoTool input={input} />;
  if (tool === "apply_patch" || tool === "applypatch") return <ApplyPatchTool input={input} />;
  return <GenericTool part={part} />;
}

function ApplyPatchTool({ input }: { input: any }) {
  const patchText: string = input.patchText || input.patch || input.input || "";
  const files = parseApplyPatch(patchText);
  if (files.length === 0) {
    return (
      <div className="tool tool-edit">
        <div className="tool-head"><span className="tool-tag">PATCH</span></div>
        <div className="diff"><div className="diff-line ctx"><span className="diff-gutter"> </span><span className="diff-text">{patchText}</span></div></div>
      </div>
    );
  }
  return (
    <>
      {files.map((f, i) => (
        <div key={i} className="tool tool-edit">
          <div className="tool-head">
            <span className={`tool-tag ${f.kind === "add" ? "write" : ""}`}>{labelFor(f.kind)}</span>
            <span className="tool-path">{f.path}</span>
          </div>
          <div className="diff">
            {f.lines.map((line, j) => (
              <div key={j} className={`diff-line ${line.kind === "add" ? (f.kind === "add" ? "new" : "add") : line.kind}`}>
                <span className="diff-gutter">{line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}</span>
                <span className="diff-text">{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function labelFor(kind: "add" | "update" | "delete"): string {
  if (kind === "add") return "ADD";
  if (kind === "delete") return "DELETE";
  return "EDIT";
}

type PatchFile = { path: string; kind: "add" | "update" | "delete"; lines: DiffLine[] };

function parseApplyPatch(raw: string): PatchFile[] {
  if (!raw) return [];
  // Normalize literal "\n" to real newlines (some payloads stringify this way)
  const text = raw.includes("\\n") && !raw.includes("\n") ? raw.replace(/\\n/g, "\n") : raw;
  const lines = text.split("\n");
  const files: PatchFile[] = [];
  let cur: PatchFile | null = null;
  for (const ln of lines) {
    const add = ln.match(/^\*\*\* Add File:\s*(.+)$/);
    const upd = ln.match(/^\*\*\* Update File:\s*(.+)$/);
    const del = ln.match(/^\*\*\* Delete File:\s*(.+)$/);
    if (add) { if (cur) files.push(cur); cur = { path: add[1].trim(), kind: "add", lines: [] }; continue; }
    if (upd) { if (cur) files.push(cur); cur = { path: upd[1].trim(), kind: "update", lines: [] }; continue; }
    if (del) { if (cur) files.push(cur); cur = { path: del[1].trim(), kind: "delete", lines: [] }; continue; }
    if (/^\*\*\* (Begin|End) Patch/.test(ln)) continue;
    if (/^@@/.test(ln)) continue;
    if (!cur) continue;
    if (ln.startsWith("+")) cur.lines.push({ kind: "add", text: ln.slice(1) });
    else if (ln.startsWith("-")) cur.lines.push({ kind: "del", text: ln.slice(1) });
    else if (ln.startsWith(" ")) cur.lines.push({ kind: "ctx", text: ln.slice(1) });
    else cur.lines.push({ kind: "ctx", text: ln });
  }
  if (cur) files.push(cur);
  return files;
}

function EditTool({ input, state }: { input: any; state: any }) {
  const path = input.filePath || input.file_path || input.path || state.title || "";
  const oldStr = input.oldString || input.old_string || "";
  const newStr = input.newString || input.new_string || "";
  const diff = computeLineDiff(oldStr, newStr);
  return (
    <div className="tool tool-edit">
      <div className="tool-head"><span className="tool-tag">EDIT</span> <span className="tool-path">{path}</span></div>
      <div className="diff">
        {diff.map((line, i) => (
          <div key={i} className={`diff-line ${line.kind}`}>
            <span className="diff-gutter">{line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}</span>
            <span className="diff-text">{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WriteTool({ input, state }: { input: any; state: any }) {
  const path = input.filePath || input.file_path || input.path || state.title || "";
  const content: string = input.content || "";
  const lines = content.split("\n");
  return (
    <div className="tool tool-write">
      <div className="tool-head"><span className="tool-tag write">WRITE</span> <span className="tool-path">{path}</span></div>
      <div className="diff">
        {lines.map((l, i) => (
          <div key={i} className="diff-line new">
            <span className="diff-gutter">+</span>
            <span className="diff-text">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BashTool({ input, output, state }: { input: any; output: any; state: any }) {
  const cmd = input.command || input.cmd || "";
  const desc = input.description || state.title || "";
  const out = typeof output === "string" ? output : output ? tryStr(output) : "";
  return (
    <div className="tool tool-bash">
      <div className="tool-head"><span className="tool-tag bash">SHELL</span> {desc && <span className="tool-desc">{desc}</span>}</div>
      <div className="bash-cmd">$ {cmd}</div>
      {out && <div className="bash-out">{out}</div>}
    </div>
  );
}

function ReadTool({ input, state }: { input: any; state: any }) {
  const path = input.filePath || input.file_path || input.path || state.title || "";
  return (
    <div className="tool tool-read">
      <div className="tool-head"><span className="tool-tag read">READ</span> <span className="tool-path">{path}</span></div>
    </div>
  );
}

function TodoTool({ input }: { input: any }) {
  const todos: any[] = input.todos || [];
  return (
    <div className="tool tool-todo">
      <div className="tool-head"><span className="tool-tag todo">TO-DOS</span> <span className="tool-desc">{todos.length} todos</span></div>
      <div className="todo-list">
        {todos.map((t, i) => {
          const status = t.status || "pending";
          const mark = status === "completed" ? "✓" : status === "in_progress" ? "•" : " ";
          return (
            <div key={i} className={`todo-item ${status}`}>
              <span className="todo-mark">[{mark}]</span> {t.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GenericTool({ part }: { part: any }) {
  const state = part.state || {};
  return (
    <div className="tool tool-generic">
      <div className="tool-head">
        <span className="tool-tag generic">{(part.tool || "tool").toUpperCase()}</span>
        {state.title && <span className="tool-desc">{state.title}</span>}
      </div>
      {state.input && <div className="tool-body">{tryStr(state.input)}</div>}
      {state.output && <div className="tool-body dim">{tryStr(state.output)}</div>}
    </div>
  );
}

type DiffLine = { kind: "add" | "del" | "ctx"; text: string };

function computeLineDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const m = aLines.length;
  const n = bLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (aLines[i] === bLines[j]) { out.push({ kind: "ctx", text: aLines[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ kind: "del", text: aLines[i] }); i++; }
    else { out.push({ kind: "add", text: bLines[j] }); j++; }
  }
  while (i < m) { out.push({ kind: "del", text: aLines[i++] }); }
  while (j < n) { out.push({ kind: "add", text: bLines[j++] }); }
  return out;
}

function tryStr(v: any): string {
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
