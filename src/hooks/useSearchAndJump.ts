import { useState, useCallback } from 'react';

export function useSearchAndJump(onCloseStarred?: () => void) {
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [jumpToIndex, setJumpToIndex] = useState<number | null>(null);

	const jumpToMessage = useCallback(
		(index: number) => {
			setJumpToIndex(index);
			if (window.innerWidth < 768) {
				setIsSearchOpen(false);
				if (onCloseStarred) onCloseStarred();
			}
		},
		[onCloseStarred],
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
