<script lang="ts">
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
} from 'lucide-svelte';
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

interface Props {
	onChatLoaded: (text: string, fileName: string) => void;
	savedChats: SavedChatMetadata[];
	onLoadSavedChat: (id: string) => void;
	onDeleteSavedChat: (id: string) => void;
	onRenameSavedChat: (id: string, newName: string) => void;
}

let {
	onChatLoaded,
	savedChats,
	onLoadSavedChat,
	onDeleteSavedChat,
	onRenameSavedChat,
}: Props = $props();

let isDragging = $state(false);
let error = $state<string | null>(null);
let fileInputRef = $state<HTMLInputElement | null>(null);

// Inline editing states for saved chats
let editingId = $state<string | null>(null);
let editNameValue = $state('');
let renameInputRef = $state<HTMLInputElement | null>(null);

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

const handleFile = (file: File) => {
	if (!file.name.endsWith('.txt')) {
		error = 'Please upload a valid WhatsApp export .txt file.';
		return;
	}

	const reader = new FileReader();
	reader.onload = (e) => {
		const text = e.target?.result as string;
		if (!text || text.trim().length === 0) {
			error = 'The selected file is empty.';
			return;
		}
		error = null;
		onChatLoaded(text, file.name);
	};
	reader.onerror = () => {
		error = 'An error occurred while reading the file.';
	};
	reader.readAsText(file);
};

const onDragOver = (e: DragEvent) => {
	e.preventDefault();
	isDragging = true;
};

const onDragLeave = () => {
	isDragging = false;
};

const onDrop = (e: DragEvent) => {
	e.preventDefault();
	isDragging = false;
	if (e.dataTransfer?.files?.[0]) {
		handleFile(e.dataTransfer.files[0]);
	}
};

const onFileSelect = (e: Event) => {
	const target = e.target as HTMLInputElement;
	if (target.files?.[0]) {
		handleFile(target.files[0]);
	}
};

const loadDemo = () => {
	onChatLoaded(SAMPLE_CHAT, 'Weekend Plans (Sample Chat).txt');
};

const startRename = (e: MouseEvent, chat: SavedChatMetadata) => {
	e.stopPropagation();
	editingId = chat.id;
	// Strip extension for editing
	const displayName = chat.fileName.replace(/\.[^/.]+$/, '');
	editNameValue = displayName;
	setTimeout(() => {
		renameInputRef?.focus();
		renameInputRef?.select();
	}, 50);
};

const cancelRename = (e?: MouseEvent | FocusEvent) => {
	e?.stopPropagation();
	editingId = null;
	editNameValue = '';
};

const submitRename = (
	e: MouseEvent | SubmitEvent | Event,
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
	editingId = null;
	editNameValue = '';
};
</script>

<div
	id="file-uploader-container"
	class="w-full max-w-2xl mx-auto px-4 py-8 md:py-16 flex flex-col items-center"
