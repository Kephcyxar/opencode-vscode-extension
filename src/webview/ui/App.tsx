import * as React from "react";
import { post } from "./vscode";
import { Sessions } from "./Sessions";
import { Conversation } from "./Conversation";
import { Composer } from "./Composer";
import { ModelPicker, getDefaultModelKey } from "./ModelPicker";

type ServerState = "starting" | "ready" | "error" | "stopped";

const SURFACE: "sidebar" | "editor" = (window as any).__OPENCODE_MODE__ === "editor" ? "editor" : "sidebar";
const PINNED_SESSION_ID: string | null = (window as any).__OPENCODE_SESSION_ID__ || null;

export function App() {
  const [serverState, setServerState] = React.useState<ServerState>("stopped");
  const [serverMsg, setServerMsg] = React.useState<string>("");
  const [serverUrl, setServerUrl] = React.useState<string>("");
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(PINNED_SESSION_ID);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [providers, setProviders] = React.useState<any[]>([]);
  const [picker, setPicker] = React.useState(false);
  const [mode, setMode] = React.useState<"build" | "plan">("build");
  const [model, setModel] = React.useState<{ providerID: string; modelID: string; label: string } | null>(null);
  const [variant, setVariant] = React.useState<string | null>(null);
  const [thinking, setThinking] = React.useState<boolean>(true);
  const [working, setWorking] = React.useState(false);
  const [pendingPerms, setPendingPerms] = React.useState<any[]>([]);
  const [pendingQuestions, setPendingQuestions] = React.useState<any[]>([]);

  React.useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const m = ev.data;
      switch (m.type) {
        case "init":
          setServerUrl(m.serverUrl);
          if (SURFACE === "sidebar") setActiveId(m.activeSessionId);
          break;
        case "serverState":
          setServerState(m.state);
          setServerMsg(m.message || "");
          break;
        case "sessions":
          setSessions(m.sessions);
          break;
        case "messages":
          if (m.sessionId === activeId) {
            setMessages(m.messages);
            const last = m.messages[m.messages.length - 1];
            if (last?.error) setWorking(false);
          }
          break;
        case "permission":
          if (m.sessionId === activeId) {
            setPendingPerms((p) => p.find((x) => x.id === m.request.id) ? p : [...p, m.request]);
          }
          break;
        case "permissionResolved":
          setPendingPerms((p) => p.filter((x) => x.id !== m.requestId));
          break;
        case "question":
          if (m.sessionId === activeId) {
            setPendingQuestions((q) => q.find((x) => x.id === m.request.id) ? q : [...q, m.request]);
          }
          break;
        case "questionResolved":
          setPendingQuestions((q) => q.filter((x) => x.id !== m.requestId));
          break;
        case "event": {
          const evt = m.event;
          const sid = evt?.properties?.sessionID || evt?.properties?.info?.sessionID || evt?.properties?.part?.sessionID;
          if (sid && sid === activeId) {
            if (evt.type === "session.idle") setWorking(false);
            else if (evt.type === "session.error") setWorking(false);
          }
          break;
        }
        case "providers":
          setProviders(m.providers);
          if (!model && m.providers?.length) {
            const starred = getDefaultModelKey();
            let picked: { providerID: string; modelID: string; label: string } | null = null;
            if (starred) {
              const [pid, mid] = starred.split("/");
              for (const p of m.providers) {
                if (p.id !== pid) continue;
                const found = Object.values<any>(p.models || {}).find((x: any) => x.id === mid);
                if (found) {
                  picked = { providerID: p.id, modelID: found.id, label: found.name || found.id };
                  break;
                }
              }
            }
            if (!picked) {
              const p = m.providers[0];
              const firstModel = Object.values(p.models || {})[0] as any;
              if (firstModel) picked = { providerID: p.id, modelID: firstModel.id, label: `${firstModel.name || firstModel.id}` };
            }
            if (picked) setModel(picked);
          }
          break;
      }
    };
    window.addEventListener("message", handler);
    post({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, [activeId, model]);

  React.useEffect(() => {
    setMessages([]);
  }, [activeId]);

  const currentModelMeta = React.useMemo(() => {
    if (!model) return null;
    const p = providers.find((x: any) => x.id === model.providerID);
    if (!p) return null;
    const m = (p.models || {})[model.modelID];
    if (!m) return null;
    return m;
  }, [providers, model]);

  const variantKeys = React.useMemo(() => {
    const v = currentModelMeta?.variants;
    return v ? Object.keys(v) : [];
  }, [currentModelMeta]);

  const reasoningSupported = !!currentModelMeta?.capabilities?.reasoning;

  React.useEffect(() => {
    if (!model) return;
    const key = `opencode.variant.${model.providerID}/${model.modelID}`;
    if (variantKeys.length > 0) {
      let saved: string | null = null;
      try { saved = localStorage.getItem(key); } catch {}
      const initial = saved && variantKeys.includes(saved) ? saved : (variantKeys.includes("medium") ? "medium" : variantKeys[0]);
      setVariant(initial);
    } else {
      setVariant(null);
    }
    if (reasoningSupported && variantKeys.length === 0) {
      let saved: string | null = null;
      try { saved = localStorage.getItem(`opencode.thinking.${model.providerID}/${model.modelID}`); } catch {}
      setThinking(saved == null ? true : saved === "1");
    } else {
      setThinking(true);
    }
  }, [model?.providerID, model?.modelID, variantKeys.join(","), reasoningSupported]);

  const onVariantChange = (v: string | null) => {
    setVariant(v);
    if (model && v) {
      try { localStorage.setItem(`opencode.variant.${model.providerID}/${model.modelID}`, v); } catch {}
    }
  };

  const onThinkingChange = (on: boolean) => {
    setThinking(on);
    if (model) {
      try { localStorage.setItem(`opencode.thinking.${model.providerID}/${model.modelID}`, on ? "1" : "0"); } catch {}
    }
  };

  const send = (text: string) => {
    if (!activeId || !text.trim() || !model) return;
    setWorking(true);
    const payload: any = {
      type: "sendMessage",
      sessionId: activeId,
      text,
      mode,
      providerID: model.providerID,
      modelID: model.modelID,
    };
    if (variant) payload.variant = variant;
    if (reasoningSupported && variantKeys.length === 0) payload.thinking = thinking;
    post(payload);
  };

  const abort = () => {
    if (!activeId) return;
    post({ type: "abort", sessionId: activeId });
    setWorking(false);
  };

  React.useEffect(() => {
    if (SURFACE !== "editor") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && working) {
        e.preventDefault();
        abort();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [working, activeId]);

  React.useEffect(() => {
    setWorking(false);
    setPendingPerms([]);
    setPendingQuestions([]);
  }, [activeId]);

  const replyPerm = (requestId: string, response: "once" | "always" | "reject") => {
    if (!activeId) return;
    post({ type: "replyPermission", sessionId: activeId, requestId, response });
    setPendingPerms((p) => p.filter((x) => x.id !== requestId));
  };

  const replyQuestion = (requestId: string, answers: string[][]) => {
    if (!activeId) return;
    post({ type: "replyQuestion", sessionId: activeId, requestId, answers });
    setPendingQuestions((q) => q.filter((x) => x.id !== requestId));
  };

  const rejectQuestion = (requestId: string) => {
    if (!activeId) return;
    post({ type: "rejectQuestion", sessionId: activeId, requestId });
    setPendingQuestions((q) => q.filter((x) => x.id !== requestId));
  };

  const statusBar = (
    <div className="statusbar">
      <span className={`dot ${serverState}`} />
      <span>
        {serverState === "ready" && `opencode ${serverUrl.replace(/^https?:\/\//, "")}`}
        {serverState === "starting" && "starting opencode…"}
        {serverState === "error" && `error: ${serverMsg}`}
        {serverState === "stopped" && "stopped"}
      </span>
    </div>
  );

  if (SURFACE === "sidebar") {
    return (
      <div className="app">
        {statusBar}
        <Sessions
          sessions={sessions}
          activeId={activeId}
          onCreate={() => post({ type: "createSession" })}
          onSelect={(id) => post({ type: "openSessionInEditor", sessionId: id })}
          onDelete={(id) => post({ type: "deleteSession", id })}
          onOpenInEditor={(id) => post({ type: "openSessionInEditor", sessionId: id })}
          onRename={(id, title) => post({ type: "renameSession", id, title })}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {statusBar}
      <Conversation
        messages={messages}
        activeId={activeId}
        isWorking={working}
        pendingQuestions={pendingQuestions}
        onReplyQuestion={replyQuestion}
        onRejectQuestion={rejectQuestion}
      />
      {pendingPerms.length > 0 && (
        <div className="permission-stack">
          {pendingPerms.map((p) => (
            <div key={p.id} className="permission-card">
              <div className="permission-head">
                <span className="permission-tag">PERMISSION</span>
                {p.tool && <span className="permission-tool">{p.tool}</span>}
              </div>
              {p.title && <div className="permission-title">{p.title}</div>}
              {p.description && <div className="permission-desc">{p.description}</div>}
              <div className="permission-actions">
                <button className="perm-btn allow" onClick={() => replyPerm(p.id, "once")}>Allow once</button>
                <button className="perm-btn allow-all" onClick={() => replyPerm(p.id, "always")}>Allow always</button>
                <button className="perm-btn reject" onClick={() => replyPerm(p.id, "reject")}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Composer
        disabled={!activeId || serverState !== "ready"}
        working={working}
        mode={mode}
        onModeChange={setMode}
        modelLabel={model?.label || "select model"}
        onPickModel={() => setPicker(true)}
        onSend={send}
        onAbort={abort}
        variants={variantKeys}
        variant={variant}
        onVariantChange={onVariantChange}
        thinkingSupported={reasoningSupported && variantKeys.length === 0}
        thinking={thinking}
        onThinkingChange={onThinkingChange}
      />
      {picker && (
        <ModelPicker
          providers={providers}
          current={model}
          onClose={() => setPicker(false)}
          onRefresh={() => post({ type: "loadProviders" })}
          onPick={(providerID, modelID, label) => {
            setModel({ providerID, modelID, label });
            if (activeId) post({ type: "setSessionModel", sessionId: activeId, providerID, modelID });
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
