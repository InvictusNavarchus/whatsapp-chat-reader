import type { Message, DateMapEntry } from '../types';

export interface SenderStats {
	participants: string[];
	senderCounts: Record<string, number>;
}

/**
 * Builds a chronological map of dates and their message counts from a list of messages.
 */
export function buildDateMap(messages: Message[]): DateMapEntry[] {
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

	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		if (!msg.timestamp) continue;

		// Convert to Date if needed, ensuring safety
		const t =
			msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
		if (Number.isNaN(t.getTime())) continue;

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

	return dateMap;
}

/**
 * Computes the unique participants and their message counts from a list of messages.
 */
export function computeSenderStats(messages: Message[]): SenderStats {
	const senders = new Set<string>();
	const counts: Record<string, number> = {};

	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];

		if (!msg.isSystem && msg.sender !== 'System') {
			senders.add(msg.sender);
			counts[msg.sender] = (counts[msg.sender] || 0) + 1;
		}
	}

	return {
		participants: Array.from(senders),
		senderCounts: counts,
	};
}
