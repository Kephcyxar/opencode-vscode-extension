import * as React from "react";
import { Markdown } from "./markdown";

interface Props {
  messages: any[];
  activeId: string | null;
  isWorking?: boolean;
  pendingQuestions?: any[];
  onReplyQuestion?: (requestId: string, answers: string[][]) => void;
  onRejectQuestion?: (requestId: string) => void;
}

const LOADING_VERBS = ["Thinking", "Pondering", "Cooking", "Reasoning", "Crafting", "Brewing", "Mulling", "Noodling", "Simmering"];

const QuestionContext = React.createContext<{
  pending: any[];
  reply: (id: string, answers: string[][]) => void;
  reject: (id: string) => void;
}>({ pending: [], reply: () => {}, reject: () => {} });

export function Conversation({ messages, activeId, isWorking, pendingQuestions, onReplyQuestion, onRejectQuestion }: Props) {
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
    <QuestionContext.Provider
      value={{
        pending: pendingQuestions || [],
        reply: onReplyQuestion || (() => {}),
        reject: onRejectQuestion || (() => {}),
      }}
    >
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
    </QuestionContext.Provider>
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
      {message.error && <ErrorBlock error={message.error} />}
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
    const text = (part.text || "").trim();
    if (!text) return null;
    return (
      <div className="part thinking">
        <span className="thinking-label">Thinking:</span> {text}
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
  if (tool === "question" || tool === "askuserquestion" || tool === "ask_user_question" || tool === "ask_user_questions") {
    return <QuestionTool input={input} output={output} state={state} />;
  }
  if (tool === "websearch" || tool === "web_search") return <WebSearchTool input={input} output={output} />;
  if (tool === "webfetch" || tool === "web_fetch") return <WebFetchTool input={input} output={output} />;
  if (tool === "glob") return <GlobTool input={input} output={output} />;
  if (tool === "task") return <TaskTool input={input} output={output} state={state} />;
  if (tool === "grep") return <GrepTool input={input} output={output} />;
  return <GenericTool part={part} />;
}

function TaskTool({ input, output, state }: { input: any; output: any; state: any }) {
  const [open, setOpen] = React.useState(false);
  const desc: string = input.description || state.title || "Task";
  const subagent: string = input.subagent_type || input.subagentType || input.agent || "";
  const prompt: string = input.prompt || "";
  const out = typeof output === "string" ? output : output ? tryStr(output) : "";
  const taskResult = (() => {
    const m = out.match(/<task_result>([\s\S]*?)<\/task_result>/);
    return m ? m[1].trim() : out.trim();
  })();
  return (
    <div className="tool tool-task">
      <div className="tool-head" onClick={() => setOpen((v) => !v)} style={{ cursor: "pointer" }}>
        <span className="tool-tag task">TASK</span>
        <span className="tool-desc">{desc}</span>
        {subagent && <span className="tool-chip">{subagent}</span>}
        <span className="task-caret">{open ? "▾" : "▸"}</span>
      </div>
      {open && prompt && (
        <div className="task-prompt">
          <div className="task-section-label">Prompt</div>
          <div className="task-prompt-body">{prompt}</div>
        </div>
      )}
      {taskResult && (
        <div className="task-result">
          {open && <div className="task-section-label">Result</div>}
          <Markdown text={taskResult} />
        </div>
      )}
    </div>
  );
}

function GrepTool({ input, output }: { input: any; output: any }) {
  const pattern: string = input.pattern || input.query || "";
  const path: string = input.path || "";
  const include: string = input.include || input.glob || "";
  const raw = typeof output === "string" ? output : output ? tryStr(output) : "";
  const lines = raw.split("\n").map((s) => s.trim()).filter((s) => s.length > 0 && !/^no\b/i.test(s));
  return (
    <div className="tool tool-grep">
      <div className="tool-head">
        <span className="tool-tag read">GREP</span>
        <span className="tool-desc"><code>{pattern}</code>{path ? <> in <code>{path}</code></> : null}{include ? <> · <code>{include}</code></> : null}</span>
        {lines.length > 0 && <span className="tool-chip">{lines.length} hit{lines.length === 1 ? "" : "s"}</span>}
      </div>
      {lines.length > 0 && (
        <div className="glob-list">
          {lines.slice(0, 50).map((f, i) => <div key={i} className="glob-file">{f}</div>)}
          {lines.length > 50 && <div className="glob-file dim">… and {lines.length - 50} more</div>}
        </div>
      )}
    </div>
  );
}

function GlobTool({ input, output }: { input: any; output: any }) {
  const pattern: string = input.pattern || input.glob || "";
  const path: string = input.path || "";
  const raw = typeof output === "string" ? output : output ? tryStr(output) : "";
  const files = raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^no\s/i.test(s));
  return (
    <div className="tool tool-glob">
      <div className="tool-head">
        <span className="tool-tag read">GLOB</span>
        <span className="tool-desc"><code>{pattern}</code>{path ? <> in <code>{path}</code></> : null}</span>
        {files.length > 0 && <span className="tool-chip">{files.length} match{files.length === 1 ? "" : "es"}</span>}
      </div>
      {files.length > 0 && (
        <div className="glob-list">
          {files.slice(0, 50).map((f, i) => (
            <div key={i} className="glob-file">{f}</div>
          ))}
          {files.length > 50 && <div className="glob-file dim">… and {files.length - 50} more</div>}
        </div>
      )}
    </div>
  );
}

