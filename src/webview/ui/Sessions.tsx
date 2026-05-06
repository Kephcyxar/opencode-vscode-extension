import * as React from "react";

interface Props {
  sessions: any[];
  activeId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenInEditor: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function Sessions({ sessions, activeId, onCreate, onSelect, onDelete, onOpenInEditor, onRename }: Props) {
  const [open, setOpen] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  const startRename = (s: any) => {
    setEditingId(s.id);
    setDraft(s.title || "");
  };
  const commit = (id: string) => {
    const t = draft.trim();
    if (t) onRename(id, t);
    setEditingId(null);
  };

  return (
    <>
      <div className="section-header" onClick={() => setOpen((v) => !v)}>
        <span>{open ? "▾" : "▸"} SESSIONS</span>
        <span className="actions" onClick={(e) => e.stopPropagation()}>
          <button className="iconbtn" title="New session" onClick={onCreate}>+</button>
        </span>
      </div>
      {open && (
        <div className="sessions">
          {sessions.length === 0 && (
            <div style={{ padding: "6px 14px", fontSize: 12, opacity: 0.6 }}>No sessions yet.</div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`session ${s.id === activeId ? "active" : ""}`}
              onClick={() => editingId !== s.id && onSelect(s.id)}
              onDoubleClick={(e) => { e.stopPropagation(); startRename(s); }}
              title={`${s.directory || ""}\n${s.share?.url || ""}`}
            >
              {editingId === s.id ? (
                <input
                  className="session-edit"
                  autoFocus
                  value={draft}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commit(s.id); }
                    else if (e.key === "Escape") { e.preventDefault(); setEditingId(null); }
                  }}
                  onBlur={() => commit(s.id)}
                />
              ) : (
                <span className="title">{s.title || s.id.slice(0, 8)}</span>
              )}
              <button
                className="iconbtn rename"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); startRename(s); }}
                title="Rename"
              >✎</button>
              <button
                className="iconbtn close"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                title="Delete"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
