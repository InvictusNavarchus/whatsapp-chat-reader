import { useState, useMemo, useRef, useEffect } from 'react';
import {
	Search,
	Calendar,
	Users,
	MessageSquare,
	ArrowLeft,
	X,
} from 'lucide-react';
import type { Message } from '../types';

interface ChatHeaderProps {
	fileName: string;
	messages: Message[];
	participants: string[];
	me: string | null;
	onBack: () => void;
	onSearchToggle: () => void;
	isSearchOpen: boolean;
	onJumpToMessage: (index: number) => void;
}

export default function ChatHeader({
	fileName,
	messages,
	participants,
	me,
	onBack,
	onSearchToggle,
	isSearchOpen,
	onJumpToMessage,
}: ChatHeaderProps) {
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const calendarRef = useRef<HTMLDivElement>(null);

	// Close calendar popup if clicked outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				calendarRef.current &&
				!calendarRef.current.contains(event.target as Node)
			) {
				setIsCalendarOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Compute a map of Date strings -> first message index on that date for Calendar Jump
	const dateMap = useMemo(() => {
		const map: { dateStr: string; index: number; count: number }[] = [];
		const seenDates: Record<string, number> = {}; // dateStr -> position in map array

		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];
			if (!msg.timestamp) continue;

			// Extract a nice readable date, e.g. "May 12, 2026" or "12/05/2026"
			const dateStr = msg.timestamp.toLocaleDateString([], {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});

			if (seenDates[dateStr] !== undefined) {
				map[seenDates[dateStr]].count++;
			} else {
				seenDates[dateStr] = map.length;
				map.push({
					dateStr,
					index: i,
					count: 1,
				});
			}
		}
		return map;
	}, [messages]);

	const displayName = fileName.replace(/\.[^/.]+$/, ''); // strip extension

	return (
		<header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0 z-30">
			<div className="flex items-center gap-3 min-w-0">
				<button
					type="button"
					onClick={onBack}
					className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
					title="Back to file upload"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>

				<div className="min-w-0">
					<h2 className="font-sans font-semibold text-neutral-800 text-sm md:text-base leading-tight truncate max-w-[180px] md:max-w-xs">
						{displayName}
					</h2>
					<p className="text-neutral-400 font-sans text-[11px] leading-tight flex items-center gap-2 truncate mt-0.5">
						<span className="flex items-center gap-0.5">
							<Users className="w-3 h-3" />
							{participants.length} participants
						</span>
						<span>•</span>
						<span className="flex items-center gap-0.5">
							<MessageSquare className="w-3 h-3" />
							{messages.length.toLocaleString()} messages
						</span>
						{me && (
							<>
								<span>•</span>
								<span className="text-emerald-600 font-medium truncate">
									Me: {me}
								</span>
							</>
						)}
					</p>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex items-center gap-1">
				{/* Calendar Jump Button */}
				{dateMap.length > 0 && (
					<div className="relative" ref={calendarRef}>
						<button
							type="button"
							onClick={() => setIsCalendarOpen(!isCalendarOpen)}
							className={`p-2 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center ${
								isCalendarOpen
									? 'text-emerald-600 bg-emerald-50'
									: 'text-neutral-500 hover:text-neutral-700'
							}`}
							title="Jump to date"
						>
							<Calendar className="w-5 h-5" />
						</button>

						{isCalendarOpen && (
							<div className="absolute right-0 mt-2 w-64 max-h-[320px] bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden flex flex-col z-50">
								<div className="px-3.5 py-2 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between shrink-0">
									<span className="font-sans font-medium text-xs text-neutral-700">
										Chronological Jump
									</span>
									<button
										type="button"
										onClick={() => setIsCalendarOpen(false)}
										className="p-1 text-neutral-400 hover:text-neutral-600 rounded"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								</div>
								<div className="overflow-y-auto py-1 divide-y divide-neutral-50 max-h-[260px] scrollbar-thin">
									{dateMap.map((d) => (
										<button
											key={d.dateStr}
											type="button"
											onClick={() => {
												onJumpToMessage(d.index);
												setIsCalendarOpen(false);
											}}
											className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 text-neutral-800 text-xs font-sans transition-colors flex items-center justify-between focus:outline-none focus:bg-neutral-50"
										>
											<span className="font-medium">{d.dateStr}</span>
											<span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-md">
												{d.count} msgs
											</span>
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Full-text Search Toggle Button */}
				<button
					type="button"
					onClick={onSearchToggle}
					className={`p-2 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center ${
						isSearchOpen
							? 'text-emerald-600 bg-emerald-50'
							: 'text-neutral-500 hover:text-neutral-700'
					}`}
					title="Search messages"
				>
					<Search className="w-5 h-5" />
				</button>
			</div>
		</header>
	);
}
