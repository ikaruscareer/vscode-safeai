# SafeAI for Visual Studio Code

Offline-first security and governance scanning for AI-agent codebases.

SafeAI for VS Code runs the local [SafeAI CLI](https://pypi.org/project/SafeAI-Static-Analyzer/) and surfaces AI-agent security and governance findings directly in the editor. Source code and scan data never leave your machine.

## Why SafeAI

Traditional SAST tools do not understand AI agent frameworks, MCP configurations, prompt injection surfaces, or capability escalation patterns. SafeAI is purpose-built for AI application security: it detects shell access, filesystem exposure, MCP misconfigurations, governance gaps, and 19 capability categories across 16 frameworks — all statically, at rest, before deployment.

## Features

- **Workspace & File Scanning** — scan entire workspace or the active editor file
- **Problems Panel** — findings appear as VS Code diagnostics with severity, rule ID, and clickable links to documentation
- **Sidebar Tree View** — dedicated SafeAI panel in the activity bar, grouping findings by severity with expand/collapse
- **Code Actions** — quick-fix lightbulb suggestions for findings that include remediation guidance
- **Status Bar** — real-time scan status indicator with per-severity finding counts and trust score tooltip
- **Auto-Scan on Save** — configurable automatic scanning with glob-based file filtering and debounce
- **Trust Score** — extracts and displays the SafeAI 0–100 trust score when available in CLI output
- **CLI Health Checks** — validates CLI availability and minimum version (v2.0+) on activation
- **Python Module Fallback** — automatically uses `python -m safeai` when the `safeai` binary is not on PATH
- **Severity Threshold Filtering** — configures which severities appear in diagnostics
- **Configurable Timeout** — prevents runaway scans from blocking the editor

## Requirements

1. **Python 3.11+** with SafeAI installed:
   ```bash
   pip install SafeAI-Static-Analyzer
   ```
2. Ensure `safeai` is on your `PATH`, or configure `safeai.cliPath` in VS Code settings.

The extension requires **SafeAI CLI v2.0+** for full feature support. If an older version is detected, a warning notification appears. The extension will still attempt to function but some fields (trust score, scorecard) may not be available.

## Quick Start

1. Install the extension from the VS Code Marketplace (or sideload the `.vsix`)
2. Install the SafeAI CLI: `pip install SafeAI-Static-Analyzer`
3. Open a workspace containing AI agent code
4. Run **SafeAI: Scan Workspace** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
5. View findings in the Problems panel and the SafeAI sidebar

## Commands

| Command | ID | Description |
|---------|----|-------------|
| **SafeAI: Scan Workspace** | `safeai.scanWorkspace` | Scan the first open workspace folder |
| **SafeAI: Scan Current File** | `safeai.scanCurrentFile` | Scan the active editor file |
| **SafeAI: Clear Results** | `safeai.clearResults` | Remove all SafeAI diagnostics and reset status bar |
| **SafeAI: Refresh Results** | `safeai.refresh` | Re-run workspace scan |
| **SafeAI: Open Settings** | `safeai.openSettings` | Open the SafeAI configuration section in Settings |

Commands are available in the Command Palette and in the SafeAI sidebar title bar.

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `safeai.cliPath` | string | `safeai` | Path to the SafeAI executable. Leave empty to fall back to `python -m safeai`. |
| `safeai.pythonPath` | string | `python` | Python executable used when the `safeai` binary is unavailable. |
| `safeai.severityThreshold` | `low` / `medium` / `high` / `critical` | `low` | Minimum severity level to display in diagnostics. Findings below this threshold are ignored. |
| `safeai.extraArgs` | string[] | `[]` | Additional arguments passed to the SafeAI CLI on every scan invocation. |
| `safeai.timeout` | number | `120000` | Maximum scan duration in milliseconds. Scans exceeding this are killed. |
| `safeai.autoScan` | boolean | `false` | Enable automatic workspace scanning when files are saved. |
| `safeai.autoScanDebounce` | number | `1000` | Delay in milliseconds before triggering an auto-scan after a file save. |
| `safeai.scanOnSavePatterns` | string[] | `["**/*"]` | Glob patterns matching files that should trigger an auto-scan on save. |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  VS Code                                                │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Tree View │  │ Problems │  │ Status   │              │
│  │ (sidebar) │  │  Panel   │  │ Bar      │              │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘              │
│        │              │              │                   │
│  ┌─────┴──────────────┴──────────────┴────┐              │
│  │           extension.ts                  │              │
│  │   (activate, commands, event wiring)    │              │
│  └─────────────────┬──────────────────────┘              │
│                    │                                     │
│  ┌─────────────────┴──────────────────────┐              │
│  │         safeai/runner.ts               │              │
│  │   spawn CLI → write JSON → parse       │              │
│  └─────────────────┬──────────────────────┘              │
│                    │                                     │
│  ┌─────────────────┴──────────────────────┐              │
│  │         safeai/parser.ts               │              │
│  │   JSON → SafeAiFinding[] + summary     │              │
│  └────────────────────────────────────────┘              │
└───────────────────┬─────────────────────────────────────┘
                    │ child_process.spawn (shell: false)
                    ▼
            ┌───────────────┐
            │  safeai CLI   │
            │  (local)      │
            └───────────────┘
```

The extension is a **thin TypeScript client**. It does not reimplement any scanning rules, AST parsing, or capability detection in TypeScript. All analysis is performed by the SafeAI Python CLI, which runs entirely locally.

### Security boundaries

| Boundary | Implementation |
|----------|---------------|
| No source code leaves the machine | CLI spawned locally, JSON written to temp dir, no HTTP |
| No shell injection | All spawns use `{ shell: false }` with argument arrays |
| No telemetry | Zero network calls; all logging to local output channel |
| Trusted workspaces only | `vscode.workspace.isTrusted` gate before any scan |
| Temp file cleanup | JSON output written to `os.tmpdir()`, deleted in `finally` block |
| Path traversal guard | Normalized prefix check before setting diagnostics |

## Finding Structure

Each SafeAI finding parsed by the extension includes:

| Field | Description |
|-------|-------------|
| `ruleId` | Unique rule identifier (e.g., `SAFEAI-MCP-001`) |
| `severity` | One of: `critical`, `high`, `medium`, `low`, `info` |
| `message` | Human-readable description of the finding |
| `filePath` | Relative path to the file containing the finding |
| `line` / `column` | 1-indexed location of the finding |
| `endLine` / `endColumn` | End of the affected range (when available) |
| `remediation` | Suggested fix or mitigation guidance |
| `documentationUrl` | Link to extended documentation for the rule |
| `category` | Risk category (e.g., shell, filesystem, MCP) |
| `framework` | Detected AI framework (e.g., LangGraph, CrewAI) |

## Troubleshooting

### "SafeAI CLI not found"

The extension could not locate the `safeai` binary or Python module. Ensure:

1. SafeAI is installed: `pip install SafeAI-Static-Static-Analyzer`
2. Either `safeai` is on your PATH, or set `safeai.cliPath` to the full path
3. If using a virtual environment, set `safeai.pythonPath` to the venv's Python

### Scan times out

Default timeout is 120 seconds. For large codebases, increase `safeai.timeout`:

```json
{ "safeai.timeout": 300000 }
```

### Findings not appearing

1. Check `safeai.severityThreshold` — findings below the threshold are hidden
2. Verify the scan target contains files matching `safeai.scanOnSavePatterns`
3. Check the SafeAI output channel for error messages

### Auto-scan not triggering

1. Enable it: `safeai.autoScan = true`
2. Ensure your saved file matches a pattern in `safeai.scanOnSavePatterns`
3. Only one scan runs at a time — concurrent saves are debounced

### Using with virtual environments

Set both paths explicitly:

```json
{
  "safeai.cliPath": "/path/to/venv/bin/safeai",
  "safeai.pythonPath": "/path/to/venv/bin/python"
}
```

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run linter
npm run lint

# Run tests
npm test

# Package extension
npm run package
```

Press **F5** in VS Code to start an Extension Development Host with the extension loaded.

### Project structure

```
src/
  extension.ts              Entry point, command/event wiring
  config.ts                 Typed configuration helpers
  safeai/
    types.ts                Finding, ScanResult, CliInfo types
    cli.ts                  CLI discovery, version validation
    runner.ts               Process spawning, temp file management
    parser.ts               JSON output parsing (v2 schema)
  ui/
    diagnostics.ts          Problems panel publishing
    treeView.ts             Sidebar tree data provider
    codeActions.ts          Quick-fix code actions
    statusBar.ts            Status bar indicator
test/
  cli.test.ts               CLI version parsing tests
  runner.test.ts            Command building tests
  parser.test.ts            JSON parsing tests (15 cases)
  config.test.ts            Severity threshold tests
  diagnostics.test.ts       Finding data validation tests
```

## Publishing

1. Create an Azure DevOps Marketplace publisher
2. Authenticate: `npx @vscode/vsce login <publisher>`
3. Package: `npm run package`
4. Validate the `.vsix` in a clean VS Code window
5. Publish: `npx @vscode/vsce publish`

## Security Policy

See [SECURITY.md](SECURITY.md) for vulnerability reporting and the extension's security model.

## License

Apache-2.0
