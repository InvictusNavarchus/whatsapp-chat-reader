import { useEffect, useCallback, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '../store/useChatStore';
import type { Message } from '../types';
import { getChatChunk, DB_CHUNK_SIZE } from '../utils/db';

// Module-level so its identity is stable: useQueries only re-runs `combine`
// (and returns a new reference) when a query result actually changes.
// Without it, useQueries returns a fresh array every render, which rebuilt
// the full sparse `messages` array and re-rendered every mounted chunk on
// any unrelated store update.
const combineChunkData = (
	results: { data: Message[] | undefined }[],
): (Message[] | undefined)[] => results.map((res) => res.data);

export function useChunkedMessages(chatId: string | null, step: string) {
	const queryClient = useQueryClient();
	const totalMessages = useChatStore((state) => state.totalMessages);
	const loadedChunks = useChatStore((state) => state.loadedChunks);
	const setLoadedChunks = useChatStore((state) => state.setLoadedChunks);

	const chunkCount = Math.ceil(totalMessages / DB_CHUNK_SIZE);

	// Map queries for each chunk index.
	// Only run (enable) the query if its index is inside loadedChunks.
	const chunkData = useQueries({
		queries: Array.from({ length: chunkCount }, (_, i) => ({
			queryKey: ['chat', chatId, 'chunk', i],
			queryFn: () =>
				chatId ? getChatChunk(chatId, i) : Promise.resolve(undefined),
			enabled: !!chatId && loadedChunks.has(i),
			staleTime: Infinity,
		})),
		combine: combineChunkData,
	});

	// Assemble the flat sparse array of messages from the query results
	const messages = useMemo(() => {
		if (!chatId || totalMessages === 0) return [];
		const arr = new Array<Message>(totalMessages);
		chunkData.forEach((data, i) => {
			if (data) {
				const startIdx = i * DB_CHUNK_SIZE;
				for (let j = 0; j < data.length; j++) {
					arr[startIdx + j] = data[j];
				}
			}
		});
		return arr;
	}, [chunkData, chatId, totalMessages]);

	// Mark a chunk to be loaded
	const loadChunk = useCallback(
		(index: number) => {
			const currentChunks = useChatStore.getState().loadedChunks;
			if (currentChunks.has(index)) return;
			setLoadedChunks(new Set([...currentChunks, index]));
		},
		[setLoadedChunks],
	);

	// Background prefetching of unloaded message chunks.
	useEffect(() => {
		if (!chatId || step !== 'READER' || totalMessages === 0) return;

		// Fetch the next unloaded chunk from oldest to newest, matching the
		// reader's top-down starting position.
		let targetChunkIndex = -1;
		for (let i = 0; i < chunkCount; i++) {
			if (!loadedChunks.has(i)) {
				targetChunkIndex = i;
				break;
			}
		}

		if (targetChunkIndex === -1) return;

		const timer = setTimeout(() => {
			queryClient
				.prefetchQuery({
					queryKey: ['chat', chatId, 'chunk', targetChunkIndex],
					queryFn: () => getChatChunk(chatId, targetChunkIndex),
					staleTime: Infinity,
				})
				.then(() => {
					// Once cached, enable it in loadedChunks to merge into the
					// messages list. Read the latest set: `loadedChunks` here is
					// the snapshot from when this prefetch started, and an
					// on-demand load (e.g. a jump) may have added chunks since.
					const latest = useChatStore.getState().loadedChunks;
					setLoadedChunks(new Set([...latest, targetChunkIndex]));
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
	}, [
		chatId,
		step,
		totalMessages,
		loadedChunks,
		chunkCount,
		queryClient,
		setLoadedChunks,
	]);

	// True once every chunk's data is in the cache (not merely requested).
	const isFullyLoaded = chunkData.every(Boolean);

	return {
		messages,
		isFullyLoaded,
		loadedChunks,
		setLoadedChunks,
		loadChunk,
	};
}
