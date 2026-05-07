# Changelog

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
