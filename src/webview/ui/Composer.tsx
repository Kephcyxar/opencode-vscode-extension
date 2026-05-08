import * as React from "react";
import { post } from "./vscode";

interface Props {
  disabled: boolean;
  working?: boolean;
  mode: "build" | "plan";
  onModeChange: (m: "build" | "plan") => void;
  modelLabel: string;
  providerName?: string;
  onPickModel: () => void;
  onSend: (text: string) => void;
  onAbort: () => void;
  variants?: string[];
  variant?: string | null;
  onVariantChange?: (v: string | null) => void;
  thinkingSupported?: boolean;
  thinking?: boolean;
  onThinkingChange?: (on: boolean) => void;
  workspaceFiles?: string[];
}

export function Composer({
  disabled, working, mode, onModeChange, modelLabel, providerName, onPickModel, onSend, onAbort,
  variants, variant, onVariantChange,
  thinkingSupported, thinking, onThinkingChange,
  workspaceFiles = [],
}: Props) {
  const [text, setText] = React.useState("");
  const [atQuery, setAtQuery] = React.useState<string | null>(null);
  const [atIndex, setAtIndex] = React.useState(0);
  const atSuggestions = atQuery !== null ? workspaceFiles : [];
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    setAtQuery(null);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (atSuggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setAtIndex((i) => (i + 1) % atSuggestions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setAtIndex((i) => (i - 1 + atSuggestions.length) % atSuggestions.length); return; }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        insertSuggestion(atSuggestions[atIndex]);
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setAtQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const pos = e.target.selectionStart ?? val.length;
    const before = val.slice(0, pos);
    const atMatch = before.match(/@([\w./\-]*)$/);
    if (atMatch) {
      const q = atMatch[1];
      setAtQuery(q);
      setAtIndex(0);
      post({ type: "listWorkspaceFiles", query: q } as any);
    } else {
      setAtQuery(null);
    }
  };

  const insertSuggestion = (file: string) => {
    const pos = ref.current?.selectionStart ?? text.length;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const replaced = before.replace(/@[\w./\-]*$/, `@${file} `);
    setText(replaced + after);
    setAtQuery(null);
    ref.current?.focus();
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);

  const providerInitial = providerName ? providerName.charAt(0).toUpperCase() : "";

  return (
    <div className="composer">
      <div className="composer-input-wrap">
        <textarea
          ref={ref}
          value={text}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={onKey}
          placeholder={disabled ? "Waiting for opencode server…" : "Ask OpenCode… (@ to reference files)"}
        />
        {atSuggestions.length > 0 && atQuery !== null && (
          <div className="at-suggestions">
            {atSuggestions.map((s, i) => (
              <div
                key={s}
                className={`at-suggestion ${i === atIndex ? "active" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); insertSuggestion(s); }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="composer-bar">
        <div className="left">
          {working ? (
            <span className="abort-hint" onClick={onAbort} title="Stop generating (Esc)">⏹ Esc to stop</span>
          ) : (
            <>
              <span>↵ submit</span>
              <span>· Shift+↵ newline</span>
            </>
          )}
        </div>
        <div className="right">
          <div className="mode-toggle">
            <button className={mode === "build" ? "active" : ""} onClick={() => onModeChange("build")}>build</button>
            <button className={mode === "plan" ? "active" : ""} onClick={() => onModeChange("plan")}>plan</button>
          </div>
          {variants && variants.length > 0 && (
            <div className="effort-toggle" title="Reasoning effort">
              {variants.map((v) => (
                <button
                  key={v}
                  className={variant === v ? "active" : ""}
                  onClick={() => onVariantChange?.(v)}
                >{v}</button>
              ))}
            </div>
          )}
          {thinkingSupported && (!variants || variants.length === 0) && (
            <button
              className={`think-toggle ${thinking ? "on" : "off"}`}
              title={thinking ? "Thinking enabled — click to disable" : "Thinking disabled — click to enable"}
              onClick={() => onThinkingChange?.(!thinking)}
            >
              <span className="dot" /> think {thinking ? "on" : "off"}
            </button>
          )}
          <span className="pill" onClick={onPickModel} title="Switch model">
            {providerInitial && <span className="provider-badge">{providerInitial}</span>}
            {modelLabel} ▾
          </span>
        </div>
      </div>
    </div>
  );
}
