import { useCallback } from 'react';
import { type NavMode, useChatStore } from '../store/useChatStore';

export function useSearchAndJump() {
	const setJumpToIndex = useChatStore((state) => state.setJumpToIndex);
	const setActiveIndex = useChatStore((state) => state.setActiveIndex);
	const setNavMode = useChatStore((state) => state.setNavMode);
	const closeAllPanels = useChatStore((state) => state.closeAllPanels);

	/**
	 * Jump to a message. `source` marks which result list the jump came from,
	 * so the navigator can step through it. Calendar jumps pass none but still
	 * move the anchor, so prev/next continue from the new position.
	 */
	const jumpToMessage = useCallback(
		(index: number, source?: NavMode) => {
			setJumpToIndex(index);
			setActiveIndex(index);
			if (source) setNavMode(source);
			// Phones can't show the chat beside the panel. Close it so the jump
			// is visible; the result navigator takes over from here.
			if (window.matchMedia('(max-width: 767px)').matches) {
				closeAllPanels();
			}
		},
		[setJumpToIndex, setActiveIndex, setNavMode, closeAllPanels],
	);

	return { jumpToMessage };
}
