import { useState, useCallback } from 'react';
import { useChatStore } from '../store/useChatStore';
import { updateChatStarredMessages } from '../utils/db';

export function useStarredMessages(
	chatId: string | null,
	onSaveSuccess?: () => void,
) {
	const isStarredOpen = useChatStore((state) => state.isStarredOpen);
	const setIsStarredOpen = useChatStore((state) => state.setIsStarredOpen);
	const [starredMessageIds, setStarredMessageIds] = useState<Set<number>>(
		new Set(),
	);

	const toggleStarMessage = useCallback(
		(messageId: number) => {
			setStarredMessageIds((prev) => {
				const updated = new Set(prev);
				if (updated.has(messageId)) {
					updated.delete(messageId);
				} else {
					updated.add(messageId);
				}

				if (chatId) {
					updateChatStarredMessages(chatId, Array.from(updated))
						.then(() => {
							if (onSaveSuccess) onSaveSuccess();
						})
						.catch((err) =>
							console.error('Failed to update starred messages:', err),
						);
				}

				return updated;
			});
		},
		[chatId, onSaveSuccess],
	);

	return {
		isStarredOpen,
		setIsStarredOpen,
		starredMessageIds,
		setStarredMessageIds,
		toggleStarMessage,
	};
}
