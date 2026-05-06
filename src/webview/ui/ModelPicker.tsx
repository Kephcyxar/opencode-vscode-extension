import * as React from "react";

interface Props {
  providers: any[];
  current: { providerID: string; modelID: string; label: string } | null;
  onClose: () => void;
  onPick: (providerID: string, modelID: string, label: string) => void;
}

export function ModelPicker({ providers, current, onClose, onPick }: Props) {
  const [filter, setFilter] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("opencode.recentModels") || "[]"); } catch { return []; }
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const flat = React.useMemo(() => {
    const out: { providerID: string; modelID: string; label: string; provider: string }[] = [];
    for (const p of providers || []) {
      for (const m of Object.values<any>(p.models || {})) {
        out.push({ providerID: p.id, modelID: m.id, label: m.name || m.id, provider: p.name || p.id });
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
    localStorage.setItem("opencode.recentModels", JSON.stringify(next));
    onPick(m.providerID, m.modelID, `${m.label}`);
  };

  // group remaining by provider
  const grouped: Record<string, typeof flat> = {};
  for (const m of matches) {
    (grouped[m.provider] ||= []).push(m);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <span className="title">Switch model</span>
          <span className="hint">Esc to close</span>
        </div>
        <div className="picker-search">
          <input autoFocus placeholder="Filter models" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="picker-list">
          {!q && recents.length > 0 && (
            <>
              <div className="picker-section">Recent</div>
              {recents.map((m) => (
                <Item key={`r-${m.providerID}-${m.modelID}`} m={m} current={current} onPick={pick} />
              ))}
            </>
          )}
          {Object.entries(grouped).map(([prov, list]) => (
            <React.Fragment key={prov}>
              <div className="picker-section">{prov}</div>
              {list.map((m) => (
                <Item key={`${m.providerID}-${m.modelID}`} m={m} current={current} onPick={pick} />
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
  m, current, onPick,
}: {
  m: { providerID: string; modelID: string; label: string; provider: string };
  current: { providerID: string; modelID: string } | null;
  onPick: (m: any) => void;
}) {
  const isActive = current && current.providerID === m.providerID && current.modelID === m.modelID;
  return (
    <div className={`picker-item ${isActive ? "active" : ""}`} onClick={() => onPick(m)}>
      <span>{m.label} <span className="meta">{m.provider}</span></span>
      {isActive && <span className="star">★</span>}
    </div>
  );
}