function WebSearchTool({ input, output }: { input: any; output: any }) {
  const query: string = input.query || input.q || input.search || "";
  const depth: string = input.type || input.depth || "";
  const text = typeof output === "string" ? output : output ? tryStr(output) : "";
  const results = parseWebSearchResults(text);
  return (
    <div className="tool tool-websearch">
      <div className="tool-head">
        <span className="tool-tag websearch">WEB SEARCH</span>
        {query && <span className="tool-desc">"{query}"</span>}
        {depth && <span className="tool-chip">{depth}</span>}
      </div>
      {results.length > 0 ? (
        <div className="websearch-results">
          {results.map((r, i) => (
            <div key={i} className="websearch-result">
              {r.url ? (
                <a className="websearch-title" href={r.url} target="_blank" rel="noreferrer">{r.title || r.url}</a>
              ) : (
                <div className="websearch-title">{r.title}</div>
              )}
              {(r.published || r.author) && (
                <div className="websearch-meta">
                  {r.published && <span>{r.published}</span>}
                  {r.author && <span>· {r.author}</span>}
                </div>
              )}
              {r.snippet && <div className="websearch-snippet">{r.snippet}</div>}
            </div>
          ))}
        </div>
      ) : text ? (
        <div className="tool-body dim">{text}</div>
      ) : null}
    </div>
  );
}

type WebResult = { title?: string; url?: string; published?: string; author?: string; snippet?: string };

function parseWebSearchResults(text: string): WebResult[] {
  if (!text) return [];
  const out: WebResult[] = [];
  const blocks = text.split(/\n(?=Title:\s)/g);
  for (const block of blocks) {
    if (!/^Title:\s/.test(block)) continue;
    const result: WebResult = {};
    const snippetParts: string[] = [];
    let inBody = false;
    for (const ln of block.split("\n")) {
      if (!inBody) {
        const m = ln.match(/^(Title|URL|Published|Author|Highlights):\s*(.*)$/);
        if (m) {
          const key = m[1].toLowerCase();
          const val = m[2].trim();
          if (key === "title") result.title = val;
          else if (key === "url") result.url = val;
          else if (key === "published") result.published = val.replace(/T.*$/, "");
          else if (key === "author" && val && val !== "N/A") result.author = val;
          continue;
        }
        if (ln.trim() === "" || /^\[\.\.\.\]$/.test(ln.trim())) continue;
        inBody = true;
      }
      if (inBody) snippetParts.push(ln);
    }
    const snippet = snippetParts.join("\n").trim().replace(/\n{3,}/g, "\n\n");
    if (snippet) result.snippet = snippet.length > 400 ? snippet.slice(0, 400) + "…" : snippet;
    if (result.title || result.url) out.push(result);
  }
  return out;
}

function WebFetchTool({ input, output }: { input: any; output: any }) {
  const url: string = input.url || input.uri || "";
  const prompt: string = input.prompt || input.query || "";
  const text = typeof output === "string" ? output : output ? tryStr(output) : "";
  const truncated = text.length > 1200 ? text.slice(0, 1200) + "…" : text;
  return (
    <div className="tool tool-webfetch">
      <div className="tool-head">
        <span className="tool-tag websearch">WEB FETCH</span>
        {url && <a className="tool-path" href={url} target="_blank" rel="noreferrer">{url}</a>}
      </div>
      {prompt && <div className="webfetch-prompt">{prompt}</div>}
      {truncated && <div className="tool-body">{truncated}</div>}
    </div>
  );
}

