import { useState, useEffect, useCallback } from 'react';
import {
	listChats,
	deleteChat as dbDeleteChat,
	renameChat as dbRenameChat,
	type ChatMetadata,
} from '../utils/db';

export function useChatPersistence() {
	const [savedChats, setSavedChats] = useState<ChatMetadata[]>([]);

	const loadSavedChats = useCallback(() => {
		listChats()
			.then(setSavedChats)
			.catch((err) => console.error('Failed to load saved chats:', err));
	}, []);

	useEffect(() => {
		loadSavedChats();
	}, [loadSavedChats]);

	const deleteChat = useCallback(
		async (id: string) => {
			if (
				window.confirm(
					'Are you sure you want to permanently delete this saved chat log?',
				)
			) {
				try {
					await dbDeleteChat(id);
					loadSavedChats();
				} catch (err) {
					console.error('Failed to delete saved chat:', err);
					alert('Failed to delete saved chat.');
				}
			}
		},
		[loadSavedChats],
	);

	const renameChat = useCallback(
		async (id: string, newName: string) => {
			try {
				await dbRenameChat(id, newName);
				loadSavedChats();
			} catch (err) {
				console.error('Failed to rename saved chat:', err);
				alert('Failed to rename saved chat.');
			}
		},
		[loadSavedChats],
	);

	return {
		savedChats,
		loadSavedChats,
		deleteChat,
		renameChat,
	};
}
