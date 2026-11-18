import { useEffect, useRef } from 'react';
import { Star, X, CornerDownRight } from 'lucide-react';
import type { SearchMatch } from '../types';
import HistoryLoadingNotice from './HistoryLoadingNotice';
import { centerInScrollContainer } from '../utils/scroll';

interface StarredPanelProps {
	items: SearchMatch[];
	activeIndex: number | null;
	isLoadingHistory: boolean;
	onSelectMessage: (index: number) => void;
	onClose: () => void;
	onToggleStar: (messageId: number) => void;
}

export default function StarredPanel({
	items: starredMessages,
	activeIndex,
	isLoadingHistory,
	onSelectMessage,
	onClose,
	onToggleStar,
}: StarredPanelProps) {
	const listRef = useRef<HTMLDivElement>(null);

	// Reopening lands on the starred message the user was last at.
	useEffect(() => {
		const container = listRef.current;
		const active = container?.querySelector<HTMLElement>(
			'[data-active="true"]',
		);
		if (container && active) centerInScrollContainer(container, active);
	}, []);

	return (
		<div className="w-full md:w-[380px] bg-surface border-l border-border-base flex flex-col h-full shadow-2xl md:shadow-none shrink-0 z-40 relative overflow-hidden">
			{/* Header */}
			<div className="p-4 border-b border-border-base flex items-center justify-between shrink-0">
				<h3 className="font-sans font-semibold text-text-primary text-sm md:text-base flex items-center gap-2">
					<Star className="w-4 h-4 text-text-star fill-star" />
					Starred Messages
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

			{/* Results panel */}
			<div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin">
				{isLoadingHistory && <HistoryLoadingNotice />}
				{starredMessages.length === 0 ? (
					<div className="p-8 text-center text-text-muted">
						<Star className="w-10 h-10 mx-auto mb-3 text-icon-muted" />
						<p className="font-sans text-sm font-medium">No Starred Messages</p>
						<p className="font-sans text-xs mt-1">
							Tap the star next to any message's timestamp to save it here.
						</p>
					</div>
				) : (
					<div className="flex flex-col">
						<div className="px-4 py-2 bg-surface-hover text-text-tertiary font-sans text-[11px] font-semibold border-b border-border-subtle flex items-center justify-between">
							<span>SAVED MESSAGES</span>
							<span>{starredMessages.length} starred</span>
						</div>

						<div className="divide-y divide-neutral-100">
							{starredMessages.map(({ index, message }) => {
								const messageTime =
									message.formattedDateShort ||
									message.rawTimestamp.split(',')[0] ||
									'';
								const isActive = index === activeIndex;

								return (
									<div
										key={message.id}
										data-active={isActive}
										className={`w-full text-left p-4 border-l-4 transition-colors flex flex-col gap-1 font-sans relative group ${
											isActive
												? 'border-border-brand bg-brand-surface'
												: 'border-transparent hover:bg-surface-hover/50'
										}`}
									>
										{/* Clicking this region jumps to the message */}
										{/* biome-ignore lint/a11y/useSemanticElements: custom interactive region to exclude the absolute positioned unstar button */}
										<div
											role="button"
											tabIndex={0}
											onClick={() => onSelectMessage(index)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													onSelectMessage(index);
												}
											}}
											className="cursor-pointer flex-1 flex flex-col gap-1 pr-8 focus:outline-none focus-visible:bg-surface-hover/50 rounded"
										>
											<div className="flex justify-between items-baseline w-full">
												<span className="font-semibold text-xs text-text-primary truncate max-w-[180px]">
													{message.sender}
												</span>
												<span className="text-[10px] text-text-muted font-mono">
													{messageTime}
												</span>
											</div>

											<p className="text-xs text-text-tertiary line-clamp-3 leading-relaxed break-all">
												{message.isAttachment
													? `[Attachment: ${message.content}]`
													: message.content}
											</p>

											<div className="flex items-center gap-1 text-[10px] text-text-brand font-semibold mt-1">
												<CornerDownRight className="w-3 h-3" />
												<span>Jump to message</span>
											</div>
										</div>

										{/* Star button to remove from starred list */}
										<button
											type="button"
											onClick={() => onToggleStar(message.id)}
											className="absolute right-2 top-2 p-3 hover:bg-surface-active text-text-star hover:text-text-muted rounded-lg transition-colors focus:outline-none touch-manipulation"
											title="Unstar message"
										>
											<Star className="w-4 h-4 fill-star" />
										</button>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
