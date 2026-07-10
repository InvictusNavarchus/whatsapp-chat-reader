import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '../store/useChatStore';
import type { Message } from '../types';
import { getChatChunk, DB_CHUNK_SIZE } from '../utils/db';

export function useChunkedMessages(chatId: string | null, step: string) {
	const queryClient = useQueryClient();
	const totalMessages = useChatStore((state) => state.totalMessages);
	const [loadedChunks, setLoadedChunks] = useState<Set<number>>(new Set());

	// If chatId changes, clear local loadedChunks Set
	useEffect(() => {
		setLoadedChunks(new Set());
	}, [chatId]);

	const chunkCount = Math.ceil(totalMessages / DB_CHUNK_SIZE);

	// Map queries for each chunk index.
	// Only run (enable) the query if its index is inside loadedChunks.
	const results = useQueries({
		queries: Array.from({ length: chunkCount }, (_, i) => ({
			queryKey: ['chat', chatId, 'chunk', i],
			queryFn: () => getChatChunk(chatId!, i),
			enabled: !!chatId && loadedChunks.has(i),
			staleTime: Infinity,
		})),
	});

	// Assemble the flat sparse array of messages from the query results
	const messages = useMemo(() => {
		if (!chatId || totalMessages === 0) return [];
		const arr = new Array<Message>(totalMessages);
		results.forEach((res, i) => {
			if (res.data) {
				const startIdx = i * DB_CHUNK_SIZE;
				for (let j = 0; j < res.data.length; j++) {
					arr[startIdx + j] = res.data[j];
				}
			}
		});
		return arr;
	}, [results, chatId, totalMessages]);

	// Mark a chunk to be loaded
	const loadChunk = useCallback((index: number) => {
		setLoadedChunks((prev) => {
			if (prev.has(index)) return prev;
			const next = new Set(prev);
			next.add(index);
			return next;
		});
	}, []);

	// Background prefetching of unloaded message chunks.
	useEffect(() => {
		if (!chatId || step !== 'READER' || totalMessages === 0) return;

		// Find chunks that haven't been loaded yet (i.e. not in loadedChunks)
		const unloadedChunkIndices: number[] = [];
		for (let i = 0; i < chunkCount; i++) {
			if (!loadedChunks.has(i)) {
				unloadedChunkIndices.push(i);
			}
		}

		if (unloadedChunkIndices.length === 0) return;

		// Fetch the next unloaded chunk from latest to oldest
		unloadedChunkIndices.sort((a, b) => b - a);
		const targetChunkIndex = unloadedChunkIndices[0];

		const timer = setTimeout(() => {
			queryClient
				.prefetchQuery({
					queryKey: ['chat', chatId, 'chunk', targetChunkIndex],
					queryFn: () => getChatChunk(chatId, targetChunkIndex),
					staleTime: Infinity,
				})
				.then(() => {
					// Once cached, enable it in our loadedChunks set to merge into the messages list
					setLoadedChunks((prev) => {
						if (prev.has(targetChunkIndex)) return prev;
						const next = new Set(prev);
						next.add(targetChunkIndex);
						return next;
					});
				})
				.catch((err) => {
					console.error(
						`Failed to background prefetch chunk ${targetChunkIndex}:`,
						err,
					);
				});
		}, 150); // 150ms breathing room to keep UI extremely responsive

		return () => {
			clearTimeout(timer);
		};
	}, [chatId, step, totalMessages, loadedChunks, chunkCount, queryClient]);

	return {
		messages,
		loadedChunks,
		setLoadedChunks,
		loadChunk,
	};
}
