# Security Policy

## Reporting a vulnerability

If you discover a security issue in OpenCode UI, please **do not open a public GitHub issue**.

Instead, report it privately via GitHub's [private vulnerability reporting](../../security/advisories/new) for this repository.

Please include:

- A description of the issue and its impact.
- Steps to reproduce.
- The version of the extension and your OS.

You should expect an initial response within a few days. Once a fix is ready, a new version will be published to the VS Code Marketplace and the advisory will be disclosed.

## Scope

This extension runs locally and communicates only with `opencode serve` on `127.0.0.1`. It does not transmit telemetry or user data to any third party. Issues most relevant to this project include:

- Command injection via configuration values (`binaryPath`, `httpProxy`, etc.).
- Webview content rendering that could lead to script execution.
- Improper handling of permission prompts that could let a tool run without user approval.
