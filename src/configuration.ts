import * as vscode from 'vscode';

// Configuration encapsulates all the configuration parameters for the ollama-translate system. The
// current implementation requires a full reload in order for changes to take effect.
const Configuration = {
    get codelens(): { enabled: boolean } {
        return {
            get enabled(): boolean {
                return !!vscode.workspace.getConfiguration('ollama-translate').get('codelensEnabled');
            },

            set enabled(val: boolean) {
                vscode.workspace.getConfiguration('ollama-translate').update('codelensEnabled', val, false);
            },
        };
    },

    get language(): string {
        return vscode.workspace.getConfiguration('ollama-translate').get('language') || 'English';
    },

    get ollama(): { model: string, address: string|undefined } {
        return {
            get model(): string {
                return vscode.workspace.getConfiguration('ollama-translate').get('ollamaModel') || 'mistral-small:latest';
            },
        
            get address(): string|undefined {
                return vscode.workspace.getConfiguration('ollama-translate').get('ollamaAddress');
            },
        }
    }
}

export default Configuration;
