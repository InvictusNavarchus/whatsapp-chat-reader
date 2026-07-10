import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	listChats,
	deleteChat as dbDeleteChat,
	updateChatMetadata,
} from '../utils/db';

export function useChatPersistence() {
	const queryClient = useQueryClient();

	// Fetch saved chats using React Query
	const { data: savedChats = [] } = useQuery({
		queryKey: ['savedChats'],
		queryFn: listChats,
	});

	const loadSavedChats = () => {
		queryClient.invalidateQueries({ queryKey: ['savedChats'] });
	};

	const deleteMutation = useMutation({
		mutationFn: dbDeleteChat,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['savedChats'] });
		},
	});

	const renameMutation = useMutation({
		mutationFn: ({ id, newName }: { id: string; newName: string }) =>
			updateChatMetadata(id, { fileName: newName }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['savedChats'] });
		},
	});

	const deleteChat = async (id: string) => {
		if (
			window.confirm(
				'Are you sure you want to permanently delete this saved chat log?',
			)
		) {
			try {
				await deleteMutation.mutateAsync(id);
			} catch (err) {
				console.error('Failed to delete saved chat:', err);
				alert('Failed to delete saved chat.');
			}
		}
	};

	const renameChat = async (id: string, newName: string) => {
		try {
			await renameMutation.mutateAsync({ id, newName });
		} catch (err) {
			console.error('Failed to rename saved chat:', err);
			alert('Failed to rename saved chat.');
		}
	};

	return {
		savedChats,
		loadSavedChats,
		deleteChat,
		renameChat,
	};
}
