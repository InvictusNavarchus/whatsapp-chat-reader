import { parseWhatsAppChat } from './parser';
import type { Message, DateMapEntry } from '../types';

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

		const dateMap: DateMapEntry[] = [];
		let lastYear = -1;
		let lastMonth = -1;
		let lastDay = -1;
		let lastEntry: DateMapEntry | null = null;

		const formatter = new Intl.DateTimeFormat([], {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});

		// Identify unique participants and message counts
		const senders = new Set<string>();
		const counts: Record<string, number> = {};

		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];

			// Count senders
			if (!msg.isSystem && msg.sender !== 'System') {
				senders.add(msg.sender);
				counts[msg.sender] = (counts[msg.sender] || 0) + 1;
			}

			// Date map entry building
			if (!msg.timestamp) continue;

			const t = msg.timestamp;
			const y = t.getFullYear();
			const m = t.getMonth();
			const d = t.getDate();

			if (y === lastYear && m === lastMonth && d === lastDay && lastEntry) {
				lastEntry.count++;
			} else {
				lastYear = y;
				lastMonth = m;
				lastDay = d;
				const dateStr = formatter.format(t);
				lastEntry = {
					dateStr,
					index: i,
					count: 1,
				};
				dateMap.push(lastEntry);
			}
		}

		const participants = Array.from(senders);

		self.postMessage({ type: 'progress', progress: 100 });

		self.postMessage({
			type: 'complete',
			messages,
			dateMap,
			participants,
			senderCounts: counts,
		});
	} catch (error) {
		self.postMessage({
			type: 'error',
			error: error instanceof Error ? error.message : String(error),
		});
	}
};
