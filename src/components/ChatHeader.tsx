import { useState, useRef, useEffect } from 'react';
import {
	Search,
	Calendar,
	Users,
	MessageSquare,
	ArrowLeft,
	X,
	Pencil,
	Check,
	Star,
} from 'lucide-react';
import type { Message, DateMapEntry } from '../types';

interface ChatHeaderProps {
	fileName: string;
	messages: Message[];
	participants: string[];
	me: string | null;
	onBack: () => void;
	onSearchToggle: () => void;
	isSearchOpen: boolean;
	onJumpToMessage: (index: number) => void;
	dateMap: DateMapEntry[];
	onRename: (newName: string) => void;
	onChangeIdentity: () => void;
	isStarredOpen: boolean;
	onStarredToggle: () => void;
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
	dateMap,
	onRename,
	onChangeIdentity,
	isStarredOpen,
	onStarredToggle,
}: ChatHeaderProps) {
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const calendarRef = useRef<HTMLDivElement>(null);

	const [isEditingName, setIsEditingName] = useState(false);
	const displayName = fileName.replace(/\.[^/.]+$/, ''); // strip extension
	const [editValue, setEditValue] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const handleStartEditing = () => {
		setEditValue(displayName);
		setIsEditingName(true);
	};

	useEffect(() => {
		if (isEditingName && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditingName]);

	const handleSaveName = () => {
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== displayName) {
			const extMatch = fileName.match(/\.[^/.]+$/);
			const ext = extMatch ? extMatch[0] : '';
			const newFileName =
				trimmed.endsWith(ext) || !ext ? trimmed : trimmed + ext;
			onRename(newFileName);
		}
		setIsEditingName(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			handleSaveName();
		} else if (e.key === 'Escape') {
			setEditValue(displayName);
			setIsEditingName(false);
		}
	};

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

	return (
		<header className="fixed top-0 left-0 right-0 bg-surface border-b border-border-base px-4 py-3 flex items-center justify-between shadow-sm shrink-0 z-50 h-16">
			<div className="flex items-center gap-3 min-w-0">
				<button
					type="button"
					onClick={onBack}
					className="p-1.5 hover:bg-surface-active rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring-brand shrink-0 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
					title="Back to file upload"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>

				<div className="min-w-0">
					{isEditingName ? (
						<div className="flex items-center gap-1.5 py-0.5">
							<input
								ref={inputRef}
								type="text"
								value={editValue}
								onChange={(e) => setEditValue(e.target.value)}
								onBlur={handleSaveName}
								onKeyDown={handleKeyDown}
								className="font-sans font-semibold text-text-primary text-sm md:text-base leading-tight bg-surface-hover border border-border-strong rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-ring-brand focus:border-border-brand max-w-[180px] md:max-w-xs"
							/>
							<button
								type="button"
								onClick={handleSaveName}
								className="p-1 hover:bg-brand-surface text-text-brand rounded"
							>
								<Check className="w-3.5 h-3.5" />
							</button>
						</div>
					) : (
						<div className="flex items-center gap-1.5 group/title">
							<h2 className="font-sans font-semibold text-text-primary text-sm md:text-base leading-tight truncate max-w-[180px] md:max-w-xs">
								{displayName}
							</h2>
							<button
								type="button"
								onClick={handleStartEditing}
								className="p-1 hover:bg-surface-active rounded text-text-muted hover:text-text-secondary opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
								title="Rename chat log"
							>
								<Pencil className="w-3.5 h-3.5" />
							</button>
						</div>
					)}
					<p className="text-text-muted font-sans text-[11px] leading-tight flex items-center gap-2 truncate mt-0.5">
						<span className="flex items-center gap-0.5">
							<Users className="w-3 h-3" />
							{participants.length} participants
						</span>
						<span>•</span>
						<span className="flex items-center gap-0.5">
							<MessageSquare className="w-3 h-3" />
							{messages.length.toLocaleString()} messages
						</span>
						<span>•</span>
						<button
							type="button"
							onClick={onChangeIdentity}
							className="text-text-brand hover:text-text-brand-hover font-medium truncate hover:underline focus:outline-none flex items-center gap-0.5 cursor-pointer"
							title="Change who 'Me' is"
						>
							{me ? `Me: ${me}` : 'Set "Me" identity'}
						</button>
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
							className={`p-2 hover:bg-surface-active rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring-brand touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center ${
								isCalendarOpen
									? 'text-text-brand bg-brand-surface'
									: 'text-text-tertiary hover:text-text-primary'
							}`}
							title="Jump to date"
						>
							<Calendar className="w-5 h-5" />
						</button>

						{isCalendarOpen && (
							<div className="absolute right-0 mt-2 w-64 max-h-[320px] bg-surface border border-border-base rounded-xl shadow-xl overflow-hidden flex flex-col z-50">
								<div className="px-3.5 py-2 border-b border-border-subtle bg-surface-hover flex items-center justify-between shrink-0">
									<span className="font-sans font-medium text-xs text-text-primary">
										Chronological Jump
									</span>
									<button
										type="button"
										onClick={() => setIsCalendarOpen(false)}
										className="p-1 text-text-muted hover:text-text-secondary rounded"
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
											className="w-full text-left px-4 py-2.5 hover:bg-surface-hover text-text-primary text-xs font-sans transition-colors flex items-center justify-between focus:outline-none focus:bg-surface-hover"
										>
											<span className="font-medium">{d.dateStr}</span>
											<span className="font-mono text-[10px] text-text-muted bg-surface-active px-1.5 py-0.5 rounded-md">
												{d.count} msgs
											</span>
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Starred Messages Toggle Button */}
				<button
					type="button"
					onClick={onStarredToggle}
					className={`p-2 hover:bg-surface-active rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring-brand touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center ${
						isStarredOpen
							? 'text-text-star bg-star-surface'
							: 'text-text-tertiary hover:text-text-primary'
					}`}
					title="Starred messages"
				>
					<Star className="w-5 h-5" />
				</button>

				{/* Full-text Search Toggle Button */}
				<button
					type="button"
					onClick={onSearchToggle}
					className={`p-2 hover:bg-surface-active rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring-brand touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center ${
						isSearchOpen
							? 'text-text-brand bg-brand-surface'
							: 'text-text-tertiary hover:text-text-primary'
					}`}
					title="Search messages"
				>
					<Search className="w-5 h-5" />
				</button>
			</div>
		</header>
	);
}
