# Changelog

## 0.0.10

- Thinking on/off toggle now only appears when the current model's `variants` map exposes a disable key (`none`/`off`/`disabled`/`minimal`). Previously it showed for any reasoning-capable model and silently did nothing on providers that don't honor `thinking: false` (e.g. Big Pickle, MiniMax, Kimi, GLM, Qwen). When off, the disable variant is now sent as `model.variant` — the only wire format opencode currently honors
- Polished `task` (subagent) tool rendering — collapsible card with description, subagent type chip, and the result rendered as markdown. Strips the `<task_result>` wrapper and hides the verbose prompt + `task_id` line by default (click the header to expand)
- Polished `grep` tool rendering — pattern/path/include header with a hit count and a clean line list (replaces the raw JSON dump)
- Auto-reconnect: if the opencode server process exits unexpectedly (e.g. killed externally), the extension now retries `start()` with exponential backoff (5s → 10s → 20s → 40s → 60s, max 5 attempts) instead of staying in the stopped state. Manual stop/restart cancels the loop, and a successful reconnect resets the attempt counter

## 0.0.9

- Reasoning effort selector (low/medium/high/max) appears between the build/plan toggle and the model dropdown when the current model exposes `variants` (e.g. DeepSeek V4 Pro/Flash, MiMo V2.5, Hy3 preview, Nemotron 3 Super). Choice is persisted per model and sent as `model.variant` with each message; switching to a model without variants hides the selector and clears the saved effort
- Bug fix: empty trailing "Thinking:" blocks no longer render under assistant messages (whitespace-only reasoning parts are skipped)

## 0.0.8

- Polished `glob` tool rendering — now shows the pattern, optional path, and a clean file list with a match count (replaces the raw `{"pattern":...}` JSON dump)
- Model picker re-fetches providers each time it opens, so newly-available models appear without restarting the extension
- Star-as-default model: click ☆/★ on any model in the picker to set it as the persistent default; new sessions auto-select the starred model on startup. Replaces the manual `opencode-ui.defaultModel` setting workflow
- Free model badge: models reported by opencode with zero input/output cost (or "free" in their name) now render a green "Free" chip in the picker
- API errors from opencode (e.g. `No payment method`, `CreditsError`) are no longer silent — they render as an inline error block on the offending assistant message with the status code and a clickable link, and surface as a native VSCode error notification

## 0.0.7

- Interactive `question` tool: clickable option buttons, multi-select support (`multiple: true`), Submit and Reject actions inline on the message card
- Submit is gated until every question in a batch has at least one answer (matches opencode's reply schema: one answer array per question)
- Wired to opencode HTTP API: `POST /question/{id}/reply` and `POST /question/{id}/reject`
- Subscribes to `question.asked` / `question.replied` / `question.rejected` SSE events
- Reopened editor panels rehydrate in-flight questions via `GET /question`
- Matches a pending request to its inline tool card by `state.callID`

## 0.0.6

- New rendering for the `question` tool — header chip, question text, option cards (replaces the raw JSON dump that previously appeared in chat)
- Field-name tolerant: handles `question`/`prompt`, `header`/`title`, `multiple`/`multiSelect` for compatibility with both the built-in tool and MCP variants
- New rendering for `websearch` — parses Exa-style result blocks (`Title:` / `URL:` / `Published:` / `Highlights:`) into clickable title links with date and snippet
- New rendering for `webfetch` — URL link header, italic prompt, truncated body
- README screenshot now uses a local `images/demo-session.png` path so it bundles into the VSIX

## 0.0.5

- Version bump only (no code, asset, or manifest changes)

## 0.0.4

- Added `images/demo-session.png` screenshot asset
- Added Screenshots section to README
- Updated CHANGELOG

## 0.0.3

- Added `media/icon.svg` (vector icon alongside the existing PNG)
- Version bump

## 0.0.2

- Version bump only (no code, asset, or manifest changes)

## 0.0.1 — Initial release

- Sidebar session list (filtered by current workspace folder)
- Per-session editor tabs (open chat in the main editor area)
- Live tool stream rendering: edit (red/green diff), write (blue diff), apply_patch, shell, read, todowrite
- Markdown + GFM table rendering for assistant messages
- Plan / Build mode toggle (sent as both `mode` and `agent` field for compatibility)
- Model picker per session (passed in each message body)
- Permission prompt cards (Allow once / Allow always / Reject)
- Renameable sessions (✎ icon or double-click)
- Configurable port range to support multiple workspaces side-by-side
- Animated `oc` loading glyph with rotating verbs
- Esc to abort an in-flight response
- Commands: OpenCode: Show, New Session, Restart Server, Switch Model
- Settings: `binaryPath`, `port`, `portRange`, `maxStartAttempts`, `httpProxy`, `autoStart`, `defaultModel`
