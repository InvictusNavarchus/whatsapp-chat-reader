import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message } from '../types';
import { getChatChunk, DB_CHUNK_SIZE } from '../utils/db';

export function useChunkedMessages(chatId: string | null, step: string) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loadedChunks, setLoadedChunks] = useState<Set<number>>(new Set());

	const currentChatIdRef = useRef<string | null>(null);
	currentChatIdRef.current = chatId;

	const fetchingChunksRef = useRef<Set<number>>(new Set());

	useEffect(() => {
		fetchingChunksRef.current.clear();
	}, [chatId]);

	const loadChunk = useCallback(
		(index: number) => {
			if (!chatId) return;

			setLoadedChunks((prev) => {
				if (prev.has(index)) return prev;

				const next = new Set(prev);
				next.add(index);

				const chatIdAtCallTime = chatId;

				// Trigger fetch asynchronously to avoid state update cycles in render
				setTimeout(() => {
					getChatChunk(chatIdAtCallTime, index)
						.then((chunkMessages) => {
							if (currentChatIdRef.current !== chatIdAtCallTime) return;
							setMessages((messagesPrev) => {
								if (messagesPrev.length === 0) return messagesPrev;
								const nextMessages = [...messagesPrev];
								const startIdx = index * DB_CHUNK_SIZE;
								if (chunkMessages) {
									for (let i = 0; i < chunkMessages.length; i++) {
										nextMessages[startIdx + i] = chunkMessages[i];
									}
								}
								return nextMessages;
							});
						})
						.catch((err) => {
							console.error(`Failed to load chunk ${index} on demand:`, err);
						});
				}, 0);

				return next;
			});
		},
		[chatId],
	);

	// Background prefetching of unloaded message chunks
	useEffect(() => {
		if (!chatId || step !== 'READER' || messages.length === 0) return;

		// Find chunks that haven't been loaded yet and are not in progress
		const unloadedChunkIndices: number[] = [];
		const chunkCount = Math.ceil(messages.length / DB_CHUNK_SIZE);
		for (let i = 0; i < chunkCount; i++) {
			if (!loadedChunks.has(i) && !fetchingChunksRef.current.has(i)) {
				unloadedChunkIndices.push(i);
			}
		}

		if (unloadedChunkIndices.length === 0) return;

		// Load the next unloaded chunk from latest to oldest
		unloadedChunkIndices.sort((a, b) => b - a);
		const targetChunkIndex = unloadedChunkIndices[0];
		const chatIdAtCallTime = chatId;

		let active = true;
		const timer = setTimeout(() => {
			fetchingChunksRef.current.add(targetChunkIndex);

			getChatChunk(chatIdAtCallTime, targetChunkIndex)
				.then((chunkMessages) => {
					if (!active || currentChatIdRef.current !== chatIdAtCallTime) return;

					setMessages((prev) => {
						if (prev.length === 0) return prev;
						const next = [...prev];
						const startIdx = targetChunkIndex * DB_CHUNK_SIZE;
						if (chunkMessages) {
							for (let i = 0; i < chunkMessages.length; i++) {
								next[startIdx + i] = chunkMessages[i];
							}
						}
						return next;
					});

					setLoadedChunks((prev) => {
						if (prev.has(targetChunkIndex)) return prev;
						const next = new Set(prev);
						next.add(targetChunkIndex);
						return next;
					});
				})
				.catch((err) => {
					console.error(
						`Failed to background load chunk ${targetChunkIndex}:`,
						err,
					);
				})
				.finally(() => {
					fetchingChunksRef.current.delete(targetChunkIndex);
				});
		}, 150); // 150ms breathing room to keep UI extremely responsive

		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [chatId, messages, step, loadedChunks]);

	return {
		messages,
		setMessages,
		loadedChunks,
		setLoadedChunks,
		loadChunk,
	};
}
