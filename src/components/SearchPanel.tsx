import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, CornerDownRight } from 'lucide-react';
import type { SearchMatch } from '../types';
import HistoryLoadingNotice from './HistoryLoadingNotice';
import { centerInScrollContainer } from '../utils/scroll';
import { MIN_SEARCH_LENGTH } from '../utils/search';

const PAGE_SIZE = 200;
const SEARCH_DEBOUNCE_MS = 250;

const escapeRegExp = (str: string) =>
	str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface SearchPanelProps {
	matches: SearchMatch[];
	activeIndex: number | null;
	isLoadingHistory: boolean;
	onSelectMatch: (index: number) => void;
	onClose: () => void;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
}

export default function SearchPanel({
	matches,
	activeIndex,
	isLoadingHistory,
	onSelectMatch,
	onClose,
	searchQuery,
	onSearchQueryChange,
}: SearchPanelProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);
	const [draftQuery, setDraftQuery] = useState(searchQuery);

	// Only auto-focus for a fresh search. When reopening to browse existing
	// results, focusing would pop the mobile keyboard over the list.
	// Delayed until the slide-in animation has started to avoid layout shifts.
	const [focusOnMount] = useState(() => !searchQuery);
	useEffect(() => {
		if (!focusOnMount) return;
		const timer = setTimeout(() => {
			inputRef.current?.focus({ preventScroll: true });
		}, 150);
		return () => clearTimeout(timer);
	}, [focusOnMount]);

	// Live search: commit the draft after a short pause so the results never
	// disagree with what's typed. Enter commits immediately (see submit).
	useEffect(() => {
		if (draftQuery === searchQuery) return;
		const timer = setTimeout(
			() => onSearchQueryChange(draftQuery),
			SEARCH_DEBOUNCE_MS,
		);
		return () => clearTimeout(timer);
	}, [draftQuery, searchQuery, onSearchQueryChange]);

	// Reopening the panel (e.g. from the navigator) lands on the result the
	// user was last at instead of the top of the list.
	useEffect(() => {
		const container = resultsRef.current;
		const active = container?.querySelector<HTMLElement>(
			'[data-active="true"]',
		);
		if (container && active) centerInScrollContainer(container, active);
	}, []);

	// Render results in pages to keep the panel fast on mobile. The page count
	// is tied to the query it was grown for, so a new query starts at one page.
	// The first page is sized to include the active result, so reopening from
	// the navigator can scroll to it.
	const [paging, setPaging] = useState(() => {
		const activePos =
			activeIndex === null
				? -1
				: matches.findIndex((m) => m.index === activeIndex);
		return {
			query: searchQuery,
			count: Math.max(PAGE_SIZE, activePos + PAGE_SIZE / 4),
		};
	});
	const visibleCount = paging.query === searchQuery ? paging.count : PAGE_SIZE;
	const slicedMatches = useMemo(
		() => matches.slice(0, visibleCount),
		[matches, visibleCount],
	);
	const showMore = () =>
		setPaging({ query: searchQuery, count: visibleCount + PAGE_SIZE });

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDraftQuery(e.target.value);
	};

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSearchQueryChange(draftQuery);
		// Dismiss the mobile keyboard so the results are visible.
		inputRef.current?.blur();
	};

	const clearSearch = () => {
		setDraftQuery('');
		onSearchQueryChange('');
		inputRef.current?.focus({ preventScroll: true });
	};

	return (
		<div className="w-full md:w-[380px] bg-surface border-l border-border-base flex flex-col h-full shadow-2xl md:shadow-none shrink-0 z-40 relative overflow-hidden">
			{/* Header */}
			<div className="p-4 border-b border-border-base flex items-center justify-between shrink-0">
				<h3 className="font-sans font-semibold text-text-primary text-sm md:text-base flex items-center gap-2">
					<Search className="w-4 h-4 text-text-tertiary" />
					Search Messages
				</h3>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close panel"
					className="p-2.5 -m-1.5 hover:bg-surface-active text-text-muted hover:text-text-secondary rounded-lg transition-colors focus:outline-none touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Input area */}
			<div className="p-4 border-b border-border-subtle shrink-0">
				<form onSubmit={handleSearchSubmit}>
					<div className="relative">
						{/* type="text" + inputMode="search" gets the mobile search key
						    without the native clear button duplicating ours. */}
						<input
							type="text"
							inputMode="search"
							enterKeyHint="search"
							ref={inputRef}
							value={draftQuery}
							onChange={handleInputChange}
							placeholder="Search words, phrases..."
							className="w-full pl-9 pr-11 py-2.5 border border-border-base rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-ring-brand focus:border-transparent transition-all placeholder:text-text-muted bg-surface-hover/50"
						/>
						<Search className="absolute left-3 top-3 w-4 h-4 text-text-muted pointer-events-none" />
						{draftQuery && (
							<button
								type="button"
								onClick={clearSearch}
								aria-label="Clear search"
								className="absolute right-0 top-0 h-full px-3 flex items-center text-text-muted hover:text-text-secondary transition-colors touch-manipulation"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
				</form>
				<p className="text-[11px] text-text-muted font-sans mt-2">
					Type at least {MIN_SEARCH_LENGTH} characters. Matches are highlighted
					in the conversation.
				</p>
			</div>

			{/* Results panel */}
			<div ref={resultsRef} className="flex-1 overflow-y-auto scrollbar-thin">
				{isLoadingHistory && <HistoryLoadingNotice />}
				{searchQuery.trim().length < MIN_SEARCH_LENGTH ? (
					<div className="p-8 text-center text-text-muted">
						<MessageSquare className="w-10 h-10 mx-auto mb-3 text-icon-muted" />
						<p className="font-sans text-sm font-medium">Search History</p>
						<p className="font-sans text-xs mt-1">
							Enter a keyword above to find conversations instantly.
						</p>
					</div>
				) : matches.length === 0 ? (
					<div className="p-8 text-center text-text-muted">
						<X className="w-10 h-10 mx-auto mb-3 text-icon-muted" />
						<p className="font-sans text-sm font-medium">No results found</p>
						<p className="font-sans text-xs mt-1">
							No messages match "{searchQuery}" in this chat.
						</p>
					</div>
				) : (
					<div className="flex flex-col">
						<div className="px-4 py-2 bg-surface-hover text-text-tertiary font-sans text-[11px] font-semibold border-b border-border-subtle flex items-center justify-between">
							<span>MATCHES FOUND</span>
							<span>
								{matches.length > visibleCount
									? `Showing ${visibleCount} of ${matches.length}`
									: `${matches.length} matches`}
							</span>
						</div>

						<div className="divide-y divide-neutral-100">
							{(() => {
								const searchRegex = searchQuery
									? new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi')
									: null;
								return slicedMatches.map(({ index, message }) => {
									const parts = searchRegex
										? message.content.split(searchRegex)
										: [message.content];
									const messageTime =
										message.formattedDateShort ||
										message.rawTimestamp.split(',')[0] ||
										'';
									const isActive = index === activeIndex;

									return (
										<button
											key={message.id}
											type="button"
											data-active={isActive}
											aria-current={isActive || undefined}
											onClick={() => onSelectMatch(index)}
											className={`w-full text-left p-4 border-l-4 transition-colors focus:outline-none flex flex-col gap-1 font-sans ${
												isActive
													? 'border-border-brand bg-brand-surface'
													: 'border-transparent hover:bg-surface-hover active:bg-surface-active focus:bg-surface-hover'
											}`}
										>
											<div className="flex justify-between items-baseline w-full">
												<span className="font-semibold text-xs text-text-primary truncate max-w-[180px]">
													{message.sender}
												</span>
												<span className="text-[10px] text-text-muted font-mono">
													{messageTime}
												</span>
											</div>

											<p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed break-all">
												{parts.map((part, idx) => {
													const partKey = `${message.id}-part-${idx}`;
													return part.toLowerCase() ===
														searchQuery.toLowerCase() ? (
														<mark
															key={partKey}
															className="bg-star-surface-strong text-text-star-strong font-semibold rounded-[2px] px-0.5"
														>
															{part}
														</mark>
													) : (
														part
													);
												})}
											</p>

											<div className="flex items-center gap-1 text-[10px] text-text-brand font-semibold mt-1">
												<CornerDownRight className="w-3 h-3" />
												<span>Jump to message</span>
											</div>
										</button>
									);
								});
							})()}
						</div>
						{matches.length > visibleCount && (
							<button
								type="button"
								onClick={showMore}
								className="m-4 py-2.5 rounded-xl border border-border-base text-sm font-sans font-medium text-text-secondary hover:bg-surface-hover active:bg-surface-active transition-colors touch-manipulation"
							>
								Show {Math.min(PAGE_SIZE, matches.length - visibleCount)} more
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
