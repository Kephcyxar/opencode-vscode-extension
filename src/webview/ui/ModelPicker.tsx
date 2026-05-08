import * as React from "react";

interface Props {
  providers: any[];
  current: { providerID: string; modelID: string; label: string } | null;
  currentMode?: "build" | "plan";
  onClose: () => void;
  onPick: (providerID: string, modelID: string, label: string) => void;
  onRefresh?: () => void;
  onSetAgentDefault?: (agent: "build" | "plan", providerID: string, modelID: string) => void;
}

const DEFAULT_KEY = "opencode.defaultModel";
const RECENT_KEY = "opencode.recentModels";
const AGENT_DEFAULT_KEY = (agent: "build" | "plan") => `opencode.defaultModel.${agent}`;

export function getDefaultModelKey(): string | null {
  try { return localStorage.getItem(DEFAULT_KEY); } catch { return null; }
}

export function setDefaultModelKey(key: string | null) {
  try {
    if (key) localStorage.setItem(DEFAULT_KEY, key);
    else localStorage.removeItem(DEFAULT_KEY);
  } catch {}
}

export function ModelPicker({ providers, current, currentMode = "build", onClose, onPick, onRefresh, onSetAgentDefault }: Props) {
  const [filter, setFilter] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const [defaultKey, setDefaultKeyState] = React.useState<string | null>(() => getDefaultModelKey());
  const [buildDefault, setBuildDefault] = React.useState<string | null>(() => {
    try { return localStorage.getItem(AGENT_DEFAULT_KEY("build")); } catch { return null; }
  });
  const [planDefault, setPlanDefault] = React.useState<string | null>(() => {
    try { return localStorage.getItem(AGENT_DEFAULT_KEY("plan")); } catch { return null; }
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    onRefresh?.();
  }, []);

  const flat = React.useMemo(() => {
    const out: { providerID: string; modelID: string; label: string; provider: string; free: boolean }[] = [];
    for (const p of providers || []) {
      for (const m of Object.values<any>(p.models || {})) {
        const c = m.cost;
        const hasCost = c && (typeof c.input === "number" || typeof c.output === "number");
        const zeroCost = hasCost && (c.input || 0) === 0 && (c.output || 0) === 0;
        const free = zeroCost || /\bfree\b/i.test(m.id) || /\bfree\b/i.test(m.name || "");
        out.push({ providerID: p.id, modelID: m.id, label: m.name || m.id, provider: p.name || p.id, free });
      }
    }
    return out;
  }, [providers]);

  const q = filter.trim().toLowerCase();
  const matches = q
    ? flat.filter((m) => `${m.label} ${m.provider} ${m.modelID}`.toLowerCase().includes(q))
    : flat;

  const recentKeys = new Set(recent);
  const recents = flat.filter((m) => recentKeys.has(`${m.providerID}/${m.modelID}`)).slice(0, 5);

  const pick = (m: { providerID: string; modelID: string; label: string; provider: string }) => {
    const key = `${m.providerID}/${m.modelID}`;
    const next = [key, ...recent.filter((k) => k !== key)].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
    onPick(m.providerID, m.modelID, `${m.label}`);
  };

  const toggleStar = (e: React.MouseEvent, m: { providerID: string; modelID: string }) => {
    e.stopPropagation();
    const key = `${m.providerID}/${m.modelID}`;
    const next = defaultKey === key ? null : key;
    setDefaultKeyState(next);
    setDefaultModelKey(next);
  };

  const setAgentDefault = (e: React.MouseEvent, agent: "build" | "plan", m: { providerID: string; modelID: string }) => {
    e.stopPropagation();
    const key = `${m.providerID}/${m.modelID}`;
    try { localStorage.setItem(AGENT_DEFAULT_KEY(agent), key); } catch {}
    if (agent === "build") setBuildDefault(key);
    else setPlanDefault(key);
    onSetAgentDefault?.(agent, m.providerID, m.modelID);
  };

  const grouped: Record<string, typeof flat> = {};
  for (const m of matches) {
    (grouped[m.provider] ||= []).push(m);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <span className="title">Switch model</span>
          <span className="hint">★ default · B/P per-agent · Esc close</span>
        </div>
        <div className="picker-search">
          <input autoFocus placeholder="Filter models" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="picker-list">
          {!q && recents.length > 0 && (
            <>
              <div className="picker-section">Recent</div>
              {recents.map((m) => (
                <Item
                  key={`r-${m.providerID}-${m.modelID}`}
                  m={m}
                  current={current}
                  defaultKey={defaultKey}
                  buildDefault={buildDefault}
                  planDefault={planDefault}
                  currentMode={currentMode}
                  onPick={pick}
                  onToggleStar={toggleStar}
                  onSetAgentDefault={setAgentDefault}
                />
              ))}
            </>
          )}
          {Object.entries(grouped).map(([prov, list]) => (
            <React.Fragment key={prov}>
              <div className="picker-section">{prov}</div>
              {list.map((m) => (
                <Item
                  key={`${m.providerID}-${m.modelID}`}
                  m={m}
                  current={current}
                  defaultKey={defaultKey}
                  buildDefault={buildDefault}
                  planDefault={planDefault}
                  currentMode={currentMode}
                  onPick={pick}
                  onToggleStar={toggleStar}
                  onSetAgentDefault={setAgentDefault}
                />
              ))}
            </React.Fragment>
          ))}
          {matches.length === 0 && (
            <div style={{ padding: "12px 14px", fontSize: 12, opacity: 0.6 }}>
              No models. Configure providers via `opencode auth login`.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Item({
  m, current, defaultKey, buildDefault, planDefault, currentMode, onPick, onToggleStar, onSetAgentDefault,
}: {
  m: { providerID: string; modelID: string; label: string; provider: string; free?: boolean };
  current: { providerID: string; modelID: string } | null;
  defaultKey: string | null;
  buildDefault: string | null;
  planDefault: string | null;
  currentMode: "build" | "plan";
  onPick: (m: any) => void;
  onToggleStar: (e: React.MouseEvent, m: { providerID: string; modelID: string }) => void;
  onSetAgentDefault: (e: React.MouseEvent, agent: "build" | "plan", m: { providerID: string; modelID: string }) => void;
}) {
  const key = `${m.providerID}/${m.modelID}`;
  const isActive = current && current.providerID === m.providerID && current.modelID === m.modelID;
  const isDefault = defaultKey === key;
  const isBuildDefault = buildDefault === key;
  const isPlanDefault = planDefault === key;
  return (
    <div className={`picker-item ${isActive ? "active" : ""}`} onClick={() => onPick(m)}>
      <span className="picker-item-left">
        {m.label} <span className="meta">{m.provider}</span>
        {m.free && <span className="free-badge">Free</span>}
      </span>
      <span className="picker-item-right">
        {isActive && <span className="active-dot">●</span>}
        <button
          className={`agent-default-btn ${isBuildDefault ? "set" : ""}`}
          title={isBuildDefault ? "Default for Build agent" : "Set as default for Build agent"}
          onClick={(e) => onSetAgentDefault(e, "build", m)}
        >B</button>
        <button
          className={`agent-default-btn ${isPlanDefault ? "set" : ""}`}
          title={isPlanDefault ? "Default for Plan agent" : "Set as default for Plan agent"}
          onClick={(e) => onSetAgentDefault(e, "plan", m)}
        >P</button>
        <button
          className={`star-btn ${isDefault ? "starred" : ""}`}
          title={isDefault ? "Global default — click to unstar" : "Set as global default model"}
          onClick={(e) => onToggleStar(e, m)}
        >
          {isDefault ? "★" : "☆"}
        </button>
      </span>
    </div>
  );
}
