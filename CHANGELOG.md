# Changelog

## 0.0.4

- Add Screenshots section to README

## 0.1.0 — Initial release

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
