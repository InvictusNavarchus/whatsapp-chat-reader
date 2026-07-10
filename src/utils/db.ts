import type { Message, DateMapEntry } from '../types';

export interface ChatMetadata {
	id: string;
	fileName: string;
	participants: string[];
	senderCounts: Record<string, number>;
	me: string | null;
	lastOpened: number;
	messageCount: number;
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
): Promise<string> {
	const db = await openDB();
	const id = existingId || crypto.randomUUID();
	const lastOpened = Date.now();
	const messageCount = messages.length;

	const metadata: ChatMetadata = {
		id,
		fileName,
		participants,
		senderCounts,
		me,
		lastOpened,
		messageCount,
	};

	const chatMessages: ChatMessages = {
		id,
		messages,
		dateMap,
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
		messagesStore.put(chatMessages);
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

export async function getChatMessages(
	id: string,
): Promise<ChatMessages | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('chat_messages', 'readonly');
		const store = transaction.objectStore('chat_messages');
		const request = store.get(id);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
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

export async function deleteChat(id: string): Promise<void> {
	const db = await openDB();
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
	});
}
