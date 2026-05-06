# Contributing

Thanks for your interest in OpenCode UI.

## Workflow

The `main` branch is protected. All changes land through pull requests.

1. **Fork** this repository to your own GitHub account.
2. **Clone** your fork and create a feature branch:
   ```bash
   git checkout -b my-feature
   ```
3. **Make your changes.** Keep PRs focused — one logical change per PR.
4. **Build and test locally** before pushing:
   ```bash
   npm install
   npm run build
   ```
   Then press **F5** in VS Code to launch an Extension Development Host and verify your change.
5. **Push to your fork** and open a pull request against this repo's `main`.

PRs are reviewed and merged by the maintainer. Direct pushes to `main` are not accepted.

## What makes a good PR

- A clear title describing the change.
- A short description of **what** changed and **why**.
- Screenshots or a short clip for any UI-visible change.
- No unrelated reformatting — keep the diff small.

## Reporting bugs

Open a [GitHub issue](../../issues) with:

- VS Code version, OS, and `opencode --version`.
- Steps to reproduce.
- Relevant output from the **OpenCode** output channel (View → Output → OpenCode).

## Security issues

Please do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md).
