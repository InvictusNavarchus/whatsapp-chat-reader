import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';

/**
 * Lets the system/browser Back button (Android back, iOS swipe) close the
 * Search/Starred panel instead of leaving the app.
 *
 * Opening a panel pushes one history entry; Back pops it and closes the panel.
 * Closing from the UI pops that entry itself so the next Back isn't wasted.
 *
 * `pushedRef` (not `history.state`) decides whether an entry is ours:
 * history.state survives a reload, and trusting it would make a fresh mount
 * call history.back() and navigate off the site. The effects also have no
 * cleanup side effects, so StrictMode's double-run is harmless.
 */
export function usePanelHistory() {
	const isPanelOpen = useChatStore((s) => s.isSearchOpen || s.isStarredOpen);
	const closeAllPanels = useChatStore((s) => s.closeAllPanels);
	const pushedRef = useRef(false);

	useEffect(() => {
		if (isPanelOpen && !pushedRef.current) {
			window.history.pushState({ panel: true }, '');
			pushedRef.current = true;
		} else if (!isPanelOpen && pushedRef.current) {
			pushedRef.current = false;
			window.history.back();
		}
	}, [isPanelOpen]);

	useEffect(() => {
		const onPopState = () => {
			// Ignore the popstate caused by our own history.back() above.
			if (!pushedRef.current) return;
			pushedRef.current = false;
			closeAllPanels();
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, [closeAllPanels]);
}