function QuestionTool({ input, output, state }: { input: any; output: any; state: any }) {
  const ctx = React.useContext(QuestionContext);
  const callID: string | undefined = state?.callID || state?.callId;
  const pending = ctx.pending.find((p) => p?.tool?.callID && callID && p.tool.callID === callID)
    || (ctx.pending.length === 1 && !output ? ctx.pending[0] : undefined);

  const sourceQuestions: any[] = pending?.questions
    || (Array.isArray(input?.questions) ? input.questions : input?.question || input?.prompt ? [input] : []);
  const answers = parseQuestionAnswers(output);
  const interactive = !!pending && !output;

  const [selected, setSelected] = React.useState<string[][]>(() => sourceQuestions.map(() => []));
  React.useEffect(() => {
    setSelected(sourceQuestions.map(() => []));
  }, [pending?.id, sourceQuestions.length]);

  const toggle = (qi: number, label: string, multi: boolean) => {
    setSelected((prev) => {
      const next = prev.map((a) => a.slice());
      while (next.length <= qi) next.push([]);
      const cur = next[qi];
      if (multi) {
        const idx = cur.indexOf(label);
        if (idx >= 0) cur.splice(idx, 1); else cur.push(label);
      } else {
        next[qi] = [label];
      }
      return next;
    });
  };

  const allAnswered = interactive && selected.length === sourceQuestions.length && selected.every((a) => a.length > 0);

  const submit = () => {
    if (!pending || !allAnswered) return;
    ctx.reply(pending.id, selected);
  };
  const reject = () => {
    if (!pending) return;
    ctx.reject(pending.id);
  };

  return (
    <div className="tool tool-question">
      <div className="tool-head">
        <span className="tool-tag question">QUESTION</span>
        {state.title && <span className="tool-desc">{state.title}</span>}
        {interactive && <span className="tool-chip">awaiting answer</span>}
      </div>
      {sourceQuestions.length === 0 ? (
        <div className="tool-body">{tryStr(input)}</div>
      ) : (
        <div className="question-list">
          {sourceQuestions.map((q, i) => {
            const text = q.question || q.prompt || q.text || "";
            const header = q.header || q.title || q.label || "";
            const options: any[] = Array.isArray(q.options) ? q.options : [];
            const multi = !!(q.multiple ?? q.multiSelect);
            const picked = answers[i];
            const mySelections = selected[i] || [];
            return (
              <div key={i} className="question-card">
                {header && <span className="question-header">{header}</span>}
                {text && <div className="question-text">{text}</div>}
                {options.length > 0 && (
                  <div className="question-options">
                    {options.map((opt, j) => {
                      const label = typeof opt === "string" ? opt : opt.label || opt.value || "";
                      const desc = typeof opt === "string" ? "" : opt.description || "";
                      const isSelectedFinal = isOptionSelected(picked, label, j);
                      const isSelectedDraft = interactive && mySelections.includes(label);
                      const selectedFlag = isSelectedFinal || isSelectedDraft;
                      const className = `question-option${selectedFlag ? " selected" : ""}${interactive ? " clickable" : ""}`;
                      const content = (
                        <>
                          <div className="question-option-label">
                            {selectedFlag && <span className="question-check">✓</span>}
                            {label}
                          </div>
                          {desc && <div className="question-option-desc">{desc}</div>}
                        </>
                      );
                      if (interactive) {
                        return (
                          <button
                            key={j}
                            type="button"
                            className={className}
                            onClick={() => toggle(i, label, multi)}
                          >
                            {content}
                          </button>
                        );
                      }
                      return <div key={j} className={className}>{content}</div>;
                    })}
                  </div>
                )}
                {multi && <div className="question-hint">multi-select</div>}
                {picked?.customText && (
                  <div className="question-answer">Answer: {picked.customText}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {interactive && (
        <div className="question-actions">
          <button
            type="button"
            className="perm-btn allow"
            disabled={!allAnswered}
            onClick={submit}
          >
            Submit
          </button>
          <button type="button" className="perm-btn reject" onClick={reject}>
            Reject
          </button>
          {!allAnswered && <span className="question-hint">answer all questions to submit</span>}
        </div>
      )}
    </div>
  );
}

function parseQuestionAnswers(output: any): Record<number, any> {
  if (!output) return {};
  let parsed: any = output;
  if (typeof output === "string") {
    try { parsed = JSON.parse(output); } catch { return {}; }
  }
  if (Array.isArray(parsed?.answers)) {
    const map: Record<number, any> = {};
    parsed.answers.forEach((a: any, i: number) => { map[i] = a; });
    return map;
  }
  if (Array.isArray(parsed)) {
    const map: Record<number, any> = {};
    parsed.forEach((a: any, i: number) => { map[i] = a; });
    return map;
  }
  if (parsed && typeof parsed === "object") return { 0: parsed };
  return {};
}

function isOptionSelected(answer: any, label: string, index: number): boolean {
  if (!answer) return false;
  if (answer.selectedOption === label || answer.selected === label || answer.value === label) return true;
  if (typeof answer.selectedIndex === "number" && answer.selectedIndex === index) return true;
  if (Array.isArray(answer.selectedOptions) && answer.selectedOptions.includes(label)) return true;
  if (Array.isArray(answer.selected) && answer.selected.includes(label)) return true;
  return false;
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

function ErrorBlock({ error }: { error: any }) {
  const name = error?.name || "Error";
  const data = error?.data || {};
  const msg: string = data.message || error?.message || tryStr(error);
  const status = data.statusCode;
  const urlMatch = msg.match(/https?:\/\/\S+/);
  const url = urlMatch ? urlMatch[0].replace(/[).,]+$/, "") : null;
  const before = url ? msg.slice(0, msg.indexOf(url)) : msg;
  const after = url ? msg.slice(msg.indexOf(url) + url.length) : "";
  return (
    <div className="msg-error">
      <div className="msg-error-head">
        <span className="msg-error-tag">ERROR</span>
        <span className="msg-error-name">{name}{status ? ` · ${status}` : ""}</span>
      </div>
      <div className="msg-error-body">
        {before}
        {url && <a href={url} target="_blank" rel="noreferrer">{url}</a>}
        {after}
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
