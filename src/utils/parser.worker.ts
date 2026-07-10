import { parseWhatsAppChat } from './parser';
import { buildDateMap, computeSenderStats } from './aggregate';

self.onmessage = (e: MessageEvent<{ text: string }>) => {
	try {
		const { text } = e.data;

		// Phase 1: parse messages (0% to 85% of total loading work)
		const messages = parseWhatsAppChat(text, (progress) => {
			const scaledProgress = Math.round(progress * 0.85);
			self.postMessage({ type: 'progress', progress: scaledProgress });
		});

		// Phase 2: compute date map and unique participants in worker (85% to 100%)
		self.postMessage({ type: 'progress', progress: 90 });

		const dateMap = buildDateMap(messages);
		const { participants, senderCounts } = computeSenderStats(messages);

		self.postMessage({ type: 'progress', progress: 100 });

		self.postMessage({
			type: 'complete',
			messages,
			dateMap,
			participants,
			senderCounts,
		});
	} catch (error) {
		self.postMessage({
			type: 'error',
			error: error instanceof Error ? error.message : String(error),
		});
	}
};
