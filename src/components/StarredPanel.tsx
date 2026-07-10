import { Star, X, CornerDownRight } from 'lucide-react';
import type { Message } from '../types';

interface StarredPanelProps {
	messages: Message[];
	starredMessageIds: Set<number>;
	onSelectMessage: (index: number) => void;
	onClose: () => void;
	onToggleStar: (messageId: number) => void;
}

export default function StarredPanel({
	messages,
	starredMessageIds,
	onSelectMessage,
	onClose,
	onToggleStar,
}: StarredPanelProps) {
	// Find starred messages and keep track of their original index in the messages array
	const starredMessages = messages
		.map((message, index) => ({ message, index }))
		.filter(({ message }) => message && starredMessageIds.has(message.id));

	return (
		<div className="w-full md:w-[380px] bg-white border-l border-neutral-200 flex flex-col h-full shadow-2xl md:shadow-none shrink-0 z-40 relative overflow-hidden">
			{/* Header */}
			<div className="p-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
				<h3 className="font-sans font-semibold text-neutral-800 text-sm md:text-base flex items-center gap-2">
					<Star className="w-4 h-4 text-amber-500 fill-amber-500" />
					Starred Messages
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors focus:outline-none touch-manipulation min-h-[36px]"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Results panel */}
			<div className="flex-1 overflow-y-auto scrollbar-thin">
				{starredMessages.length === 0 ? (
					<div className="p-8 text-center text-neutral-400">
						<Star className="w-10 h-10 mx-auto mb-3 text-neutral-200" />
						<p className="font-sans text-sm font-medium">No Starred Messages</p>
						<p className="font-sans text-xs mt-1">
							Hover over any message in the chat and click the star icon to save
							it here.
						</p>
					</div>
				) : (
					<div className="flex flex-col">
						<div className="px-4 py-2 bg-neutral-50 text-neutral-500 font-sans text-[11px] font-semibold border-b border-neutral-100 flex items-center justify-between">
							<span>SAVED MESSAGES</span>
							<span>{starredMessages.length} starred</span>
						</div>

						<div className="divide-y divide-neutral-100">
							{starredMessages.map(({ index, message }) => {
								const messageTime =
									message.formattedDateShort ||
									message.rawTimestamp.split(',')[0] ||
									'';

								return (
									<div
										key={message.id}
										className="w-full text-left p-4 hover:bg-neutral-50/50 transition-colors flex flex-col gap-1 font-sans relative group"
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
											className="cursor-pointer flex-1 flex flex-col gap-1 pr-8 focus:outline-none focus-visible:bg-neutral-50/50 rounded"
										>
											<div className="flex justify-between items-baseline w-full">
												<span className="font-semibold text-xs text-neutral-700 truncate max-w-[180px]">
													{message.sender}
												</span>
												<span className="text-[10px] text-neutral-400 font-mono">
													{messageTime}
												</span>
											</div>

											<p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed break-all">
												{message.isAttachment
													? `[Attachment: ${message.content}]`
													: message.content}
											</p>

											<div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
												<CornerDownRight className="w-3 h-3" />
												<span>Jump to message</span>
											</div>
										</div>

										{/* Star button to remove from starred list */}
										<button
											type="button"
											onClick={() => onToggleStar(message.id)}
											className="absolute right-4 top-4 p-1.5 hover:bg-neutral-100 text-amber-500 hover:text-neutral-400 rounded-lg transition-colors focus:outline-none"
											title="Unstar message"
										>
											<Star className="w-4 h-4 fill-amber-500" />
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
