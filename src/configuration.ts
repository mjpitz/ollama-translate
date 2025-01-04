import * as vscode from 'vscode';

// Configuration encapsulates all the configuration parameters for the ollama-translate system. The
// current implementation requires a full reload in order for changes to take effect.
const Configuration = {
    get language(): string {
        return vscode.workspace.getConfiguration('ollama-translate').get('language') || 'English';
    },

    get model(): string {
        return vscode.workspace.getConfiguration('ollama-translate').get('ollamaModel') || 'mistral-small:latest';
    },

    get address(): string|undefined {
        return vscode.workspace.getConfiguration('ollama-translate').get('ollamaAddress');
    },
}

export default Configuration;
