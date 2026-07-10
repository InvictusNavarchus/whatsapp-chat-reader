import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import FileUploader from './components/FileUploader';
import ParticipantSelector from './components/ParticipantSelector';
import ChatHeader from './components/ChatHeader';
import VirtualMessageList from './components/VirtualMessageList';
import SearchPanel from './components/SearchPanel';
import StarredPanel from './components/StarredPanel';
import type { Message, DateMapEntry } from './types';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
	saveChat,
	getChatMetadata,
	getChatMessages,
	listChats,
	renameChat,
	updateChatMe,
	updateChatStarredMessages,
	deleteChat,
	type ChatMetadata,
} from './utils/db';

type AppStep = 'UPLOAD' | 'SELECT_IDENTITY' | 'READER';

export default function App() {
	const [step, setStep] = useState<AppStep>('UPLOAD');
	const [messages, setMessages] = useState<Message[]>([]);
	const [dateMap, setDateMap] = useState<DateMapEntry[]>([]);
	const [fileName, setFileName] = useState<string>('');
	const [participants, setParticipants] = useState<string[]>([]);
	const [senderCounts, setSenderCounts] = useState<Record<string, number>>({});
	const [me, setMe] = useState<string | null>(null);

	// Saved chats state
	const [savedChats, setSavedChats] = useState<ChatMetadata[]>([]);
	const [currentChatId, setCurrentChatId] = useState<string | null>(null);

	// Starred messages state
	const [isStarredOpen, setIsStarredOpen] = useState(false);
	const [starredMessageIds, setStarredMessageIds] = useState<Set<number>>(
		new Set(),
	);

	// Search and Scroll Navigation coordination
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [jumpToIndex, setJumpToIndex] = useState<number | null>(null);

	// Background parsing states
	const [isParsing, setIsParsing] = useState(false);
	const [parseProgress, setParseProgress] = useState<number | null>(null);

	// Defer mounting heavy VirtualMessageList to let loading view paint first
	const [isConversationReady, setIsConversationReady] = useState(false);

	const loadSavedChats = () => {
		listChats()
			.then(setSavedChats)
			.catch((err) => console.error('Failed to load saved chats:', err));
	};

	useEffect(() => {
		loadSavedChats();
	}, []);

	const handleChatLoaded = (text: string, name: string) => {
		setIsParsing(true);
		setParseProgress(0);

		const worker = new Worker(
			new URL('./utils/parser.worker.ts', import.meta.url),
			{ type: 'module' },
		);

		worker.postMessage({ text });

		worker.onmessage = (
			e: MessageEvent<{
				type: 'progress' | 'complete' | 'error';
				progress?: number;
				messages?: Message[];
				dateMap?: DateMapEntry[];
				participants?: string[];
				senderCounts?: Record<string, number>;
				error?: string;
			}>,
		) => {
			const {
				type,
				progress,
				messages: parsed,
				dateMap: parsedDateMap,
				participants: parsedParticipants,
				senderCounts: parsedSenderCounts,
				error,
			} = e.data;

			if (type === 'progress' && typeof progress === 'number') {
				setParseProgress(progress);
			} else if (type === 'complete' && parsed) {
				worker.terminate();
				setIsParsing(false);
				setParseProgress(null);

				if (parsed.length === 0) {
					alert(
						'Unable to extract any messages. Please check if this is a standard WhatsApp chat log export.',
					);
					return;
				}

				const participantList = parsedParticipants || [];

				setMessages(parsed);
				setDateMap(parsedDateMap || []);
				setParticipants(participantList);
				setSenderCounts(parsedSenderCounts || {});
				setFileName(name);

				// Auto-save to IndexedDB
				saveChat(
					name,
					parsed,
					parsedDateMap || [],
					participantList,
					parsedSenderCounts || {},
					null,
				)
					.then((id) => {
						setCurrentChatId(id);
						loadSavedChats();
					})
					.catch((err) => {
						console.error('Failed to auto-save chat:', err);
					});

				// If there are clear participants, let the user pick their own identity,
				// otherwise jump straight to the reader view.
				if (participantList.length > 0) {
					setStep('SELECT_IDENTITY');
				} else {
					setMe(null);
					setIsConversationReady(false);
					setStep('READER');
				}
			} else if (type === 'error') {
				worker.terminate();
				setIsParsing(false);
				setParseProgress(null);
				alert(`Failed to parse chat log: ${error}`);
			}
		};

		worker.onerror = (err) => {
			console.error('Worker error:', err);
			worker.terminate();
			setIsParsing(false);
			setParseProgress(null);
			alert('An error occurred in the parser background thread.');
		};
	};

	const handleIdentitySelected = (name: string | null) => {
		setMe(name);
		setIsConversationReady(false);
		setStep('READER');

		if (currentChatId) {
			updateChatMe(currentChatId, name)
				.then(() => loadSavedChats())
				.catch((err) => console.error('Failed to update me identity:', err));
		}
	};

	const handleBackToUpload = () => {
		if (
			window.confirm('Are you sure you want to unload the current chat log?')
		) {
			setStep('UPLOAD');
			setIsConversationReady(false);
			setMessages([]);
			setDateMap([]);
			setFileName('');
			setParticipants([]);
			setSenderCounts({});
			setMe(null);
			setCurrentChatId(null);
			setIsSearchOpen(false);
			setSearchQuery('');
			setJumpToIndex(null);
			setStarredMessageIds(new Set());
			setIsStarredOpen(false);
			loadSavedChats(); // Refresh on back
		}
	};

	const handleLoadSavedChat = async (id: string) => {
		setIsParsing(true);
		setParseProgress(0);
		try {
			const metadata = await getChatMetadata(id);
			if (!metadata) {
				alert('Saved chat metadata not found.');
				setIsParsing(false);
				return;
			}

			setParseProgress(30);
			const chatData = await getChatMessages(id);
			if (!chatData) {
				alert('Saved chat messages not found.');
				setIsParsing(false);
				return;
			}

			setParseProgress(70);

			// Update lastOpened in IndexedDB
			await saveChat(
				metadata.fileName,
				chatData.messages,
				chatData.dateMap,
				metadata.participants,
				metadata.senderCounts,
				metadata.me,
				id,
				metadata.starredMessageIds,
			);

			setParseProgress(100);

			setMessages(chatData.messages);
			setDateMap(chatData.dateMap);
			setParticipants(metadata.participants);
			setSenderCounts(metadata.senderCounts);
			setFileName(metadata.fileName);
			setMe(metadata.me);
			setCurrentChatId(id);
			setStarredMessageIds(new Set(metadata.starredMessageIds || []));

			setIsParsing(false);
			setParseProgress(null);

			// If me is set, skip SELECT_IDENTITY and go straight to READER
			if (metadata.me) {
				setIsConversationReady(false);
				setStep('READER');
			} else if (metadata.participants.length > 0) {
				setStep('SELECT_IDENTITY');
			} else {
				setMe(null);
				setIsConversationReady(false);
				setStep('READER');
			}
		} catch (err) {
			console.error('Error loading saved chat:', err);
			alert('Failed to load saved chat.');
			setIsParsing(false);
			setParseProgress(null);
		}
	};

	const handleDeleteSavedChat = async (id: string) => {
		if (
			window.confirm(
				'Are you sure you want to permanently delete this saved chat log?',
			)
		) {
			try {
				await deleteChat(id);
				loadSavedChats();
			} catch (err) {
				console.error('Failed to delete saved chat:', err);
				alert('Failed to delete saved chat.');
			}
		}
	};

	const handleRenameSavedChat = async (id: string, newName: string) => {
		try {
			await renameChat(id, newName);
			loadSavedChats();
		} catch (err) {
			console.error('Failed to rename saved chat:', err);
			alert('Failed to rename saved chat.');
		}
	};

	const handleRenameCurrentChat = (newName: string) => {
		setFileName(newName);
		if (currentChatId) {
			renameChat(currentChatId, newName)
				.then(() => loadSavedChats())
				.catch((err) => console.error('Failed to rename current chat:', err));
		}
	};

	const handleToggleStarMessage = (messageId: number) => {
		const updated = new Set(starredMessageIds);
		if (updated.has(messageId)) {
			updated.delete(messageId);
		} else {
			updated.add(messageId);
		}
		setStarredMessageIds(updated);

		if (currentChatId) {
			updateChatStarredMessages(currentChatId, Array.from(updated))
				.then(() => loadSavedChats())
				.catch((err) =>
					console.error('Failed to update starred messages:', err),
				);
		}
	};

	const handleJumpToMessage = (index: number) => {
		setJumpToIndex(index);
		// On mobile, close search sidebar after jumping to keep things uncluttered
		if (window.innerWidth < 768) {
			setIsSearchOpen(false);
			setIsStarredOpen(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#fafaf9] flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
			<AnimatePresence mode="wait">
				{isParsing && (
					<motion.div
						key="parsing"
						initial={{ opacity: 0, scale: 0.98 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.98 }}
						transition={{ duration: 0.25, ease: 'easeOut' }}
						className="flex-1 flex flex-col justify-center items-center py-12 px-4 max-w-xl mx-auto w-full"
					>
						<div className="w-full bg-white rounded-2xl border border-neutral-200/60 p-8 md:p-12 text-center shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
							{/* Pulse decoration background */}
							<div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-70 pointer-events-none" />
							<div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-50 rounded-full blur-3xl opacity-70 pointer-events-none" />

							{/* Icon and Loading indicator */}
							<div className="relative mb-6">
								<div className="p-4 bg-emerald-50 text-emerald-600 rounded-full inline-flex relative z-10 animate-pulse">
									<Loader2 className="w-8 h-8 animate-spin" />
								</div>
								<div className="absolute inset-0 bg-emerald-100 rounded-full blur-md opacity-50 scale-125" />
							</div>

							{/* Text Status */}
							<h2 className="font-display text-2xl font-semibold text-neutral-900 mb-2">
								Analyzing Chat Log
							</h2>
							<p className="text-neutral-500 font-sans text-sm md:text-base max-w-sm mb-8 leading-relaxed">
								{parseProgress !== null &&
									parseProgress < 35 &&
									'Reading file structure...'}
								{parseProgress !== null &&
									parseProgress >= 35 &&
									parseProgress < 75 &&
									'Parsing timestamps and message contents...'}
								{parseProgress !== null &&
									parseProgress >= 75 &&
									parseProgress < 100 &&
									'Detecting senders and formatting data...'}
								{parseProgress === 100 && 'Finalizing chat database...'}
							</p>

							{/* Progress Bar */}
							<div className="w-full max-w-md mb-3">
								<div className="flex justify-between items-center mb-2">
									<span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-sans">
										Parsing Progress
									</span>
									<span className="text-sm font-bold font-mono text-emerald-600">
										{parseProgress ?? 0}%
									</span>
								</div>
								<div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50">
									<motion.div
										className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
										initial={{ width: 0 }}
										animate={{ width: `${parseProgress ?? 0}%` }}
										transition={{ duration: 0.1, ease: 'easeOut' }}
									/>
								</div>
							</div>

							{/* Security Badge */}
							<div className="mt-8 pt-6 border-t border-neutral-100 w-full flex items-center justify-center gap-2 text-xs text-neutral-400 font-sans">
								<ShieldCheck className="w-4 h-4 text-emerald-500" />
								<span>Parsed 100% offline & secure in your browser.</span>
							</div>
						</div>
					</motion.div>
				)}

				{!isParsing && step === 'UPLOAD' && (
					<motion.div
						key="upload"
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -15 }}
						transition={{ duration: 0.25, ease: 'easeOut' }}
						className="flex-1 flex flex-col justify-center py-6"
					>
						<FileUploader
							onChatLoaded={handleChatLoaded}
							savedChats={savedChats}
							onLoadSavedChat={handleLoadSavedChat}
							onDeleteSavedChat={handleDeleteSavedChat}
							onRenameSavedChat={handleRenameSavedChat}
						/>
					</motion.div>
				)}

				{!isParsing && step === 'SELECT_IDENTITY' && (
					<motion.div
						key="identity"
						initial={{ opacity: 0, scale: 0.98 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.98 }}
						transition={{ duration: 0.25, ease: 'easeOut' }}
						className="flex-1 flex flex-col justify-center py-6"
					>
						<ParticipantSelector
							participants={participants}
							senderCounts={senderCounts}
							onSelectMe={handleIdentitySelected}
							fileName={fileName}
						/>
					</motion.div>
				)}

				{!isParsing && step === 'READER' && (
					<motion.div
						key="reader"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						onAnimationComplete={() => {
							if (step === 'READER') {
								setIsConversationReady(true);
							}
						}}
						className="flex-1 flex flex-col h-screen overflow-hidden"
					>
						{/* Header Area */}
						<ChatHeader
							fileName={fileName}
							messages={messages}
							participants={participants}
							me={me}
							onBack={handleBackToUpload}
							onSearchToggle={() => {
								setIsSearchOpen(!isSearchOpen);
								setIsStarredOpen(false);
							}}
							isSearchOpen={isSearchOpen}
							onJumpToMessage={handleJumpToMessage}
							dateMap={dateMap}
							onRename={handleRenameCurrentChat}
							onChangeIdentity={() => setStep('SELECT_IDENTITY')}
							isStarredOpen={isStarredOpen}
							onStarredToggle={() => {
								setIsStarredOpen(!isStarredOpen);
								setIsSearchOpen(false);
							}}
						/>

						{/* Chat Area Content Workspace */}
						<div className="flex-1 flex flex-row overflow-hidden relative justify-center items-stretch">
							{isConversationReady ? (
								<>
									{/* Main Scrolling Viewer */}
									<VirtualMessageList
										messages={messages}
										me={me}
										searchQuery={searchQuery}
										jumpToIndex={jumpToIndex}
										onJumpDone={() => setJumpToIndex(null)}
										starredMessageIds={starredMessageIds}
										onToggleStarMessage={handleToggleStarMessage}
									/>

									{/* Collapsible Slide-out Search Panel */}
									<AnimatePresence>
										{isSearchOpen && (
											<motion.div
												initial={{ x: '100%' }}
												animate={{ x: 0 }}
												exit={{ x: '100%' }}
												transition={{
													type: 'spring',
													damping: 25,
													stiffness: 220,
												}}
												className="absolute right-0 top-0 bottom-0 md:relative h-full shadow-2xl md:shadow-none z-40 max-w-full"
											>
												<SearchPanel
													messages={messages}
													searchQuery={searchQuery}
													onSearchQueryChange={setSearchQuery}
													onSelectMatch={handleJumpToMessage}
													onClose={() => setIsSearchOpen(false)}
												/>
											</motion.div>
										)}
									</AnimatePresence>

									{/* Collapsible Slide-out Starred Messages Panel */}
									<AnimatePresence>
										{isStarredOpen && (
											<motion.div
												initial={{ x: '100%' }}
												animate={{ x: 0 }}
												exit={{ x: '100%' }}
												transition={{
													type: 'spring',
													damping: 25,
													stiffness: 220,
												}}
												className="absolute right-0 top-0 bottom-0 md:relative h-full shadow-2xl md:shadow-none z-40 max-w-full"
											>
												<StarredPanel
													messages={messages}
													starredMessageIds={starredMessageIds}
													onSelectMessage={handleJumpToMessage}
													onClose={() => setIsStarredOpen(false)}
													onToggleStar={handleToggleStarMessage}
												/>
											</motion.div>
										)}
									</AnimatePresence>
								</>
							) : (
								<div className="flex flex-col items-center justify-center gap-3 py-12">
									<Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
									<p className="text-neutral-500 font-sans text-sm font-medium animate-pulse">
										Loading conversation...
									</p>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
