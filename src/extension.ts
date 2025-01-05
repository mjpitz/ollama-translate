import * as vscode from 'vscode';
import Model from './model';
import Configuration from './configuration';

// This regular expression attempts to identify comments in code. It works OK for a prototype, but isn't great for a
// production environment. It supports a number of different comment styles, but can misidentify source code as a
// comment (for example, think of an HTTP URL).
const COMMENT = /(\/{2,}|#+)\s*(.*)/;

const DECORATION = vscode.window.createTextEditorDecorationType({
	dark: {
		border: '1px dashed silver',
		borderRadius: '2px',
	},
});

async function translate(model: Model, text: string, range: vscode.Range): Promise<vscode.DecorationOptions> {
	const translated = await model.translate(text);

	return {
		range,
		hoverMessage: translated,
	};
}

async function updateDecorations(model: Model): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	if (!Configuration.enabled) {
		editor.setDecorations(DECORATION, []);
		return
	}
	
	const queue: Promise<vscode.DecorationOptions>[] = [];

	let buffer: string[] = [];
	let start: vscode.Position|null = null;
	let end: vscode.Position|null = null;

	editor.document.getText()
		.split("\n")
		.forEach((line, lineno) => {
			let match = COMMENT.exec(line);
			if (match === null) {
				return;
			}

			const char = line.indexOf(match[0].trimStart());

			if (start == null || end == null) {
				start = new vscode.Position(lineno, char);
				end = new vscode.Position(lineno, line.length);
				
			} else if (char === start.character && lineno === (1 + end.line)) {
				end = new vscode.Position(lineno, line.length);

			} else {
				const range = new vscode.Range(start, end);

				queue.push(translate(model, buffer.join("\n"), range));

				buffer = [];
				start = new vscode.Position(lineno, char);
				end = new vscode.Position(lineno, line.length);
			}

			// only push the comment text onto the buffer
			buffer.push(match[2]);
		});

	if (start != null && end != null) {
		const range = new vscode.Range(start, end);
		
		queue.push(translate(model, buffer.join("\n"), range));
	}

	const decorations = await Promise.all(queue);

	editor.setDecorations(DECORATION, decorations);
}

// Bootstrap VS-Code Extension

let model: Model;

export function activate(context: vscode.ExtensionContext) {
	model = new Model(Configuration);
	
	[
		vscode.workspace.onDidChangeConfiguration(() => {
			model.reload();

			return updateDecorations(model);
		}),

		vscode.workspace.onDidOpenTextDocument(() => updateDecorations(model)),
		vscode.workspace.onDidSaveTextDocument(() => updateDecorations(model)),

		vscode.commands.registerCommand('ollama-translate.enable', () => { Configuration.enabled = true }),
		vscode.commands.registerCommand('ollama-translate.disable', () => { Configuration.enabled = false }),
		vscode.commands.registerCommand('ollama-translate.translate', () => updateDecorations(model)),

	].forEach((disposable) => {
		context.subscriptions.push(disposable);
	});
}

export function deactivate() {
	model?.abort();
}
