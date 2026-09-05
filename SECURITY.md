# Security Policy

## Reporting vulnerabilities

Please report security vulnerabilities privately through the [SafeAI project's GitHub security advisory process](https://github.com/ikaruscareer/vscode-safeai/security/advisories/new). Do not include credentials, customer code, or exploit material in public issues.

We will acknowledge reports within 48 hours and aim to provide a remediation timeline within 7 business days.

## Extension security model

SafeAI for VS Code is designed with a minimal attack surface. The extension is a thin TypeScript client that delegates all analysis to a local Python CLI process.

### What the extension does

- Spawns a local `safeai` process using `child_process.spawn` with `{ shell: false }`
- Passes arguments as an array (never concatenated into a shell string)
- Writes CLI JSON output to a temporary file in the OS temp directory
- Parses the JSON output in TypeScript and maps it to VS Code diagnostics
- Deletes temporary files in a `finally` block after every scan

### What the extension never does

- **No network calls** — the extension makes zero HTTP requests, WebSocket connections, or DNS lookups. There is no telemetry, analytics, or phone-home behavior.
- **No source code upload** — source code is never transmitted anywhere. The CLI reads files locally; the extension only receives the JSON report.
- **No shell execution** — all process spawning uses argument arrays, not shell strings. There is no `exec`, no `execSync`, and no string interpolation into command lines.
- **No credential handling** — the extension does not read, store, or transmit API keys, tokens, or passwords.
- **No remote dependencies** — the extension has no runtime dependencies beyond `@types/vscode` and `@types/node` (both dev-only).

### Trusted workspaces

The extension checks `vscode.workspace.isTrusted` before every scan. In untrusted (restricted) workspaces, all scan commands are blocked with a warning message. The user must explicitly trust the workspace to run SafeAI scans.

### Input validation

- CLI stderr output is truncated to 2,000 characters before display in error messages
- JSON output is parsed with `JSON.parse` inside a try/catch; malformed output produces a clear error
- Findings with paths outside the workspace root are silently discarded (path traversal guard)
- Findings without a `message` field are discarded by the parser

### Temp file lifecycle

1. A unique temporary directory is created via `fs.mkdtempSync(path.join(os.tmpdir(), 'safeai-'))`
2. CLI JSON output is written to `report.json` inside that directory
3. The file is read immediately after the CLI process closes
4. Both the file and directory are deleted in a `finally` block
5. If cleanup fails (e.g., due to permissions), the OS will reclaim temp files on reboot

### Process lifecycle

- The spawned CLI process is killed if the user cancels the scan via the notification cancel button
- A configurable timeout (default 120s) kills the process if it runs too long
- stdout and stderr are capped at 10 MB each; exceeding this kills the process
- The `windowsHide: true` option prevents console window flashing on Windows

## SafeAI CLI security

The SafeAI CLI itself is an open-source Python package ([PyPI](https://pypi.org/project/SafeAI-Static-Analyzer/), [GitHub](https://github.com/ikaruscareer/SafeAI)). It:

- Runs entirely offline with no network calls
- Analyzes source code statically (never executes agent code)
- Outputs findings in structured JSON/SARIF format
- Writes to a local SQLite registry (optional, user-controlled)

The VS Code extension treats all CLI output as untrusted input before it becomes editor diagnostics.

## Vulnerability disclosure

If you discover a security issue in the extension or the CLI, please report it through the GitHub security advisory process. We will work with you to understand and address the issue before any public disclosure.
