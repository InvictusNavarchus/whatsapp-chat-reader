import { parseWhatsAppChat } from './parser';

self.onmessage = (e: MessageEvent<{ text: string }>) => {
	try {
		const { text } = e.data;
		const messages = parseWhatsAppChat(text, (progress) => {
			self.postMessage({ type: 'progress', progress });
		});
		self.postMessage({ type: 'complete', messages });
	} catch (error) {
		self.postMessage({
			type: 'error',
			error: error instanceof Error ? error.message : String(error),
		});
	}
};
