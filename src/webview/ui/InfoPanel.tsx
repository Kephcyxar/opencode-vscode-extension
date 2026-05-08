import * as React from "react";

interface Props {
  messages: any[];
  tokenTotals: { input: number; output: number; reasoning: number; cost: number };
  model: { providerID: string; modelID: string; label: string } | null;
  modelMeta: any;
  provider: any;
  onClose: () => void;
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtCost(n: number) {
  if (n === 0) return "$0.00";
  if (n < 0.001) return `$${n.toFixed(6)}`;
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(4)}`;
}

export function InfoPanel({ messages, tokenTotals, model, modelMeta, provider, onClose }: Props) {
  const contextWindow = modelMeta?.contextWindow || modelMeta?.context_window || modelMeta?.maxTokens || null;
  const totalTokens = tokenTotals.input + tokenTotals.output + tokenTotals.reasoning;
  const contextPct = contextWindow && contextWindow > 0 ? Math.min(100, (totalTokens / contextWindow) * 100) : null;

  const inputCostPer1M = modelMeta?.cost?.input ?? null;
  const outputCostPer1M = modelMeta?.cost?.output ?? null;

  const capabilities = modelMeta?.capabilities || {};
  const capList = Object.entries(capabilities)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <div className="info-panel">
      <div className="info-panel-head">
        <span className="info-panel-title">Session Info</span>
        <button className="info-panel-close" onClick={onClose}>×</button>
      </div>
      <div className="info-panel-body">
        {model && (
          <section className="info-section">
            <div className="info-section-label">MODEL</div>
            <div className="info-row">
              <span className="info-key">Name</span>
              <span className="info-val">{model.label}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Provider</span>
              <span className="info-val">{provider?.name || provider?.id || model.providerID}</span>
            </div>
            <div className="info-row">
              <span className="info-key">ID</span>
              <span className="info-val info-mono">{model.modelID}</span>
            </div>
            {contextWindow && (
              <div className="info-row">
                <span className="info-key">Context window</span>
                <span className="info-val">{fmt(contextWindow)} tokens</span>
              </div>
            )}
            {inputCostPer1M !== null && (
              <div className="info-row">
                <span className="info-key">Input cost</span>
                <span className="info-val">${inputCostPer1M}/1M tokens</span>
              </div>
            )}
            {outputCostPer1M !== null && (
              <div className="info-row">
                <span className="info-key">Output cost</span>
                <span className="info-val">${outputCostPer1M}/1M tokens</span>
              </div>
            )}
            {capList.length > 0 && (
              <div className="info-row">
                <span className="info-key">Capabilities</span>
                <span className="info-val">{capList.join(", ")}</span>
              </div>
            )}
          </section>
        )}

        <section className="info-section">
          <div className="info-section-label">TOKENS USED THIS SESSION</div>
          <div className="info-row">
            <span className="info-key">Input</span>
            <span className="info-val">{fmt(tokenTotals.input)}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Output</span>
            <span className="info-val">{fmt(tokenTotals.output)}</span>
          </div>
          {tokenTotals.reasoning > 0 && (
            <div className="info-row">
              <span className="info-key">Reasoning</span>
              <span className="info-val">{fmt(tokenTotals.reasoning)}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-key">Total</span>
            <span className="info-val info-bold">{fmt(totalTokens)}</span>
          </div>
          {tokenTotals.cost > 0 && (
            <div className="info-row">
              <span className="info-key">Est. cost</span>
              <span className="info-val info-bold">{fmtCost(tokenTotals.cost)}</span>
            </div>
          )}
        </section>

        {contextPct !== null && (
          <section className="info-section">
            <div className="info-section-label">CONTEXT USAGE</div>
            <div className="context-bar-wrap">
              <div
                className={`context-bar-fill ${contextPct > 85 ? "danger" : contextPct > 60 ? "warn" : ""}`}
                style={{ width: `${contextPct}%` }}
              />
            </div>
            <div className="info-row" style={{ marginTop: 4 }}>
              <span className="info-key">{fmt(totalTokens)} / {fmt(contextWindow)}</span>
              <span className="info-val">{contextPct.toFixed(1)}%</span>
            </div>
          </section>
        )}

        <section className="info-section">
          <div className="info-section-label">SESSION</div>
          <div className="info-row">
            <span className="info-key">Messages</span>
            <span className="info-val">{messages.length}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
