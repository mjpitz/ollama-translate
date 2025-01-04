import * as vscode from 'vscode';
import Model from './model';
import Configuration from './configuration';

// This regular expression attempts to identify comments in code. It works OK for a prototype, but isn't great for a
// production environment. It supports a number of different comment styles, but can misidentify source code as a
// comment (for example, think of an HTTP URL).
const COMMENT = /(\/{2,}|#+)\s*(.*)/;

export default class CodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    private readonly config: typeof Configuration;
    
    constructor({ config }: { config: typeof Configuration }) {
        this.config = config;
    }

    public updateCodeLenses() {
        this._onDidChangeCodeLenses.fire();
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        if (!this.config.codelens.enabled) {
            return [];
        }
        
        let buffer: string[] = [];
        let start: vscode.Position|null = null;
        let end: vscode.Position|null = null;
        
        const codeLenses: vscode.CodeLens[] = [];

        document.getText()
            .split("\n")
            .forEach((line, index) => {
                let match = COMMENT.exec(line);
                if (match === null) {
                    return null;
                }

                const lineno = index;
                const char = line.indexOf(match[0].trimStart());

                if (start == null || end == null) {
                    start = new vscode.Position(lineno, char);
                    end = new vscode.Position(lineno, line.length);
                    
                } else if (char === start.character && lineno === (1 + end.line)) {
                    end = new vscode.Position(lineno, line.length);
    
                } else {
                    const range = new vscode.Range(start, end);
    
                    codeLenses.push(
                        new vscode.CodeLens(range, {
                            title: "Translate",
                            command: "ollama-translate.translate",
                            arguments: [ buffer.join("\n"), range ],
                        })
                    );
    
                    buffer = [];
                    start = new vscode.Position(lineno, char);
                    end = new vscode.Position(lineno, line.length);
                }
    
                // only push the comment text onto the buffer
                buffer.push(match[2]);
            });

        if (start != null && end != null) {
            const range = new vscode.Range(start, end);

            codeLenses.push(
                new vscode.CodeLens(range, {
                    title: "Translate",
                    command: "ollama-translate.translate",
                    arguments: [ buffer.join("\n"), range ],
                })
            );
        }

        return Promise.all(codeLenses);
    }

    public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        return codeLens;
    }
}