>
	<div class="text-center mb-8">
		<h1 class="font-display text-4xl font-semibold tracking-tight text-neutral-900 mb-3">
			WhatsApp Chat Reader
		</h1>
		<p class="text-neutral-500 font-sans max-w-md mx-auto text-sm md:text-base leading-relaxed">
			An offline-first, blazing-fast reader designed to render, search, and
			navigate large exported WhatsApp chat logs beautifully.
		</p>
	</div>

	<!-- Main Drag & Drop / Upload Card -->
	<button
		id="dropzone"
		type="button"
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
		onclick={() => fileInputRef?.click()}
		class="w-full bg-white rounded-2xl border-2 border-dashed p-8 md:p-12 text-center cursor-pointer transition-all duration-200 shadow-sm flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 {
			isDragging
				? 'border-emerald-500 bg-emerald-50/40 scale-[0.99]'
				: 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
		}"
	>
		<input
			type="file"
			bind:this={fileInputRef}
			onchange={onFileSelect}
			accept=".txt"
			class="hidden"
		/>

		<span
			class="p-4 rounded-full mb-4 transition-colors inline-flex {isDragging ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-50 text-neutral-400 group-hover:bg-neutral-100'}"
		>
			<Upload class="w-8 h-8" />
		</span>

		<span class="font-sans font-medium text-neutral-800 text-base mb-1 block">
			{isDragging
				? 'Drop your chat file here!'
				: 'Drag & drop your chat .txt file here'}
		</span>
		<span class="font-sans text-neutral-400 text-xs md:text-sm mb-4 block">
			or click to browse your local files
		</span>

		<span class="px-3 py-1 bg-neutral-100 text-neutral-600 font-mono text-[10px] uppercase tracking-wider rounded-md font-semibold inline-block">
			Supports iOS & Android formats
		</span>
	</button>

	{#if error}
		<div class="mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100 text-sm max-w-full">
			<AlertCircle class="w-4 h-4 shrink-0" />
			<p class="font-sans">{error}</p>
		</div>
	{/if}

	<!-- Demo / Sample Chat Trigger -->
	<div class="mt-6 w-full flex items-center justify-center">
		<button
			type="button"
			onclick={loadDemo}
			class="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-sans font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 touch-manipulation min-h-[44px]"
		>
			<BookOpen class="w-4 h-4" />
			Load Sample Weekend Chat
		</button>
	</div>

	<!-- Saved Chats List -->
	{#if savedChats.length > 0}
		<div class="mt-10 w-full">
			<h3 class="font-sans font-semibold text-neutral-800 text-sm md:text-base mb-4 flex items-center gap-2">
				<History class="w-4 h-4 text-emerald-600" />
				Recently Read Chats
			</h3>
			<div class="bg-white rounded-2xl border border-neutral-200/60 shadow-sm divide-y divide-neutral-100 overflow-hidden w-full">
				{#each savedChats as chat (chat.id)}
					{@const displayName = chat.fileName.replace(/\.[^/.]+$/, '')}
					{@const isEditing = editingId === chat.id}

					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						onclick={() => onLoadSavedChat(chat.id)}
						class="group p-4 hover:bg-neutral-50/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
					>
						<div class="min-w-0 flex-1">
							{#if isEditing}
								<form
									onsubmit={(e) => submitRename(e, chat)}
									class="flex items-center gap-2"
								>
									<input
										bind:this={renameInputRef}
										type="text"
										bind:value={editNameValue}
										onclick={(e) => e.stopPropagation()}
										onblur={() => {
											// Give click event on confirm button priority
											setTimeout(() => {
												if (editingId === chat.id) cancelRename();
											}, 200);
										}}
										class="font-sans font-semibold text-neutral-800 text-sm md:text-base leading-tight bg-neutral-50 border border-neutral-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full max-w-xs"
									/>
									<button
										type="submit"
										onclick={(e) => e.stopPropagation()}
										class="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"
										title="Confirm rename"
									>
										<Check class="w-4 h-4" />
									</button>
									<button
										type="button"
										onclick={cancelRename}
										class="p-1.5 hover:bg-neutral-100 text-neutral-500 rounded-lg"
										title="Cancel"
									>
										<X class="w-4 h-4" />
									</button>
								</form>
							{:else}
								<h4 class="font-sans font-semibold text-neutral-800 text-sm md:text-base leading-tight truncate group-hover:text-emerald-700 transition-colors">
									{displayName}
								</h4>
								<div class="text-neutral-400 font-sans text-xs flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
									<span class="flex items-center gap-1">
										<Users class="w-3.5 h-3.5" />
										{chat.participants.length}
									</span>
									<span>•</span>
									<span class="flex items-center gap-1">
										<MessageSquare class="w-3.5 h-3.5" />
										{chat.messageCount.toLocaleString()}
									</span>
									<span>•</span>
									<span>
										Opened {formatRelativeTime(chat.lastOpened)}
									</span>
									{#if chat.me}
										<span>•</span>
										<span class="text-emerald-600/80 font-medium">
											Me: {chat.me}
										</span>
									{/if}
								</div>
							{/if}
						</div>

						{#if !isEditing}
							<div class="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onclick={(e) => startRename(e, chat)}
									class="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none"
									title="Rename chat log"
								>
									<Pencil class="w-4 h-4" />
								</button>
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										onDeleteSavedChat(chat.id);
									}}
									class="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
									title="Delete saved chat"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Instructions Card -->
	<div class="mt-10 w-full bg-neutral-50 rounded-2xl p-6 md:p-8 border border-neutral-100">
		<h3 class="font-sans font-semibold text-neutral-800 text-sm md:text-base mb-4 flex items-center gap-2">
			<FileText class="w-4 h-4 text-emerald-600" />
			How to export your chat from WhatsApp:
		</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm text-neutral-600">
			<div>
				<h4 class="font-sans font-medium text-neutral-800 mb-1.5">
					For iOS (iPhone)
				</h4>
				<ol class="list-decimal list-inside space-y-1 font-sans leading-relaxed">
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
						<code class="font-mono bg-neutral-100 px-1 rounded">
							_chat.txt
						</code>{' '}
						file.
					</li>
				</ol>
			</div>
			<div>
				<h4 class="font-sans font-medium text-neutral-800 mb-1.5">
					For Android
				</h4>
				<ol class="list-decimal list-inside space-y-1 font-sans leading-relaxed">
					<li>Open WhatsApp and open the chat.</li>
					<li>Tap the three vertical dots (⋮) in the top right.</li>
					<li>
						Select <strong>More</strong> &rarr; <strong>Export chat</strong>.
					</li>
					<li>
						Choose <strong>Without media</strong>.
					</li>
					<li>
						Save the exported{' '}
						<code class="font-mono bg-neutral-100 px-1 rounded">
							WhatsApp Chat with ....txt
						</code>{' '}
						file.
					</li>
				</ol>
			</div>
		</div>
		<div class="mt-6 pt-4 border-t border-neutral-100 flex items-start gap-2.5">
			<AlertCircle class="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
			<p class="font-sans text-xs text-neutral-400 leading-relaxed">
				<strong>Security & Privacy:</strong> This reader is 100%
				offline-first. Your uploaded chat file is parsed completely inside
				your local browser. No data, text, or file content is ever
				transmitted to any external server or cloud service.
			</p>
		</div>
	</div>
</div>
