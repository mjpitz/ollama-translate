import * as vscode from 'vscode';
import Model from './model';
import Configuration from './configuration';
import CodeLensProvider from './codelens';

// Bootstrap VS-Code Extension

let model: Model;

export function activate(context: vscode.ExtensionContext) {
	model = new Model(Configuration);

	const codeLensProvider = new CodeLensProvider({
		config: Configuration,
	});

	[
		vscode.languages.registerCodeLensProvider("*", codeLensProvider),

		vscode.workspace.onDidChangeConfiguration(() => {
			model.reload();
			codeLensProvider.updateCodeLenses();
		}),

		vscode.workspace.onDidOpenTextDocument(() => codeLensProvider.updateCodeLenses()),
		vscode.workspace.onDidChangeTextDocument(() => codeLensProvider.updateCodeLenses()),

		vscode.commands.registerCommand('ollama-translate.enable', () => { Configuration.codelens.enabled = true }),
		vscode.commands.registerCommand('ollama-translate.disable', () => { Configuration.codelens.enabled = false }),
		vscode.commands.registerCommand('ollama-translate.translate', (text: string, range: vscode.Range) => {
			model.translate(text)
				.then((translated) => vscode.window.showInformationMessage(translated));
		}),
	].forEach((disposable) => {
		context.subscriptions.push(disposable);
	});
}

export function deactivate() {
	model?.abort();
}
