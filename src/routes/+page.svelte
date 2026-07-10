<script lang="ts">
import { onMount } from 'svelte';
import { fade, fly } from 'svelte/transition';
import { SvelteSet } from 'svelte/reactivity';
import FileUploader from '../components/FileUploader.svelte';
import ParticipantSelector from '../components/ParticipantSelector.svelte';
import ChatHeader from '../components/ChatHeader.svelte';
import VirtualMessageList from '../components/VirtualMessageList.svelte';
import SearchPanel from '../components/SearchPanel.svelte';
import StarredPanel from '../components/StarredPanel.svelte';
import type { Message, DateMapEntry } from '../types';
import { Loader2, ShieldCheck } from 'lucide-svelte';
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
} from '../utils/db';

type AppStep = 'UPLOAD' | 'SELECT_IDENTITY' | 'READER';

let step = $state<AppStep>('UPLOAD');
let messages = $state<Message[]>([]);
let dateMap = $state<DateMapEntry[]>([]);
let fileName = $state<string>('');
let participants = $state<string[]>([]);
let senderCounts = $state<Record<string, number>>({});
let me = $state<string | null>(null);

// Saved chats state
let savedChats = $state<ChatMetadata[]>([]);
let currentChatId = $state<string | null>(null);

// Starred messages state
let isStarredOpen = $state(false);
let starredMessageIds = new SvelteSet<number>();

// Search and Scroll Navigation coordination
let isSearchOpen = $state(false);
let searchQuery = $state('');
let jumpToIndex = $state<number | null>(null);

// Background parsing states
let isParsing = $state(false);
let parseProgress = $state<number | null>(null);

// Defer mounting heavy VirtualMessageList to let loading view paint first
let isConversationReady = $state(false);

// Automatically set conversation as ready shortly after entering the reader step
$effect(() => {
	if (step === 'READER') {
		const timer = setTimeout(() => {
			isConversationReady = true;
		}, 100);
		return () => clearTimeout(timer);
	} else {
		isConversationReady = false;
	}
});

const loadSavedChats = () => {
	listChats()
		.then((chats) => {
			savedChats = chats;
		})
		.catch((err) => console.error('Failed to load saved chats:', err));
};

onMount(() => {
	loadSavedChats();
});

const handleChatLoaded = (text: string, name: string) => {
	isParsing = true;
	parseProgress = 0;

	const worker = new Worker(
		new URL('../utils/parser.worker.ts', import.meta.url),
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
			parseProgress = progress;
		} else if (type === 'complete' && parsed) {
			worker.terminate();
			isParsing = false;
			parseProgress = null;

			if (parsed.length === 0) {
				alert(
					'Unable to extract any messages. Please check if this is a standard WhatsApp chat log export.',
				);
				return;
			}

			const participantList = parsedParticipants || [];

			messages = parsed;
			dateMap = parsedDateMap || [];
			participants = participantList;
			senderCounts = parsedSenderCounts || {};
			fileName = name;

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
					currentChatId = id;
					loadSavedChats();
				})
				.catch((err) => {
					console.error('Failed to auto-save chat:', err);
				});

			// If there are clear participants, let the user pick their own identity,
			// otherwise jump straight to the reader view.
			if (participantList.length > 0) {
				step = 'SELECT_IDENTITY';
			} else {
				me = null;
				isConversationReady = false;
				step = 'READER';
			}
		} else if (type === 'error') {
			worker.terminate();
			isParsing = false;
			parseProgress = null;
			alert(`Failed to parse chat log: ${error}`);
		}
	};

	worker.onerror = (err) => {
		console.error('Worker error:', err);
		worker.terminate();
		isParsing = false;
		parseProgress = null;
		alert('An error occurred in the parser background thread.');
	};
};

const handleIdentitySelected = (name: string | null) => {
	me = name;
	isConversationReady = false;
	step = 'READER';

	if (currentChatId) {
		updateChatMe(currentChatId, name)
			.then(() => loadSavedChats())
			.catch((err) => console.error('Failed to update me identity:', err));
	}
};

const handleBackToUpload = () => {
	if (window.confirm('Are you sure you want to unload the current chat log?')) {
		step = 'UPLOAD';
		isConversationReady = false;
		messages = [];
		dateMap = [];
		fileName = '';
		participants = [];
		senderCounts = {};
		me = null;
		currentChatId = null;
		isSearchOpen = false;
		searchQuery = '';
		jumpToIndex = null;
		starredMessageIds.clear();
		isStarredOpen = false;
		loadSavedChats(); // Refresh on back
	}
};

