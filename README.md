# OpenCode UI

A polished VS Code chat interface for the open-source [opencode](https://opencode.ai) AI coding agent. Spawns `opencode serve` in the background, talks to it over HTTP + Server-Sent Events, and renders a clean chat experience inside VS Code: a sessions sidebar, per-session editor tabs, live tool streaming with proper diff rendering, plan/build modes, a model picker, and permission prompts.

> **Status:** preview. Works on Linux, macOS, and Windows. Requires [opencode](https://opencode.ai) installed locally.

## Screenshots

![OpenCode session with todo list](https://raw.githubusercontent.com/Kephcyxar/opencode-vscode-extension/main/images/demo-session.png)

## Features

- **Sessions sidebar** — scoped to the current workspace folder. Create, rename (✎ or double-click), delete.
- **Per-session editor tabs** — click any session to open its conversation as a regular editor tab. Multiple sessions side-by-side.
- **Rich tool rendering**
  - `edit` — red/green unified diff
  - `write` — blue (all-added) diff
  - `apply_patch` — parsed multi-file patch with per-file ADD / EDIT / DELETE cards
  - `bash` / `shell` — terminal-style command + output block
  - `read` — collapsible file path header
  - `todowrite` — checkbox list with status colors
- **Markdown rendering** — bold/italic, inline code, fenced code blocks, ordered/unordered lists, headings, GFM tables.
- **Plan / Build modes** — toggle in the composer, sent as both legacy `mode` and current `agent` field.
- **Model picker** — per-session, sent in every message body so you can switch mid-conversation.
- **Permission prompts** — Allow once / Allow always / Reject for tools that require approval.
- **Animated loading glyph** — rotating verbs ("Thinking", "Pondering", "Cooking", …) with a flipping `oc` mark.
- **Esc to abort** an in-flight response.
- **Configurable port range** — open many repos at once without conflicts.

## Installation

1. Install [opencode](https://opencode.ai/docs/) on your machine. Verify with `opencode --version`.
2. Install this extension from the VS Code Marketplace.
3. Open any folder in VS Code. The extension activates on startup, spawns `opencode serve` on a free port, and the OpenCode icon appears in the activity bar.

## Quick start

1. Click the **OpenCode** icon in the left activity bar.
2. Click **+** in the SESSIONS header to create a new session.
3. Click the session row — it opens as a tab in the main editor area.
4. Pick a model from the composer footer.
5. Type, press **Enter**.

## Settings

| Key | Default | Description |
|---|---|---|
| `opencode-ui.binaryPath` | `opencode` | Path to the opencode binary. Set absolute path if it's not on `PATH`. |
| `opencode-ui.port` | `0` | Force a specific port. `0` = auto-pick. |
| `opencode-ui.portRange` | `""` | Sequential range to try when `port` is 0. Example: `"41234-41260"`. Useful for multiple repos at once. |
| `opencode-ui.maxStartAttempts` | `8` | How many ports to try before giving up. |
| `opencode-ui.httpProxy` | `""` | If set (port number or full URL), connect to an existing `opencode serve` instead of spawning. |
| `opencode-ui.autoStart` | `true` | Start the server when the extension activates. |
| `opencode-ui.defaultModel` | `""` | Default model id (currently informational). |

## Commands

- **OpenCode: Show** — focus the view
- **OpenCode: New Session**
- **OpenCode: Restart Server**
- **OpenCode: Switch Model**

## Multi-workspace setup

Each VS Code window starts its own `opencode serve`. By default each picks a random free port. If you frequently open several workspaces at once, set `opencode-ui.portRange` in your user settings:

```json
{
  "opencode-ui.portRange": "41234-41260"
}
```

The extension will sequentially try ports `41234`, `41235`, … until one binds and `opencode serve` becomes ready. Each window lands on a different port from the pool.

## Troubleshooting

- **Status bar shows `cannot reach http://127.0.0.1:NNNNN`** — check the **OpenCode** output channel (View → Output → OpenCode). Common causes: opencode binary missing, port in use, opencode crashed at startup.
- **`cannot find opencode binary 'opencode'`** — set `opencode-ui.binaryPath` to the absolute path, e.g. `/home/you/.opencode/bin/opencode` (Linux/macOS) or `C:\\Users\\you\\.opencode\\bin\\opencode.exe` (Windows).
- **Extension installed but the icon disappeared after dragging it to the panel** — Command Palette → **View: Reset View Locations**.
- **Plan mode let an edit through** — opencode's plan mode honors the agent's `tools` list. Check `~/.config/opencode/config.json`. The default plan agent should disable `edit`/`write`; if you've customized it, the extension can't override that.

## Privacy

This extension does not phone home. It only talks to your local `opencode serve` process over `127.0.0.1`. opencode itself talks to whatever model providers you've configured.

## Development

```bash
npm install
npm run build
```

Then open this folder in VS Code and press **F5** to launch the Extension Development Host.

To package and install locally:

```bash
npx vsce package --allow-missing-repository --no-dependencies
code --install-extension opencode-ui-*.vsix --force
```

## License

[MIT](LICENSE)
