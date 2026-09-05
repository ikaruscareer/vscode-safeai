# Changelog

All notable changes to SafeAI for VS Code are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-05

### Added

- **CLI discovery and version validation** — extension checks for `safeai` binary and Python module on activation, warns if CLI version is below v2.0.
- **Python module fallback** — automatically uses `python -m safeai` when the `safeai` binary is not on PATH.
- **Sidebar tree view** — dedicated SafeAI panel in the activity bar with findings grouped by severity (critical → info), expandable nodes, and click-to-navigate.
- **Code actions** — quick-fix lightbulb for findings with `remediation` text; opens documentation links in browser.
- **Status bar indicator** — shield icon with per-severity finding counts; tooltip shows full breakdown and trust score.
- **Auto-scan on file save** — configurable debounce, glob-based file filtering, respects trusted workspace requirement.
- **Trust score extraction** — parses `trustScore` / `trust_score` from CLI JSON output and displays in status bar tooltip and output channel.
- **Severity threshold filtering** — `safeai.severityThreshold` setting to hide findings below a chosen severity.
- **Configurable scan timeout** — `safeai.timeout` setting (default 120s) prevents runaway scans.
- **Five new commands** — `safeai.refresh`, `safeai.openSettings`, `safeai.showRemediation`, in addition to existing scan/clear.
- **Seven configuration settings** — `cliPath`, `pythonPath`, `severityThreshold`, `extraArgs`, `timeout`, `autoScan`, `autoScanDebounce`, `scanOnSavePatterns`.
- **Summary object** — parser now produces `SafeAiScanResult.summary` with `totalFindings`, `bySeverity` breakdown, and optional `trustScore`.
- **Clickable documentation links** — diagnostics with `documentationUrl` open the docs in browser on click.
- **End-range diagnostics** — findings with `endLine`/`endColumn` show proper range highlighting.
- **Comprehensive tests** — 25+ test cases across CLI parsing, runner command building, parser edge cases, config logic, and diagnostics.

### Fixed

- **CLI interface mismatch** — extension now uses `safeai scan <target> --json <tmpfile>` instead of the non-existent `--format json` flag.
- **`cwd` for file scans** — process `cwd` is now the parent directory of the scanned file, not the file itself.
- **Path traversal validation** — diagnostics now use `path.resolve()` normalization to handle Windows drive letters and UNC paths correctly.
- **Temp file lifecycle** — JSON output written to `os.tmpdir()` with guaranteed cleanup in `finally` block, even on error or cancellation.

### Changed

- **Activation model** — changed from `onCommand` to `onStartupFinished` to register tree view and status bar immediately.
- **Extension entry point** — rewritten with CLI discovery on startup, auto-scan wiring, configuration change listener.
- **Diagnostics publisher** — now groups findings by URI before setting, supports documentation links and end ranges.
- **Package version** — bumped to 0.2.0.

## [0.1.0] - 2026-01-01

### Added

- Initial extension scaffold with local SafeAI CLI execution and Problems panel diagnostics.
- Commands: Scan Workspace, Scan Current File, Clear Results.
- Configuration: `cliPath`, `pythonPath`, `severityThreshold`, `extraArgs`.
- Trusted workspace enforcement.
- JSON parser for SafeAI output with severity mapping.
