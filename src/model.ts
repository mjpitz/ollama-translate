import { Message, ModelResponse, Ollama } from 'ollama';

// I used a llama3.2 chat to help craft this system prompt template.
const systemPrompt = (language: string) => `
You are an expert linguist capable of translating a variety of languages into ${language},
priortizing native fluency and technical terminology accuracy. Translate the provided text into
${language}. The input to the system will be a source code comment. The output should be plain
text only, without any formatting or markup.
`;

export interface ModelProps {
    language?: string,
    model?: string,
    host?: string,
}

// The Model class provides an interface for interacting with the underlying Ollama model. This
// class makes it easy to test the ollama integration in an isolated way and ensure errors are
// handled accordingly.
export default class Model {
    private language: string;
    private model: string;
    private ollama: Ollama;

    constructor(props?: ModelProps) {
        this.language = props?.language || 'English';
        this.model = props?.model || 'mistral-small:latest';
        this.ollama = new Ollama({ host: props?.host });
    }

    // stat attempts to locate the underlying model. If an error occurs, then the promise is
    // rejected with the associated error. If the model is not found, then the promise is rejected
    // without an error message. The promise is only resolved when a matching model is found.
    async stat(): Promise<ModelResponse> {
        const resp = await this.ollama.list()

        const found = resp.models.find((val) => val.name === this.model);
        if (!found) {
            return Promise.reject();
        }

        return found;
	}

    // pull attempts to fetch the model from the Ollama registry.
	async pull(): Promise<void> {
        const resp = await this.ollama.pull({
            model: this.model,
            stream: true,
        });

        for await (const part of resp) {
            console.log(part);
        }

        return
	}

    // translate uses the underlying model to translate text
	async translate(text: string): Promise<string> {
        const messages: Message[] = [
            {role: 'system', content: systemPrompt(this.language)},
            {role: 'user', content: text},
        ];

        const resp = await this.ollama.chat({
            model: this.model,
            messages: messages,
        });

        return resp.message.content;
	}

    // be sure to free streams when appropriate
    abort(): void {
        this.ollama.abort();
    }
}
