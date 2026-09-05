# Security Policy

## Reporting vulnerabilities

Please report security vulnerabilities privately through the SafeAI project's GitHub security advisory process. Do not include credentials, customer code, or exploit material in public issues.

## Extension security model

SafeAI for VS Code executes only a local SafeAI process inside a trusted workspace. It does not use shell execution, telemetry, or network uploads. CLI output is treated as untrusted input before it becomes editor diagnostics.
