import {
	type ChangeEvent,
	type DragEvent,
	useRef,
	useState,
	Fragment,
} from 'react';
import {
	Upload,
	FileText,
	BookOpen,
	AlertCircle,
	History,
	Trash2,
	Pencil,
	Check,
	X,
	MessageSquare,
	Users,
} from 'lucide-react';
import { SAMPLE_CHAT } from '../utils/sampleChat';

interface SavedChatMetadata {
	id: string;
	fileName: string;
	participants: string[];
	senderCounts: Record<string, number>;
	me: string | null;
	lastOpened: number;
	messageCount: number;
}

interface FileUploaderProps {
	onChatLoaded: (text: string, fileName: string) => void;
	savedChats: SavedChatMetadata[];
	onLoadSavedChat: (id: string) => void;
	onDeleteSavedChat: (id: string) => void;
	onRenameSavedChat: (id: string, newName: string) => void;
}

function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	if (diff < 60000) return 'Just now';
	const minutes = Math.floor(diff / 60000);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(diff / 3600000);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(diff / 86400000);
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days}d ago`;
	return new Date(timestamp).toLocaleDateString([], {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

export default function FileUploader({
	onChatLoaded,
	savedChats,
	onLoadSavedChat,
	onDeleteSavedChat,
	onRenameSavedChat,
}: FileUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Inline editing states for saved chats
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editNameValue, setEditNameValue] = useState('');
	const renameInputRef = useRef<HTMLInputElement>(null);

	const handleFile = (file: File) => {
		if (!file.name.endsWith('.txt')) {
			setError('Please upload a valid WhatsApp export .txt file.');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (!text || text.trim().length === 0) {
				setError('The selected file is empty.');
				return;
			}
			setError(null);
			onChatLoaded(text, file.name);
		};
		reader.onerror = () => {
			setError('An error occurred while reading the file.');
		};
		reader.readAsText(file);
	};

	const onDragOver = (e: DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const onDragLeave = () => {
		setIsDragging(false);
	};

	const onDrop = (e: DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer.files?.[0]) {
			handleFile(e.dataTransfer.files[0]);
		}
	};

	const onFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			handleFile(e.target.files[0]);
		}
	};

	const loadDemo = () => {
		onChatLoaded(SAMPLE_CHAT, 'Weekend Plans (Sample Chat).txt');
	};

	const startRename = (e: React.MouseEvent, chat: SavedChatMetadata) => {
		e.stopPropagation();
		setEditingId(chat.id);
		// Strip extension for editing
		const displayName = chat.fileName.replace(/\.[^/.]+$/, '');
		setEditNameValue(displayName);
		setTimeout(() => {
			renameInputRef.current?.focus();
			renameInputRef.current?.select();
		}, 50);
	};

	const cancelRename = (e?: React.MouseEvent | React.FocusEvent) => {
		e?.stopPropagation();
		setEditingId(null);
		setEditNameValue('');
	};

	const submitRename = (
		e: React.MouseEvent | React.FormEvent,
		chat: SavedChatMetadata,
	) => {
		e.stopPropagation();
		e.preventDefault();
		const trimmed = editNameValue.trim();
		if (trimmed) {
			const extMatch = chat.fileName.match(/\.[^/.]+$/);
			const ext = extMatch ? extMatch[0] : '';
			const newName = trimmed.endsWith(ext) || !ext ? trimmed : trimmed + ext;
			onRenameSavedChat(chat.id, newName);
		}
		setEditingId(null);
		setEditNameValue('');
	};

	return (
		<div
			id="file-uploader-container"
			className="w-full max-w-2xl mx-auto px-4 py-8 md:py-16 flex flex-col items-center"
		>
			<div className="text-center mb-8">
				<h1 className="font-display text-4xl font-semibold tracking-tight text-text-primary mb-3">
					WhatsApp Chat Reader
				</h1>
				<p className="text-text-tertiary font-sans max-w-md mx-auto text-sm md:text-base leading-relaxed">
					An offline-first, blazing-fast reader designed to render, search, and
					navigate large exported WhatsApp chat logs beautifully.
				</p>
			</div>

			{/* Main Drag & Drop / Upload Card */}
			<button
				id="dropzone"
				type="button"
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				onClick={() => fileInputRef.current?.click()}
				className={`w-full bg-surface rounded-2xl border-2 border-dashed p-8 md:p-12 text-center cursor-pointer transition-all duration-200 shadow-sm flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring-brand focus:ring-offset-2 ${
					isDragging
						? 'border-border-brand bg-brand-surface/40 scale-[0.99]'
						: 'border-border-base hover:border-border-strong hover:bg-surface-hover/50'
				}`}
			>
				<input
					type="file"
					ref={fileInputRef}
					onChange={onFileSelect}
					accept=".txt"
					className="hidden"
				/>

				<span
					className={`p-4 rounded-full mb-4 transition-colors inline-flex ${isDragging ? 'bg-brand-surface-hover text-text-brand' : 'bg-surface-hover text-text-muted group-hover:bg-surface-active'}`}
				>
					<Upload className="w-8 h-8" />
				</span>

				<span className="font-sans font-medium text-text-primary text-base mb-1 block">
					{isDragging
						? 'Drop your chat file here!'
						: 'Drag & drop your chat .txt file here'}
				</span>
				<span className="font-sans text-text-muted text-xs md:text-sm mb-4 block">
					or click to browse your local files
				</span>

				<span className="px-3 py-1 bg-surface-active text-text-secondary font-mono text-[10px] uppercase tracking-wider rounded-md font-semibold inline-block">
					Supports iOS & Android formats
				</span>
			</button>

			{error && (
				<div className="mt-4 flex items-center gap-2 text-text-error bg-error-surface px-4 py-3 rounded-xl border border-border-error text-sm max-w-full">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<p className="font-sans">{error}</p>
				</div>
			)}

			{/* Demo / Sample Chat Trigger */}
			<div className="mt-6 w-full flex items-center justify-center">
				<button
					type="button"
					onClick={loadDemo}
					className="flex items-center gap-2 px-5 py-2.5 bg-text-primary hover:bg-text-secondary text-text-inverse rounded-xl font-sans font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 touch-manipulation min-h-[44px]"
				>
					<BookOpen className="w-4 h-4" />
					Load Sample Weekend Chat
				</button>
			</div>

			{/* Saved Chats List */}
			{savedChats.length > 0 && (
				<div className="mt-10 w-full">
					<h3 className="font-sans font-semibold text-text-primary text-sm md:text-base mb-4 flex items-center gap-2">
						<History className="w-4 h-4 text-text-brand" />
						Recently Read Chats
					</h3>
					<div className="bg-surface rounded-2xl border border-border-base/60 shadow-sm divide-y divide-neutral-100 overflow-hidden w-full">
						{savedChats.map((chat) => {
							const displayName = chat.fileName.replace(/\.[^/.]+$/, '');
							const isEditing = editingId === chat.id;

							return (
								<Fragment key={chat.id}>
									{/* biome-ignore lint/a11y/useSemanticElements: contains nested interactive elements (form, edit/delete buttons) so it cannot be a button element */}
									<div
										role="button"
										tabIndex={0}
										onClick={() => {
											if (!isEditing) {
												onLoadSavedChat(chat.id);
											}
										}}
										onKeyDown={(e) => {
											if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
												e.preventDefault();
												onLoadSavedChat(chat.id);
											}
										}}
										className="group p-4 hover:bg-surface-hover/50 transition-colors flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:bg-surface-hover/50"
									>
										<div className="min-w-0 flex-1">
											{isEditing ? (
												<form
													onSubmit={(e) => submitRename(e, chat)}
													className="flex items-center gap-2"
													onClick={(e) => e.stopPropagation()}
													onKeyDown={(e) => e.stopPropagation()}
												>
													<input
														ref={renameInputRef}
														type="text"
														value={editNameValue}
														onChange={(e) => setEditNameValue(e.target.value)}
														onBlur={() => {
															// Give click event on confirm button priority
															setTimeout(() => {
																if (editingId === chat.id) cancelRename();
															}, 200);
														}}
														className="font-sans font-semibold text-text-primary text-sm md:text-base leading-tight bg-surface-hover border border-border-strong rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring-brand focus:border-border-brand w-full max-w-xs"
													/>
													<button
														type="submit"
														className="p-1.5 hover:bg-brand-surface text-text-brand rounded-lg"
														title="Confirm rename"
													>
														<Check className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={cancelRename}
														className="p-1.5 hover:bg-surface-active text-text-tertiary rounded-lg"
														title="Cancel"
													>
														<X className="w-4 h-4" />
													</button>
												</form>
											) : (
												<>
													<h4 className="font-sans font-semibold text-text-primary text-sm md:text-base leading-tight truncate group-hover:text-text-brand-hover transition-colors">
														{displayName}
													</h4>
													<div className="text-text-muted font-sans text-xs flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
														<span className="flex items-center gap-1">
															<Users className="w-3.5 h-3.5" />
															{chat.participants.length}
														</span>
														<span>•</span>
														<span className="flex items-center gap-1">
															<MessageSquare className="w-3.5 h-3.5" />
															{chat.messageCount.toLocaleString()}
														</span>
														<span>•</span>
														<span>
															Opened {formatRelativeTime(chat.lastOpened)}
														</span>
														{chat.me && (
															<>
																<span>•</span>
																<span className="text-text-brand/80 font-medium">
																	Me: {chat.me}
																</span>
															</>
														)}
													</div>
												</>
											)}
										</div>

										{!isEditing && (
											<div className="flex items-center gap-1 shrink-0">
												<button
													type="button"
													onClick={(e) => startRename(e, chat)}
													className="p-2 text-text-muted hover:text-text-secondary hover:bg-surface-active rounded-lg transition-colors focus:outline-none"
													title="Rename chat log"
												>
													<Pencil className="w-4 h-4" />
												</button>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														onDeleteSavedChat(chat.id);
													}}
													className="p-2 text-text-muted hover:text-text-error hover:bg-error-surface rounded-lg transition-colors focus:outline-none"
													title="Delete saved chat"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										)}
									</div>
								</Fragment>
							);
						})}
					</div>
				</div>
			)}

			{/* Instructions Card */}
			<div className="mt-10 w-full bg-surface-hover rounded-2xl p-6 md:p-8 border border-border-subtle">
				<h3 className="font-sans font-semibold text-text-primary text-sm md:text-base mb-4 flex items-center gap-2">
					<FileText className="w-4 h-4 text-text-brand" />
					How to export your chat from WhatsApp:
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm text-text-secondary">
					<div>
						<h4 className="font-sans font-medium text-text-primary mb-1.5">
							For iOS (iPhone)
						</h4>
						<ol className="list-decimal list-inside space-y-1 font-sans leading-relaxed">
							<li>Open WhatsApp and go to the chat.</li>
							<li>Tap on the contact or group name at the top.</li>
							<li>
								Scroll down and tap <strong>Export Chat</strong>.
							</li>
							<li>
								Choose <strong>Without Media</strong> (for a faster, smaller
								export).
							</li>
							<li>
								Save the exported{' '}
								<code className="font-mono bg-surface-active px-1 rounded">
									_chat.txt
								</code>{' '}
								file.
							</li>
						</ol>
					</div>
					<div>
						<h4 className="font-sans font-medium text-text-primary mb-1.5">
							For Android
						</h4>
						<ol className="list-decimal list-inside space-y-1 font-sans leading-relaxed">
							<li>Open WhatsApp and open the chat.</li>
							<li>Tap the three vertical dots (⋮) in the top right.</li>
							<li>
								Select <strong>More</strong> &rarr; <strong>Export chat</strong>
								.
							</li>
							<li>
								Choose <strong>Without media</strong>.
							</li>
							<li>
								Save the exported{' '}
								<code className="font-mono bg-surface-active px-1 rounded">
									WhatsApp Chat with ....txt
								</code>{' '}
								file.
							</li>
						</ol>
					</div>
				</div>
				<div className="mt-6 pt-4 border-t border-border-subtle flex items-start gap-2.5">
					<AlertCircle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
					<p className="font-sans text-xs text-text-muted leading-relaxed">
						<strong>Security & Privacy:</strong> This reader is 100%
						offline-first. Your uploaded chat file is parsed completely inside
						your local browser. No data, text, or file content is ever
						transmitted to any external server or cloud service.
					</p>
				</div>
			</div>
		</div>
	);
}
