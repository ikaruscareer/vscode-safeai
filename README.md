# SafeAI for Visual Studio Code

SafeAI for VS Code runs the local SafeAI CLI and surfaces AI-agent security and governance findings in the editor Problems panel. The extension is designed to keep source code and findings on the developer machine.

## Status

This is an initial development scaffold. The parser intentionally supports a conservative JSON adapter while the SafeAI CLI machine-output schema is finalised.

## Commands

- **SafeAI: Scan Workspace** scans the first open workspace folder.
- **SafeAI: Scan Current File** scans the active file.
- **SafeAI: Clear Results** removes SafeAI diagnostics.

## Requirements

Install SafeAI locally and ensure `safeai` is available on `PATH`, or configure `safeai.cliPath`. The extension invokes `safeai <target> --format json` without a shell.

## Development

```bash
npm install
npm run compile
npm test
npm run package
```

Press F5 in VS Code to start an Extension Development Host.

## Security and privacy

The extension runs only in trusted workspaces. It does not send files, prompts, findings, credentials, or telemetry to external services. It launches SafeAI using Node.js process spawning with argument arrays, not a shell.

## Publishing

Create an Azure DevOps Marketplace publisher, authenticate `@vscode/vsce`, then run `npx vsce publish`. Publish a tagged, reviewed release only after validating the generated `.vsix`.
