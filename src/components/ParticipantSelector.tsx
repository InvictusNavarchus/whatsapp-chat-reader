import { User, MessageSquare, ArrowRight, BookOpen } from 'lucide-react';

interface ParticipantSelectorProps {
	participants: string[];
	senderCounts: Record<string, number>;
	onSelectMe: (name: string | null) => void;
	fileName: string;
}

export default function ParticipantSelector({
	participants,
	senderCounts,
	onSelectMe,
	fileName,
}: ParticipantSelectorProps) {
	// Sort participants by message count descending
	const sortedParticipants = [...participants].sort(
		(a, b) => (senderCounts[b] || 0) - (senderCounts[a] || 0),
	);

	const totalMessages = Object.values(senderCounts).reduce(
		(acc, count) => acc + count,
		0,
	);

	return (
		<div
			id="participant-selector-container"
			className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center"
		>
			<div className="w-full bg-surface rounded-2xl p-6 md:p-8 shadow-sm border border-border-subtle mb-6">
				<div className="flex items-center gap-2 mb-4 text-text-brand">
					<BookOpen className="w-5 h-5" />
					<span className="font-sans font-semibold text-xs uppercase tracking-wider">
						File Loaded Successfully
					</span>
				</div>

				<h2
					className="font-display text-2xl font-semibold text-text-primary mb-2 truncate"
					title={fileName}
				>
					{fileName}
				</h2>
				<p className="text-text-tertiary font-sans text-xs md:text-sm mb-6 flex items-center gap-2">
					<MessageSquare className="w-4 h-4 text-text-muted" />
					Parsed {totalMessages.toLocaleString()} messages across{' '}
					{participants.length} participants.
				</p>

				<div className="border-t border-border-subtle pt-6 mb-6">
					<h3 className="font-sans font-medium text-text-primary text-sm md:text-base mb-1.5">
						Who are you in this chat?
					</h3>
					<p className="text-text-muted font-sans text-xs mb-4">
						Select your participant name to align your messages on the right (as
						outgoing). All other participants will be shown on the left (as
						incoming).
					</p>

					<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
						{sortedParticipants.map((name) => {
							const count = senderCounts[name] || 0;
							const percentage =
								totalMessages > 0
									? ((count / totalMessages) * 100).toFixed(1)
									: '0';

							return (
								<button
									key={name}
									type="button"
									onClick={() => onSelectMe(name)}
									className="w-full flex items-center justify-between p-3.5 hover:bg-surface-hover active:bg-surface-active border border-border-subtle hover:border-border-base rounded-xl transition-all text-left font-sans group focus:outline-none focus:ring-2 focus:ring-ring-brand min-h-[44px]"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-8 h-8 rounded-full bg-brand-surface-hover text-text-brand-hover flex items-center justify-center shrink-0">
											<User className="w-4 h-4" />
										</div>
										<div className="min-w-0">
											<p className="font-medium text-text-primary truncate pr-2 text-sm md:text-base">
												{name}
											</p>
											<p className="text-text-muted text-xs">
												{count.toLocaleString()} messages ({percentage}%)
											</p>
										</div>
									</div>
									<ArrowRight className="w-4 h-4 text-border-strong group-hover:text-text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
								</button>
							);
						})}
					</div>
				</div>

				<button
					type="button"
					onClick={() => onSelectMe(null)}
					className="w-full text-center py-3 bg-surface-active hover:bg-surface-muted-hover text-text-secondary rounded-xl font-sans font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring-base min-h-[44px]"
				>
					Read as Guest (No sender alignment)
				</button>
			</div>
		</div>
	);
}
