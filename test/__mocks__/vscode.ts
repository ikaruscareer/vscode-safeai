class ProxyClass {
  constructor(..._args: unknown[]) {}
}

class ProxyRange {
  constructor(public startLine: number, public startCharacter: number, public endLine: number, public endCharacter: number) {}
}

class ProxyUri {
  static file(path: string) { return { fsPath: path, scheme: 'file', toString: () => path }; }
  static parse(value: string) { return { fsPath: value, scheme: 'https', toString: () => value }; }
}

class ProxyDiagnostic {
  source?: string;
  code?: unknown;
  constructor(public range: unknown, public message: string, public severity: number) {}
}

class ProxyTreeItem {
  iconPath?: unknown;
  description?: string;
  contextValue?: string;
  command?: unknown;
  resourceUri?: unknown;
  constructor(public label: string, public collapsibleState?: number) {}
}

class ProxyCodeAction {
  diagnostics?: unknown[];
  isPreferred?: boolean;
  command?: unknown;
  constructor(public title: string, public kind?: unknown) {}
}

class ProxyMarkdownString {
  appendMarkdown(_value: string) { return this; }
}

class ProxyStatusBarItem {
  text = '';
  tooltip?: string;
  color?: unknown;
  command?: string;
  show() {}
  hide() {}
  dispose() {}
}

class ProxyOutputChannel {
  appendLine(_value: string) {}
  show(_preserveFocus?: boolean) {}
  clear() {}
  dispose() {}
}

class ProxyDiagnosticCollection {
  clear() {}
  get(_uri: unknown) { return undefined; }
  set(_uri: unknown, _diagnostics: unknown[]) {}
  dispose() {}
}

class ProxyCancellationTokenSource {
  token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() {} }) };
  cancel() {}
  dispose() {}
}

class ProxyRelativePattern {
  baseUri = { fsPath: '' };
  constructor(base: unknown, pattern: string) {
    if (base && typeof base === 'object' && 'uri' in base) {
      this.baseUri = { fsPath: (base as { uri: { fsPath: string } }).uri.fsPath };
    }
    void pattern;
  }
}

function _noop() {}

const _configStore: Record<string, unknown> = {};

const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

const ProgressLocation = {
  Notification: 15,
  Window: 10,
  SourceControl: 6,
};

const CodeActionKind = {
  QuickFix: new ProxyClass() as unknown,
  Refactor: new ProxyClass() as unknown,
};

const ThemeIcon = ProxyClass;
const ThemeColor = ProxyClass;

const workspace = {
  isTrusted: true,
  workspaceFolders: [],
  asRelativePath(_uri: unknown) { return String(_uri); },
  getConfiguration(_section?: string) {
    return {
      get<T>(key: string, defaultValue: T): T { return (_configStore[key] as T) ?? defaultValue; },
      has(_key: string) { return false; },
      inspect(_key: string) { return undefined; },
      update(_key: string, _value: unknown) { return Promise.resolve(); },
    };
  },
  onDidSaveTextDocument(_listener: unknown) { return { dispose() {} }; },
  onDidChangeConfiguration(_listener: unknown) { return { dispose() {} }; },
  createDiagnosticCollection(_id: string) { return new ProxyDiagnosticCollection(); },
  RelativePattern: ProxyRelativePattern,
};

const window = {
  showInformationMessage(_message: string, ..._args: unknown[]) { return Promise.resolve(undefined); },
  showWarningMessage(_message: string, ..._args: unknown[]) { return Promise.resolve(undefined); },
  showErrorMessage(_message: string, ..._args: unknown[]) { return Promise.resolve(undefined); },
  createOutputChannel(_name: string) { return new ProxyOutputChannel(); },
  withProgress<R>(_options: unknown, task: (progress: unknown, token: unknown) => Promise<R>) {
    return task({ report: _noop }, new ProxyCancellationTokenSource().token);
  },
  get activeTextEditor() { return undefined; },
  registerTreeDataProvider(_id: string, _provider: unknown) { return { dispose() {} }; },
  createStatusBarItem(_alignment?: number, _priority?: number) { return new ProxyStatusBarItem(); },
};

const commands = {
  registerCommand(_id: string, _callback: (...args: unknown[]) => unknown) { return { dispose() {} }; },
  executeCommand(_command: string, ..._args: unknown[]) { return Promise.resolve(undefined); },
};

const languages = {
  createDiagnosticCollection(_id: string) { return new ProxyDiagnosticCollection(); },
  registerCodeActionsProvider(_selector: unknown, _provider: unknown, _metadata?: unknown) { return { dispose() {} }; },
};

export const vscode = {
  DiagnosticSeverity,
  TreeItemCollapsibleState,
  StatusBarAlignment,
  ProgressLocation,
  CodeActionKind,
  ThemeIcon,
  ThemeColor,
  workspace,
  window,
  commands,
  languages,
  Range: ProxyRange,
  Uri: ProxyUri,
  Diagnostic: ProxyDiagnostic,
  TreeItem: ProxyTreeItem,
  CodeAction: ProxyCodeAction,
  MarkdownString: ProxyMarkdownString,
  StatusBarItem: ProxyStatusBarItem,
  OutputChannel: ProxyOutputChannel,
  DiagnosticCollection: ProxyDiagnosticCollection,
  CancellationTokenSource: ProxyCancellationTokenSource,
  RelativePattern: ProxyRelativePattern,
};

export default vscode;
