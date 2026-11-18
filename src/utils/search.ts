import type { Message, SearchMatch } from '../types';

export const MIN_SEARCH_LENGTH = 2;

/**
 * Chronological list of loaded messages containing `query` (case-insensitive).
 * `messages` is sparse while DB chunks load; holes are skipped.
 */
export function findSearchMatches(
	messages: Message[],
	query: string,
): SearchMatch[] {
	if (query.trim().length < MIN_SEARCH_LENGTH) return [];
	const queryLower = query.toLowerCase();
	const results: SearchMatch[] = [];
	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		if (msg?.contentLower.includes(queryLower)) {
			results.push({ index: i, message: msg });
		}
	}
	return results;
}

/** Chronological list of loaded messages whose id is starred. */
export function findStarredMessages(
	messages: Message[],
	starredIds: Set<number>,
): SearchMatch[] {
	if (starredIds.size === 0) return [];
	const results: SearchMatch[] = [];
	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		if (msg && starredIds.has(msg.id)) {
			results.push({ index: i, message: msg });
		}
	}
	return results;
}
