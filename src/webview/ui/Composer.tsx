import * as React from "react";

interface Props {
  disabled: boolean;
  working?: boolean;
  mode: "build" | "plan";
  onModeChange: (m: "build" | "plan") => void;
  modelLabel: string;
  onPickModel: () => void;
  onSend: (text: string) => void;
  onAbort: () => void;
  variants?: string[];
  variant?: string | null;
  onVariantChange?: (v: string | null) => void;
  thinkingSupported?: boolean;
  thinking?: boolean;
  onThinkingChange?: (on: boolean) => void;
}

export function Composer({
  disabled, working, mode, onModeChange, modelLabel, onPickModel, onSend, onAbort,
  variants, variant, onVariantChange,
  thinkingSupported, thinking, onThinkingChange,
}: Props) {
  const [text, setText] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);

  return (
    <div className="composer">
      <textarea
        ref={ref}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder={disabled ? "Waiting for opencode server…" : "Ask OpenCode to inspect, explain, or change this workspace."}
      />
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
          <span className="pill" onClick={onPickModel} title="Switch model (Ctrl/Cmd+M)">
            {modelLabel} ▾
          </span>
        </div>
      </div>
    </div>
  );
}