const handleLoadSavedChat = async (id: string) => {
	isParsing = true;
	parseProgress = 0;
	try {
		const metadata = await getChatMetadata(id);
		if (!metadata) {
			alert('Saved chat metadata not found.');
			isParsing = false;
			return;
		}

		parseProgress = 30;
		const chatData = await getChatMessages(id);
		if (!chatData) {
			alert('Saved chat messages not found.');
			isParsing = false;
			return;
		}

		parseProgress = 70;

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

		parseProgress = 100;

		messages = chatData.messages;
		dateMap = chatData.dateMap;
		participants = metadata.participants;
		senderCounts = metadata.senderCounts;
		fileName = metadata.fileName;
		me = metadata.me;
		currentChatId = id;

		starredMessageIds.clear();
		if (metadata.starredMessageIds) {
			for (const mId of metadata.starredMessageIds) {
				starredMessageIds.add(mId);
			}
		}

		isParsing = false;
		parseProgress = null;

		// If me is set, skip SELECT_IDENTITY and go straight to READER
		if (metadata.me) {
			isConversationReady = false;
			step = 'READER';
		} else if (metadata.participants.length > 0) {
			step = 'SELECT_IDENTITY';
		} else {
			me = null;
			isConversationReady = false;
			step = 'READER';
		}
	} catch (err) {
		console.error('Error loading saved chat:', err);
		alert('Failed to load saved chat.');
		isParsing = false;
		parseProgress = null;
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
	fileName = newName;
	if (currentChatId) {
		renameChat(currentChatId, newName)
			.then(() => loadSavedChats())
			.catch((err) => console.error('Failed to rename current chat:', err));
	}
};

const handleToggleStarMessage = (messageId: number) => {
	if (starredMessageIds.has(messageId)) {
		starredMessageIds.delete(messageId);
	} else {
		starredMessageIds.add(messageId);
	}

	if (currentChatId) {
		updateChatStarredMessages(currentChatId, Array.from(starredMessageIds))
			.then(() => loadSavedChats())
			.catch((err) => console.error('Failed to update starred messages:', err));
	}
};

const handleJumpToMessage = (index: number) => {
	jumpToIndex = index;
	// On mobile, close search sidebar after jumping to keep things uncluttered
	if (window.innerWidth < 768) {
		isSearchOpen = false;
		isStarredOpen = false;
	}
};
</script>

<div class="min-h-screen bg-[#fafaf9] flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
	{#if isParsing}
		<div
			transition:fade={{ duration: 250 }}
			class="flex-1 flex flex-col justify-center items-center py-12 px-4 max-w-xl mx-auto w-full"
		>
			<div class="w-full bg-white rounded-2xl border border-neutral-200/60 p-8 md:p-12 text-center shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
				<!-- Pulse decoration background -->
				<div class="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-70 pointer-events-none"></div>
				<div class="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-50 rounded-full blur-3xl opacity-70 pointer-events-none"></div>

				<!-- Icon and Loading indicator -->
				<div class="relative mb-6">
					<div class="p-4 bg-emerald-50 text-emerald-600 rounded-full inline-flex relative z-10 animate-pulse">
						<Loader2 class="w-8 h-8 animate-spin" />
					</div>
					<div class="absolute inset-0 bg-emerald-100 rounded-full blur-md opacity-50 scale-125"></div>
				</div>

				<!-- Text Status -->
				<h2 class="font-display text-2xl font-semibold text-neutral-900 mb-2">
					Analyzing Chat Log
				</h2>
				<p class="text-neutral-500 font-sans text-sm md:text-base max-w-sm mb-8 leading-relaxed">
					{#if parseProgress !== null && parseProgress < 35}
						Reading file structure...
					{:else if parseProgress !== null && parseProgress >= 35 && parseProgress < 75}
						Parsing timestamps and message contents...
					{:else if parseProgress !== null && parseProgress >= 75 && parseProgress < 100}
						Detecting senders and formatting data...
					{:else}
						Finalizing chat database...
					{/if}
				</p>

				<!-- Progress Bar -->
				<div class="w-full max-w-md mb-3">
					<div class="flex justify-between items-center mb-2">
						<span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-sans">
							Parsing Progress
						</span>
						<span class="text-sm font-bold font-mono text-emerald-600">
							{parseProgress ?? 0}%
						</span>
					</div>
					<div class="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50">
						<div
							class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-100"
							style="width: {parseProgress ?? 0}%"
						></div>
					</div>
				</div>

				<!-- Security Badge -->
				<div class="mt-8 pt-6 border-t border-neutral-100 w-full flex items-center justify-center gap-2 text-xs text-neutral-400 font-sans">
					<ShieldCheck class="w-4 h-4 text-emerald-500" />
					<span>Parsed 100% offline & secure in your browser.</span>
				</div>
			</div>
		</div>
	{:else if step === 'UPLOAD'}
		<div
			transition:fade={{ duration: 200 }}
			class="flex-1 flex flex-col justify-center py-6"
		>
			<FileUploader
				onChatLoaded={handleChatLoaded}
				savedChats={savedChats}
				onLoadSavedChat={handleLoadSavedChat}
				onDeleteSavedChat={handleDeleteSavedChat}
				onRenameSavedChat={handleRenameSavedChat}
			/>
		</div>
	{:else if step === 'SELECT_IDENTITY'}
		<div
			transition:fade={{ duration: 200 }}
			class="flex-1 flex flex-col justify-center py-6"
		>
			<ParticipantSelector
				participants={participants}
				senderCounts={senderCounts}
				onSelectMe={handleIdentitySelected}
				fileName={fileName}
			/>
		</div>
	{:else if step === 'READER'}
		<div
			transition:fade={{ duration: 250 }}
			class="flex-1 flex flex-col h-screen overflow-hidden"
		>
			<!-- Header Area -->
			<ChatHeader
				fileName={fileName}
				messages={messages}
				participants={participants}
				me={me}
				onBack={handleBackToUpload}
				onSearchToggle={() => {
					isSearchOpen = !isSearchOpen;
					isStarredOpen = false;
				}}
				isSearchOpen={isSearchOpen}
				onJumpToMessage={handleJumpToMessage}
				dateMap={dateMap}
				onRename={handleRenameCurrentChat}
				onChangeIdentity={() => {
					step = 'SELECT_IDENTITY';
				}}
				isStarredOpen={isStarredOpen}
				onStarredToggle={() => {
					isStarredOpen = !isStarredOpen;
					isSearchOpen = false;
				}}
			/>

			<!-- Chat Area Content Workspace -->
			<div class="flex-1 flex flex-row overflow-hidden relative justify-center items-stretch">
				{#if isConversationReady}
					<!-- Main Scrolling Viewer -->
					<VirtualMessageList
						messages={messages}
						me={me}
						searchQuery={searchQuery}
						jumpToIndex={jumpToIndex}
						onJumpDone={() => {
							jumpToIndex = null;
						}}
						starredMessageIds={starredMessageIds}
						onToggleStarMessage={handleToggleStarMessage}
					/>

					<!-- Collapsible Slide-out Search Panel -->
					{#if isSearchOpen}
						<div
							transition:fly={{ x: 380, duration: 250 }}
							class="absolute right-0 top-0 bottom-0 md:relative h-full shadow-2xl md:shadow-none z-40 max-w-full"
						>
							<SearchPanel
								messages={messages}
								searchQuery={searchQuery}
								onSearchQueryChange={(query) => {
									searchQuery = query;
								}}
								onSelectMatch={handleJumpToMessage}
								onClose={() => {
									isSearchOpen = false;
								}}
							/>
						</div>
					{/if}

					<!-- Collapsible Slide-out Starred Messages Panel -->
					{#if isStarredOpen}
						<div
							transition:fly={{ x: 380, duration: 250 }}
							class="absolute right-0 top-0 bottom-0 md:relative h-full shadow-2xl md:shadow-none z-40 max-w-full"
						>
							<StarredPanel
								messages={messages}
								starredMessageIds={starredMessageIds}
								onSelectMessage={handleJumpToMessage}
								onClose={() => {
									isStarredOpen = false;
								}}
								onToggleStar={handleToggleStarMessage}
							/>
						</div>
					{/if}
				{:else}
					<div class="flex flex-col items-center justify-center gap-3 py-12">
						<Loader2 class="w-10 h-10 text-emerald-600 animate-spin" />
						<p class="text-neutral-500 font-sans text-sm font-medium animate-pulse">
							Loading conversation...
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
