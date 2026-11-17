import { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import FileUploader from './components/FileUploader';
import ParticipantSelector from './components/ParticipantSelector';
import ChatHeader from './components/ChatHeader';
import VirtualMessageList from './components/VirtualMessageList';
import SearchPanel from './components/SearchPanel';
import StarredPanel from './components/StarredPanel';
import ResultNavigator from './components/ResultNavigator';
import { findSearchMatches, findStarredMessages } from './utils/search';
import type { Message, DateMapEntry } from './types';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
	saveChat,
	getChatMetadata,
	getChatMessages,
	updateChatMetadata,
	getChatChunk,
	DB_CHUNK_SIZE,
} from './utils/db';

import { useChatStore } from './store/useChatStore';
import { useChatParser } from './hooks/useChatParser';
import { useChatPersistence } from './hooks/useChatPersistence';
import { useChunkedMessages } from './hooks/useChunkedMessages';
import { useStarredMessages } from './hooks/useStarredMessages';
import { useSearchAndJump } from './hooks/useSearchAndJump';

export default function App() {
	const queryClient = useQueryClient();

	// Zustand store
	const {
		step,
		setStep,
		dateMap,
		setDateMap,
		fileName,
		setFileName,
		participants,
		setParticipants,
		senderCounts,
		setSenderCounts,
		me,
		setMe,
		currentChatId,
		setCurrentChatId,
		isConversationReady,
		setIsConversationReady,
		isSearchOpen,
		setIsSearchOpen,
		isStarredOpen,
		setIsStarredOpen,
		searchQuery,
		setSearchQuery,
		jumpToIndex,
		setJumpToIndex,
		navMode,
		setNavMode,
		activeIndex,
		toggleSearch,
		toggleStarred,
		setTotalMessages,
		reset: resetStore,
	} = useChatStore();

	// Custom hooks
	const { savedChats, loadSavedChats, deleteChat, renameChat } =
		useChatPersistence();

	const { messages, isFullyLoaded, setLoadedChunks, loadChunk } =
		useChunkedMessages(currentChatId, step);

	const { starredMessageIds, setStarredMessageIds, toggleStarMessage } =
		useStarredMessages(currentChatId, loadSavedChats);

	const { jumpToMessage } = useSearchAndJump();

	// Shared by the panels and the navigator so both see the same list.
	const searchMatches = useMemo(
		() => findSearchMatches(messages, searchQuery),
		[messages, searchQuery],
	);
	const starredItems = useMemo(
		() => findStarredMessages(messages, starredMessageIds),
		[messages, starredMessageIds],
	);
	const jumpToSearchResult = useCallback(
		(index: number) => jumpToMessage(index, 'search'),
		[jumpToMessage],
	);
	const jumpToStarred = useCallback(
		(index: number) => jumpToMessage(index, 'starred'),
		[jumpToMessage],
	);

	const navItems = navMode === 'search' ? searchMatches : starredItems;
	const showNavigator =
		navMode !== null && !isSearchOpen && !isStarredOpen && navItems.length > 0;

	// Stable identity: VirtualMessageList's jump effect depends on it.
	const clearJump = useCallback(() => setJumpToIndex(null), [setJumpToIndex]);

	const handleParseComplete = useCallback(
		({
			messages: parsed,
			dateMap: parsedDateMap,
			participants: parsedParticipants,
			senderCounts: parsedSenderCounts,
			fileName: name,
		}: {
			messages: Message[];
			dateMap: DateMapEntry[];
			participants: string[];
			senderCounts: Record<string, number>;
			fileName: string;
		}) => {
			const participantList = parsedParticipants || [];

			setDateMap(parsedDateMap || []);
			setParticipants(participantList);
			setSenderCounts(parsedSenderCounts || {});
			setFileName(name);

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
					setTotalMessages(parsed.length);

					// Hydrate TanStack Query cache with all chunks
					const chunkCount = Math.ceil(parsed.length / DB_CHUNK_SIZE);
					const allLoaded = new Set<number>();
					for (let i = 0; i < chunkCount; i++) {
						const chunkMessages = parsed.slice(
							i * DB_CHUNK_SIZE,
							(i + 1) * DB_CHUNK_SIZE,
						);
						queryClient.setQueryData(['chat', id, 'chunk', i], chunkMessages);
						allLoaded.add(i);
					}
					setLoadedChunks(allLoaded);
					loadSavedChats();
				})
				.catch((err) => {
					console.error('Failed to auto-save chat:', err);
				});

			if (participantList.length > 0) {
				setStep('SELECT_IDENTITY');
			} else {
				setMe(null);
				setIsConversationReady(false);
				setStep('READER');
			}
		},
		[
			loadSavedChats,
			setLoadedChunks,
			setDateMap,
			setParticipants,
			setSenderCounts,
			setFileName,
			setCurrentChatId,
			setTotalMessages,
			setStep,
			setMe,
			setIsConversationReady,
			queryClient,
		],
	);

	const handleParseError = useCallback((err: string) => {
		alert(err);
	}, []);

	const { parse, isParsing, setIsParsing, parseProgress, setParseProgress } =
		useChatParser({
			onComplete: handleParseComplete,
			onError: handleParseError,
		});

	const handleIdentitySelected = (name: string | null) => {
		setMe(name);
		setIsConversationReady(false);
		setStep('READER');

		if (currentChatId) {
			updateChatMetadata(currentChatId, { me: name })
				.then(() => loadSavedChats())
				.catch((err) => console.error('Failed to update me identity:', err));
		}
	};

	const handleBackToUpload = () => {
		if (
			window.confirm('Are you sure you want to unload the current chat log?')
		) {
			resetStore();
			setStarredMessageIds(new Set());
			loadSavedChats();
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

			let dateMapList: DateMapEntry[] = [];
			const loaded = new Set<number>();

			if (metadata.chunkCount) {
				dateMapList = metadata.dateMap || [];

				// The reader opens at the top (oldest message), so seed the first
				// chunk; the rest stream in oldest-to-newest in the background.
				const firstChunk = await getChatChunk(id, 0);
				if (firstChunk) {
					queryClient.setQueryData(['chat', id, 'chunk', 0], firstChunk);
				}
				loaded.add(0);
				setParseProgress(70);
			} else {
				const chatData = await getChatMessages(id);
				if (!chatData) {
					alert('Saved chat messages not found.');
					setIsParsing(false);
					return;
				}
				const messagesList = chatData.messages;
				dateMapList = chatData.dateMap;
				setParseProgress(70);

				await saveChat(
					metadata.fileName,
					messagesList,
					dateMapList,
					metadata.participants,
					metadata.senderCounts,
					metadata.me,
					id,
					metadata.starredMessageIds,
				);

				const chunkCount = Math.ceil(messagesList.length / DB_CHUNK_SIZE);
				for (let i = 0; i < chunkCount; i++) {
					const chunkMessages = messagesList.slice(
						i * DB_CHUNK_SIZE,
						(i + 1) * DB_CHUNK_SIZE,
					);
					queryClient.setQueryData(['chat', id, 'chunk', i], chunkMessages);
					loaded.add(i);
				}
			}

			await updateChatMetadata(id, { lastOpened: Date.now() });

			setParseProgress(100);

			setDateMap(dateMapList);
			setParticipants(metadata.participants);
			setSenderCounts(metadata.senderCounts);
			setFileName(metadata.fileName);
			setMe(metadata.me);
			setTotalMessages(metadata.messageCount);
			setCurrentChatId(id);
			setStarredMessageIds(new Set(metadata.starredMessageIds || []));
			setLoadedChunks(loaded);

			setIsParsing(false);
			setParseProgress(null);

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

	const handleRenameCurrentChat = (newName: string) => {
		setFileName(newName);
		if (currentChatId) {
			renameChat(currentChatId, newName);
		}
	};

	return (
		<div className="min-h-screen bg-surface-backdrop flex flex-col antialiased selection:bg-brand-surface-hover selection:text-text-brand-hover">
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
						<div className="w-full bg-surface rounded-2xl border border-border-base/60 p-8 md:p-12 text-center shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
							<div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-surface rounded-full blur-3xl opacity-70 pointer-events-none" />
							<div className="absolute -left-10 -bottom-10 w-40 h-40 bg-surface-hover rounded-full blur-3xl opacity-70 pointer-events-none" />

							<div className="relative mb-6">
								<div className="p-4 bg-brand-surface text-text-brand rounded-full inline-flex relative z-10 animate-pulse">
									<Loader2 className="w-8 h-8 animate-spin" />
								</div>
								<div className="absolute inset-0 bg-brand-surface-hover rounded-full blur-md opacity-50 scale-125" />
							</div>

							<h2 className="font-display text-2xl font-semibold text-text-primary mb-2">
								Analyzing Chat Log
							</h2>
							<p className="text-text-tertiary font-sans text-sm md:text-base max-w-sm mb-8 leading-relaxed">
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

							<div className="w-full max-w-md mb-3">
								<div className="flex justify-between items-center mb-2">
									<span className="text-xs font-semibold text-text-muted uppercase tracking-wider font-sans">
										Parsing Progress
									</span>
									<span className="text-sm font-bold font-mono text-text-brand">
										{parseProgress ?? 0}%
									</span>
								</div>
								<div className="w-full h-2.5 bg-surface-active rounded-full overflow-hidden border border-border-base/50">
									<motion.div
										className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full"
										initial={{ width: 0 }}
										animate={{ width: `${parseProgress ?? 0}%` }}
										transition={{ duration: 0.1, ease: 'easeOut' }}
									/>
								</div>
							</div>

							<div className="mt-8 pt-6 border-t border-border-subtle w-full flex items-center justify-center gap-2 text-xs text-text-muted font-sans">
								<ShieldCheck className="w-4 h-4 text-text-brand" />
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
							onChatLoaded={parse}
							savedChats={savedChats}
							onLoadSavedChat={handleLoadSavedChat}
							onDeleteSavedChat={deleteChat}
							onRenameSavedChat={renameChat}
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
						className="flex-1 flex flex-col h-dvh overflow-hidden pt-16"
					>
						<ChatHeader
							fileName={fileName}
							messages={messages}
							participants={participants}
							me={me}
							onBack={handleBackToUpload}
							onSearchToggle={toggleSearch}
							isSearchOpen={isSearchOpen}
							onJumpToMessage={jumpToMessage}
							dateMap={dateMap}
							onRename={handleRenameCurrentChat}
							onChangeIdentity={() => setStep('SELECT_IDENTITY')}
							isStarredOpen={isStarredOpen}
							onStarredToggle={toggleStarred}
						/>

						<div className="flex-1 flex flex-row overflow-hidden relative justify-center items-stretch">
							{isConversationReady ? (
								<>
									<div className="flex-1 min-w-0 h-full flex flex-col">
										<VirtualMessageList
											messages={messages}
											me={me}
											searchQuery={searchQuery}
											jumpToIndex={jumpToIndex}
											onJumpDone={clearJump}
											starredMessageIds={starredMessageIds}
											onToggleStarMessage={toggleStarMessage}
											onLoadChunk={loadChunk}
										/>
										{showNavigator && navMode && (
											<ResultNavigator
												mode={navMode}
												label={
													navMode === 'search' ? `"${searchQuery}"` : 'Starred'
												}
												items={navItems}
												activeIndex={activeIndex}
												onJump={(index) => jumpToMessage(index, navMode)}
												onOpenList={
													navMode === 'search' ? toggleSearch : toggleStarred
												}
												onClose={() =>
													navMode === 'search'
														? setSearchQuery('')
														: setNavMode(null)
												}
											/>
										)}
									</div>

									<AnimatePresence>
										{(isSearchOpen || isStarredOpen) && (
											<motion.div
												key="sidebar-panel"
												initial={{ x: '100%' }}
												animate={{ x: 0 }}
												exit={{ x: '100%' }}
												transition={{
													type: 'spring',
													damping: 25,
													stiffness: 220,
												}}
												// Mobile: full-screen overlay (inset-0, so it never
												// shrink-wraps to its content). md+: docked in the flex
												// row so the chat narrows instead of being covered.
												className="absolute inset-0 z-40 shadow-2xl overflow-hidden flex flex-col md:static md:inset-auto md:w-[380px] md:shrink-0 md:shadow-none"
											>
												<AnimatePresence mode="wait" initial={false}>
													{isSearchOpen ? (
														<motion.div
															key="search"
															initial={{ opacity: 0 }}
															animate={{ opacity: 1 }}
															exit={{ opacity: 0 }}
															transition={{ duration: 0.15 }}
															className="h-full flex flex-col"
														>
															<SearchPanel
																matches={searchMatches}
																activeIndex={activeIndex}
																searchQuery={searchQuery}
																isLoadingHistory={!isFullyLoaded}
																onSearchQueryChange={setSearchQuery}
																onSelectMatch={jumpToSearchResult}
																onClose={() => setIsSearchOpen(false)}
															/>
														</motion.div>
													) : (
														<motion.div
															key="starred"
															initial={{ opacity: 0 }}
															animate={{ opacity: 1 }}
															exit={{ opacity: 0 }}
															transition={{ duration: 0.15 }}
															className="h-full flex flex-col"
														>
															<StarredPanel
																items={starredItems}
																activeIndex={activeIndex}
																isLoadingHistory={!isFullyLoaded}
																onSelectMessage={jumpToStarred}
																onClose={() => setIsStarredOpen(false)}
																onToggleStar={toggleStarMessage}
															/>
														</motion.div>
													)}
												</AnimatePresence>
											</motion.div>
										)}
									</AnimatePresence>
								</>
							) : (
								<div className="flex flex-col items-center justify-center gap-3 py-12">
									<Loader2 className="w-10 h-10 text-text-brand animate-spin" />
									<p className="text-text-tertiary font-sans text-sm font-medium animate-pulse">
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
