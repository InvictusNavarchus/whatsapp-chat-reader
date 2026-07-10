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

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains('chat_metadata')) {
				db.createObjectStore('chat_metadata', { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains('chat_messages')) {
				db.createObjectStore('chat_messages', { keyPath: 'id' });
			}
		};
	});
}

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
	const db = await openDB();
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

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(
			['chat_metadata', 'chat_messages'],
			'readwrite',
		);
		const metadataStore = transaction.objectStore('chat_metadata');
		const messagesStore = transaction.objectStore('chat_messages');

		transaction.onerror = () => reject(transaction.error);
		transaction.oncomplete = () => resolve(id);

		metadataStore.put(metadata);

		// Store each chunk as a separate record in chat_messages
		for (let i = 0; i < chunkCount; i++) {
			const chunkMessages = messages.slice(
				i * DB_CHUNK_SIZE,
				(i + 1) * DB_CHUNK_SIZE,
			);
			messagesStore.put({
				id: `${id}_${i}`,
				messages: chunkMessages,
				dateMap: [], // Empty dateMap for chunks to satisfy types
			});
		}

		// Delete any legacy single-record message store entry
		messagesStore.delete(id);
	});
}

export async function getChatMetadata(
	id: string,
): Promise<ChatMetadata | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('chat_metadata', 'readonly');
		const store = transaction.objectStore('chat_metadata');
		const request = store.get(id);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

export async function getChatChunk(
	chatId: string,
	chunkIndex: number,
): Promise<Message[] | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('chat_messages', 'readonly');
		const store = transaction.objectStore('chat_messages');
		const request = store.get(`${chatId}_${chunkIndex}`);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			const result = request.result;
			resolve(result ? result.messages : undefined);
		};
	});
}

export async function getChatMessages(
	id: string,
): Promise<ChatMessages | undefined> {
	const db = await openDB();

	// Check if legacy single-record exists
	const legacy = await new Promise<ChatMessages | undefined>(
		(resolve, reject) => {
			const transaction = db.transaction('chat_messages', 'readonly');
			const store = transaction.objectStore('chat_messages');
			const request = store.get(id);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		},
	);

	if (legacy) {
		return legacy;
	}

	// Otherwise, load metadata to find chunks
	const metadata = await getChatMetadata(id);
	if (!metadata || !metadata.chunkCount) return undefined;

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
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('chat_metadata', 'readonly');
		const store = transaction.objectStore('chat_metadata');
		const request = store.getAll();
		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			const results = request.result || [];
			// Sort by lastOpened descending (newest first)
			results.sort((a, b) => b.lastOpened - a.lastOpened);
			resolve(results);
		};
	});
}

export async function renameChat(
	id: string,
	newFileName: string,
): Promise<void> {
	const db = await openDB();
	const metadata = await getChatMetadata(id);
	if (!metadata) throw new Error('Chat not found');
	metadata.fileName = newFileName;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction('chat_metadata', 'readwrite');
		const store = transaction.objectStore('chat_metadata');
		const request = store.put(metadata);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

export async function updateChatMe(
	id: string,
	me: string | null,
): Promise<void> {
	const db = await openDB();
	const metadata = await getChatMetadata(id);
	if (!metadata) throw new Error('Chat not found');
	metadata.me = me;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction('chat_metadata', 'readwrite');
		const store = transaction.objectStore('chat_metadata');
		const request = store.put(metadata);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

export async function updateChatStarredMessages(
	id: string,
	starredIds: number[],
): Promise<void> {
	const db = await openDB();
	const metadata = await getChatMetadata(id);
	if (!metadata) throw new Error('Chat not found');
	metadata.starredMessageIds = starredIds;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction('chat_metadata', 'readwrite');
		const store = transaction.objectStore('chat_metadata');
		const request = store.put(metadata);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

export async function updateChatLastOpened(id: string): Promise<void> {
	const db = await openDB();
	const metadata = await getChatMetadata(id);
	if (!metadata) throw new Error('Chat not found');
	metadata.lastOpened = Date.now();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction('chat_metadata', 'readwrite');
		const store = transaction.objectStore('chat_metadata');
		const request = store.put(metadata);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

export async function deleteChat(id: string): Promise<void> {
	const db = await openDB();
	const metadata = await getChatMetadata(id);
	const chunkCount = metadata?.chunkCount || 0;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(
			['chat_metadata', 'chat_messages'],
			'readwrite',
		);
		const metadataStore = transaction.objectStore('chat_metadata');
		const messagesStore = transaction.objectStore('chat_messages');

		transaction.onerror = () => reject(transaction.error);
		transaction.oncomplete = () => resolve();

		metadataStore.delete(id);
		messagesStore.delete(id);

		// Delete all chunks too!
		for (let i = 0; i < chunkCount; i++) {
			messagesStore.delete(`${id}_${i}`);
		}
	});
}
