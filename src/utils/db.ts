import { openDB } from 'idb';
import type { Message, DateMapEntry } from '../types';

export const DB_CHUNK_SIZE = 500;

export interface ChatMetadata {
	id: string;
	fileName: string;
	participants: string[];
	senderCounts: Record<string, number>;
	me: string | null;
	lastOpened: number;
	messageCount: number;
	starredMessageIds?: number[];
	dateMap?: DateMapEntry[];
	chunkCount?: number;
}

export interface ChatMessages {
	id: string;
	messages: Message[];
	dateMap: DateMapEntry[];
}

const DB_NAME = 'WhatsAppChatReaderDB';
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
	upgrade(db) {
		if (!db.objectStoreNames.contains('chat_metadata')) {
			db.createObjectStore('chat_metadata', { keyPath: 'id' });
		}
		if (!db.objectStoreNames.contains('chat_messages')) {
			db.createObjectStore('chat_messages', { keyPath: 'id' });
		}
	},
});

export async function saveChat(
	fileName: string,
	messages: Message[],
	dateMap: DateMapEntry[],
	participants: string[],
	senderCounts: Record<string, number>,
	me: string | null,
	existingId?: string,
	starredMessageIds?: number[],
): Promise<string> {
	const db = await dbPromise;
	const id = existingId || crypto.randomUUID();
	const lastOpened = Date.now();
	const messageCount = messages.length;
	const chunkCount = Math.ceil(messages.length / DB_CHUNK_SIZE);

	const metadata: ChatMetadata = {
		id,
		fileName,
		participants,
		senderCounts,
		me,
		lastOpened,
		messageCount,
		starredMessageIds: starredMessageIds || [],
		dateMap,
		chunkCount,
	};

	const tx = db.transaction(['chat_metadata', 'chat_messages'], 'readwrite');
	const metadataStore = tx.objectStore('chat_metadata');
	const messagesStore = tx.objectStore('chat_messages');

	await metadataStore.put(metadata);

	// Store each chunk as a separate record in chat_messages
	for (let i = 0; i < chunkCount; i++) {
		const chunkMessages = messages.slice(
			i * DB_CHUNK_SIZE,
			(i + 1) * DB_CHUNK_SIZE,
		);
		await messagesStore.put({
			id: `${id}_${i}`,
			messages: chunkMessages,
			dateMap: [], // Empty dateMap for chunks to satisfy types
		});
	}

	// Delete any legacy single-record message store entry
	await messagesStore.delete(id);

	await tx.done;
	return id;
}

export async function getChatMetadata(
	id: string,
): Promise<ChatMetadata | undefined> {
	const db = await dbPromise;
	return db.get('chat_metadata', id);
}

export async function getChatChunk(
	chatId: string,
	chunkIndex: number,
): Promise<Message[] | undefined> {
	const db = await dbPromise;
	const result = await db.get('chat_messages', `${chatId}_${chunkIndex}`);
	return result ? result.messages : undefined;
}

export async function getChatMessages(
	id: string,
): Promise<ChatMessages | undefined> {
	const db = await dbPromise;

	// Check if legacy single-record exists
	const legacy = await db.get('chat_messages', id);
	if (legacy) {
		return legacy;
	}

	// Otherwise, load metadata to find chunks
	const metadata = await getChatMetadata(id);
	if (!metadata?.chunkCount) return undefined;

	const chunkPromises: Promise<Message[] | undefined>[] = [];
	for (let i = 0; i < metadata.chunkCount; i++) {
		chunkPromises.push(getChatChunk(id, i));
	}

	const chunks = await Promise.all(chunkPromises);
	const messages: Message[] = [];
	for (const chunk of chunks) {
		if (chunk) {
			messages.push(...chunk);
		}
	}

	return {
		id,
		messages,
		dateMap: metadata.dateMap || [],
	};
}

export async function listChats(): Promise<ChatMetadata[]> {
	const db = await dbPromise;
	const results = (await db.getAll('chat_metadata')) || [];
	// Sort by lastOpened descending (newest first)
	return results.sort((a, b) => b.lastOpened - a.lastOpened);
}

export async function updateChatMetadata(
	id: string,
	patch: Partial<ChatMetadata>,
): Promise<void> {
	const metadata = await getChatMetadata(id);
	if (!metadata) throw new Error('Chat not found');
	const db = await dbPromise;
	await db.put('chat_metadata', { ...metadata, ...patch });
}

export async function deleteChat(id: string): Promise<void> {
	const db = await dbPromise;
	const metadata = await getChatMetadata(id);
	const chunkCount = metadata?.chunkCount || 0;

	const tx = db.transaction(['chat_metadata', 'chat_messages'], 'readwrite');
	const metadataStore = tx.objectStore('chat_metadata');
	const messagesStore = tx.objectStore('chat_messages');

	await metadataStore.delete(id);
	await messagesStore.delete(id);

	// Delete all chunks too!
	for (let i = 0; i < chunkCount; i++) {
		await messagesStore.delete(`${id}_${i}`);
	}

	await tx.done;
}
