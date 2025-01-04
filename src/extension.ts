import * as vscode from 'vscode';
import Model from './model';
import Configuration from './configuration';

type Status = 'loading'|'pulling'|'ready'|'failed';

interface ExtensionProps {
	model: Model,
}

// Extension mostly provides state-machine mechanics surrounding the underlying model and binds
// operations to changes in the user interface.
class Extension {
	private status: Status = 'loading';
	private failed: Error|null = null;
	private model: Model;

	constructor({ model }: ExtensionProps) {
		this.model = model;
		
		this.load();
	}

	abort(): void {
		this.model.abort();
	}

	private load(): void {
		this.model.stat()
			.then(() => {
				this.status = 'ready';
				vscode.window.showInformationMessage('Model ready for use.');
			})
			.catch((err) => {
				if (err) {
					vscode.window.showErrorMessage(`Failed to check for model: ${err.Message}`);
				} else {
					this.pull();
				}
			});
	}

	stat(): void {
		let message: string;

		switch (this.status) {
			case 'loading':
				message = 'Checking for an existing model.';
				break;
			case 'pulling':
				message = 'Updating to a newer version of the model.';
				break;
			case 'failed':
				message = this.failed?.message || 'Model update failed.';
				break;
			case 'ready':
				message = 'Model ready for use.';
				break;
			default:
				message = `Unrecognized status: ${this.status}`;
				break;
		}

		vscode.window.showInformationMessage(message);
	}

	pull(): void {
		if (this.status == 'pulling') {
			return;
		}

		this.status = 'pulling';
		vscode.window.showInformationMessage('Updating to a newer version of the model.');

		this.model.pull()
			.then(() => {
				this.status = 'ready'
				vscode.window.showInformationMessage('Model ready for use.');
			})
			.catch((err) => {
				this.status = 'failed';
				this.failed = err;
				
				vscode.window.showErrorMessage(`Failed to update model: ${err.message}`);
			});
	}

	async translate() {
		switch (this.status) {
			case 'loading':
			case 'pulling':
				vscode.window.showInformationMessage('Updating model, please wait.');
				return;
			case 'failed':
				vscode.window.showErrorMessage(`Failed to update model: ${this.failed?.message || ''}`);
				return;
			case 'ready':
				break;
			default:
				console.log(`Unhandled status: ${this.status}`);
				return;
		}

		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		const document = editor.document;
		const selection = editor.selection;

		const text = document.getText(selection);
		if (!text) {
			return;
		}

		try {
			const translated = await this.model.translate(text);

			// TODO: replace with annotations
			editor.edit(builder => {
				builder.replace(selection, translated);
			});
		} catch (err: any) {
			vscode.window.showErrorMessage(`Failed to translate text: ${err?.message || ''}`);
		}
	}
}

// Bootstrap VS-Code Extension

let extension: Extension;

export function activate(context: vscode.ExtensionContext) {
	extension = new Extension({
		model: new Model({
			language: Configuration.language,
			model: Configuration.model,
			host: Configuration.address,
		}),
	});

	[
		vscode.commands.registerCommand('ollama-translate.stat', () => extension.stat()),
		vscode.commands.registerCommand('ollama-translate.pull', () => extension.pull()),
		vscode.commands.registerCommand('ollama-translate.translate', () => extension.translate()),
		vscode.commands.registerCommand('ollama-translate.reload', () => {
			extension?.abort();

			extension = new Extension({
				model: new Model({
					language: Configuration.language,
					model: Configuration.model,
					host: Configuration.address,
				}),
			});
		}),
	].forEach((disposable) => {
		context.subscriptions.push(disposable);
	});
}

export function deactivate() {
	extension?.abort();
}
