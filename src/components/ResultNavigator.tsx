import { ChevronDown, ChevronUp, Search, Star, X } from 'lucide-react';
import type { SearchMatch } from '../types';
import type { NavMode } from '../store/useChatStore';

interface ResultNavigatorProps {
	mode: NavMode;
	label: string;
	items: SearchMatch[];
	activeIndex: number | null;
	onJump: (index: number) => void;
	onOpenList: () => void;
	onClose: () => void;
}

const iconButton =
	'min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-active hover:text-text-primary active:bg-surface-active disabled:opacity-35 disabled:pointer-events-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-brand touch-manipulation';

/**
 * Docked bar under the chat for stepping through search results or starred
 * messages without reopening the panel, which is full-screen on phones.
 *
 * Prev/next are relative to the last jumped-to message rather than a stored
 * position, so they keep working after a calendar jump, a new query, or
 * unstarring the current item.
 */
export default function ResultNavigator({
	mode,
	label,
	items,
	activeIndex,
	onJump,
	onOpenList,
	onClose,
}: ResultNavigatorProps) {
	const anchor = activeIndex ?? -1;
	let position = -1;
	let prev: SearchMatch | undefined;
	let next: SearchMatch | undefined;
	for (let i = 0; i < items.length; i++) {
		const idx = items[i].index;
		if (idx < anchor) prev = items[i];
		else if (idx === anchor) position = i;
		else {
			next = items[i];
			break;
		}
	}

	const Icon = mode === 'search' ? Search : Star;

	return (
		<div className="shrink-0 border-t border-border-base bg-surface px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center gap-1 font-sans z-30">
			<button
				type="button"
				onClick={onOpenList}
				className="flex-1 min-w-0 min-h-[40px] flex items-center gap-2 px-2 rounded-lg hover:bg-surface-active active:bg-surface-active transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-brand text-left touch-manipulation"
				title="Show all results"
			>
				<Icon
					className={`w-4 h-4 shrink-0 ${mode === 'starred' ? 'text-text-star fill-star' : 'text-text-tertiary'}`}
				/>
				<span className="text-sm font-medium text-text-primary truncate">
					{label}
				</span>
				<span className="ml-auto pl-1 text-xs font-mono text-text-muted shrink-0">
					{position >= 0
						? `${position + 1} / ${items.length}`
						: `${items.length}`}
				</span>
			</button>
			<button
				type="button"
				onClick={() => prev && onJump(prev.index)}
				disabled={!prev}
				className={iconButton}
				aria-label="Previous (older) result"
			>
				<ChevronUp className="w-5 h-5" />
			</button>
			<button
				type="button"
				onClick={() => next && onJump(next.index)}
				disabled={!next}
				className={iconButton}
				aria-label="Next (newer) result"
			>
				<ChevronDown className="w-5 h-5" />
			</button>
			<button
				type="button"
				onClick={onClose}
				className={iconButton}
				aria-label={
					mode === 'search' ? 'Clear search' : 'Stop browsing starred'
				}
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	);
}
