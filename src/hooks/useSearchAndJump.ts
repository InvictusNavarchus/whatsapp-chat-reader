import { useCallback } from 'react';
import { useChatStore } from '../store/useChatStore';

export function useSearchAndJump() {
	const isSearchOpen = useChatStore((state) => state.isSearchOpen);
	const setIsSearchOpen = useChatStore((state) => state.setIsSearchOpen);
	const searchQuery = useChatStore((state) => state.searchQuery);
	const setSearchQuery = useChatStore((state) => state.setSearchQuery);
	const jumpToIndex = useChatStore((state) => state.jumpToIndex);
	const setJumpToIndex = useChatStore((state) => state.setJumpToIndex);
	const closeAllPanels = useChatStore((state) => state.closeAllPanels);

	const jumpToMessage = useCallback(
		(index: number) => {
			setJumpToIndex(index);
			if (window.innerWidth < 768) {
				closeAllPanels();
			}
		},
		[setJumpToIndex, closeAllPanels],
	);

	return {
		isSearchOpen,
		setIsSearchOpen,
		searchQuery,
		setSearchQuery,
		jumpToIndex,
		setJumpToIndex,
		jumpToMessage,
	};
}
