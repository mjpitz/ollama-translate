import { Message, Ollama } from 'ollama';
import Configuration from './configuration';

// I used a llama3.2 chat to help craft this system prompt template.
const systemPrompt = (language: string) => `
You are an expert linguist capable of translating a variety of languages into ${language},
priortizing native fluency and technical terminology accuracy. Translate the provided text into
${language}. The input to the system will be a source code comment. The output should be plain
text only, without any formatting or markup. You must preserve the general formatting of the
input text.
`;

// The Model class provides an interface for interacting with the underlying Ollama model. This
// class makes it easy to test the ollama integration in an isolated way and ensure errors are
// handled accordingly.
export default class Model {
    private readonly config: typeof Configuration;

    private ollama: Promise<Ollama>;
    private cache: { [key: string]: string } = {};

    constructor(config: typeof Configuration) {
        this.config = config;

        this.ollama = this.refresh();
    }

    private async refresh(): Promise<Ollama> {
        const ollama = new Ollama({ host: this.config.ollama.address });

        const resp = await ollama.list();
        const found = resp.models.find((val) => val.name === this.config.ollama.model);
        if (!found) {
            await ollama.pull({ model: this.config.ollama.model });
        }

        return ollama;
    }

    reload(): void {
        this.refresh()
            .then((ollama) => {
                this.ollama = Promise.resolve(ollama);
            });
    }

	async translate(text: string): Promise<string> {
        if (this.cache[text]) {
            return this.cache[text];
        }

        const ollama = await this.ollama;

        const messages: Message[] = [
            {role: 'system', content: systemPrompt(this.config.language)},
            {role: 'user', content: text},
        ];

        const resp = await ollama.chat({
            model: this.config.ollama.model,
            messages: messages,
        });

        this.cache[text] = resp.message.content;

        return resp.message.content;
	}

    // be sure to free streams when appropriate
    abort(): void {
        this.ollama.then((ollama) => ollama.abort());
    }
}
