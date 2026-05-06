import * as vscode from "vscode";
import { OpencodeServer } from "./server/OpencodeServer";
import { OpencodeViewProvider } from "./webview/OpencodeViewProvider";

let server: OpencodeServer | null = null;

export async function activate(ctx: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("OpenCode");
  ctx.subscriptions.push(output);

  server = new OpencodeServer(output);
  const provider = new OpencodeViewProvider(ctx, server);

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider(OpencodeViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.text = "$(sync~spin) OpenCode";
  status.command = "opencode.show";
  status.show();
  ctx.subscriptions.push(status);

  server.onStateChange(({ state, message }) => {
    if (state === "ready") status.text = "$(check) OpenCode";
    else if (state === "starting") status.text = "$(sync~spin) OpenCode";
    else if (state === "error") status.text = `$(error) OpenCode: ${message ?? "error"}`;
    else status.text = "$(circle-slash) OpenCode";
  });

  ctx.subscriptions.push(
    vscode.commands.registerCommand("opencode.show", () => provider.reveal()),
    vscode.commands.registerCommand("opencode.newSession", () =>
      vscode.commands.executeCommand("opencode.main.focus").then(() =>
        provider["handle"]({ type: "createSession" } as any)
      )
    ),
    vscode.commands.registerCommand("opencode.restartServer", () => server!.restart()),
    vscode.commands.registerCommand("opencode.switchModel", () => provider.reveal())
  );

  const cfg = vscode.workspace.getConfiguration("opencode-ui");
  if (cfg.get<boolean>("autoStart") ?? true) {
    server.start().catch((e) => output.appendLine(`[opencode] start failed: ${e.message}`));
  }

  // One-time hint: suggest moving the view to the secondary side bar (right)
  const hintKey = "opencode.movedToSecondaryHint";
  if (!ctx.globalState.get<boolean>(hintKey)) {
    const choice = await vscode.window.showInformationMessage(
      "OpenCode: drag the OpenCode view to the right side bar for the chat-style layout.",
      "Show me",
      "Don't show again"
    );
    if (choice === "Show me") {
      vscode.commands.executeCommand("workbench.action.toggleAuxiliaryBar");
      vscode.commands.executeCommand("opencode.show");
    }
    if (choice) await ctx.globalState.update(hintKey, true);
  }
}

export async function deactivate() {
  await server?.stop();
}
