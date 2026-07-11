import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, CornerDownRight } from 'lucide-react';
import type { Message, SearchMatch } from '../types';

const escapeRegExp = (str: string) =>
	str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface SearchPanelProps {
	messages: Message[];
	onSelectMatch: (index: number) => void;
	onClose: () => void;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
}

export default function SearchPanel({
	messages,
	onSelectMatch,
	onClose,
	searchQuery,
	onSearchQueryChange,
}: SearchPanelProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [draftQuery, setDraftQuery] = useState(searchQuery);

	// Focus search input on mount after animation begins to prevent browser layout shifts
	useEffect(() => {
		const timer = setTimeout(() => {
			inputRef.current?.focus({ preventScroll: true });
		}, 150);
		return () => clearTimeout(timer);
	}, []);

	// Compute matches based on search query (uses pre-calculated contentLower for maximum performance)
	const matches: SearchMatch[] = useMemo(() => {
		if (!searchQuery || searchQuery.trim().length < 2) return [];

		const queryLower = searchQuery.toLowerCase();
		const results: SearchMatch[] = [];

		// Scan through pre-indexed lowercase content
		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];
			if (msg?.contentLower.includes(queryLower)) {
				results.push({
					index: i,
					message: msg,
				});
			}
		}
		return results;
	}, [messages, searchQuery]);

	// Cap visible search items in side panel to ensure extreme rendering speed (mobile optimization)
	const MAX_SIDEBAR_MATCHES = 200;
	const slicedMatches = useMemo(() => {
		return matches.slice(0, MAX_SIDEBAR_MATCHES);
	}, [matches]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDraftQuery(e.target.value);
	};

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSearchQueryChange(draftQuery);
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
					className="p-1.5 hover:bg-surface-active text-text-muted hover:text-text-secondary rounded-lg transition-colors focus:outline-none touch-manipulation min-h-[36px]"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Input area */}
			<div className="p-4 border-b border-border-subtle shrink-0">
				<form onSubmit={handleSearchSubmit} className="flex gap-2">
					<div className="relative flex-1">
						<input
							type="text"
							ref={inputRef}
							value={draftQuery}
							onChange={handleInputChange}
							placeholder="Search words, phrases..."
							className="w-full pl-9 pr-8 py-2 border border-border-base rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-ring-brand focus:border-transparent transition-all placeholder:text-text-muted bg-surface-hover/50"
						/>
						<Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
						{draftQuery && (
							<button
								type="button"
								onClick={clearSearch}
								className="absolute right-2.5 top-2.5 p-0.5 hover:bg-surface-muted-hover rounded-full text-text-muted hover:text-text-secondary transition-colors"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>
					<button
						type="submit"
						className="px-4 py-2 bg-brand hover:bg-brand-hover text-text-inverse rounded-xl text-sm font-sans font-medium transition-colors cursor-pointer min-h-[40px] shrink-0"
					>
						Search
					</button>
				</form>
				<p className="text-[11px] text-text-muted font-sans mt-2">
					Type at least 2 characters and press Search. Matches are highlighted
					in the conversation.
				</p>
			</div>

			{/* Results panel */}
			<div className="flex-1 overflow-y-auto scrollbar-thin">
				{searchQuery.trim().length < 2 ? (
					<div className="p-8 text-center text-text-muted">
						<MessageSquare className="w-10 h-10 mx-auto mb-3 text-border-base" />
						<p className="font-sans text-sm font-medium">Search History</p>
						<p className="font-sans text-xs mt-1">
							Enter a keyword above to find conversations instantly.
						</p>
					</div>
				) : matches.length === 0 ? (
					<div className="p-8 text-center text-text-muted">
						<X className="w-10 h-10 mx-auto mb-3 text-border-base" />
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
								{matches.length > MAX_SIDEBAR_MATCHES
									? `Showing top ${MAX_SIDEBAR_MATCHES} of ${matches.length}`
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

									return (
										<button
											key={message.id}
											type="button"
											onClick={() => onSelectMatch(index)}
											className="w-full text-left p-4 hover:bg-surface-hover active:bg-surface-active transition-colors focus:outline-none focus:bg-surface-hover flex flex-col gap-1 font-sans"
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
					</div>
				)}
			</div>
		</div>
	);
}
