<script lang="ts">
import { onMount } from 'svelte';
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
} from 'lucide-svelte';
import type { Message, DateMapEntry } from '../types';

interface Props {
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

let {
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
}: Props = $props();

let isCalendarOpen = $state(false);
let calendarRef = $state<HTMLDivElement | null>(null);

let isEditingName = $state(false);
const displayName = $derived(fileName.replace(/\.[^/.]+$/, '')); // strip extension
let editValue = $state('');
let inputRef = $state<HTMLInputElement | null>(null);

// Sync editValue when displayName updates
$effect(() => {
	editValue = displayName;
});

// Focus input when editing name
$effect(() => {
	if (isEditingName && inputRef) {
		inputRef.focus();
		inputRef.select();
	}
});

const handleSaveName = () => {
	const trimmed = editValue.trim();
	if (trimmed && trimmed !== displayName) {
		const extMatch = fileName.match(/\.[^/.]+$/);
		const ext = extMatch ? extMatch[0] : '';
		const newFileName = trimmed.endsWith(ext) || !ext ? trimmed : trimmed + ext;
		onRename(newFileName);
	}
	isEditingName = false;
};

const handleKeyDown = (e: KeyboardEvent) => {
	if (e.key === 'Enter') {
		handleSaveName();
	} else if (e.key === 'Escape') {
		editValue = displayName;
		isEditingName = false;
	}
};

// Close calendar popup if clicked outside
onMount(() => {
	function handleClickOutside(event: MouseEvent) {
		if (calendarRef && !calendarRef.contains(event.target as Node)) {
			isCalendarOpen = false;
		}
	}
	document.addEventListener('mousedown', handleClickOutside);
	return () => document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<header class="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0 z-30">
	<div class="flex items-center gap-3 min-w-0">
		<button
			type="button"
			onclick={onBack}
			class="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
			title="Back to file upload"
		>
			<ArrowLeft class="w-5 h-5" />
		</button>

		<div class="min-w-0">
			{#if isEditingName}
				<div class="flex items-center gap-1.5 py-0.5">
					<input
						bind:this={inputRef}
						type="text"
						bind:value={editValue}
						onblur={handleSaveName}
						onkeydown={handleKeyDown}
						class="font-sans font-semibold text-neutral-800 text-sm md:text-base leading-tight bg-neutral-50 border border-neutral-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 max-w-[180px] md:max-w-xs"
					/>
					<button
						type="button"
						onclick={handleSaveName}
						class="p-1 hover:bg-emerald-50 text-emerald-600 rounded"
					>
						<Check class="w-3.5 h-3.5" />
					</button>
				</div>
			{:else}
				<div class="flex items-center gap-1.5 group/title">
					<h2 class="font-sans font-semibold text-neutral-800 text-sm md:text-base leading-tight truncate max-w-[180px] md:max-w-xs">
						{displayName}
					</h2>
					<button
						type="button"
						onclick={() => isEditingName = true}
						class="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-600 opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
						title="Rename chat log"
					>
						<Pencil class="w-3.5 h-3.5" />
					</button>
				</div>
			{/if}
			<p class="text-neutral-400 font-sans text-[11px] leading-tight flex items-center gap-2 truncate mt-0.5">
				<span class="flex items-center gap-0.5">
					<Users class="w-3 h-3" />
					{participants.length} participants
				</span>
				<span>•</span>
				<span class="flex items-center gap-0.5">
					<MessageSquare class="w-3 h-3" />
					{messages.length.toLocaleString()} messages
				</span>
				<span>•</span>
				<button
					type="button"
					onclick={onChangeIdentity}
					class="text-emerald-600 hover:text-emerald-700 font-medium truncate hover:underline focus:outline-none flex items-center gap-0.5 cursor-pointer"
					title="Change who 'Me' is"
				>
					{me ? `Me: ${me}` : 'Set "Me" identity'}
				</button>
			</p>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex items-center gap-1">
		<!-- Calendar Jump Button -->
		{#if dateMap.length > 0}
			<div class="relative" bind:this={calendarRef}>
				<button
					type="button"
					onclick={() => isCalendarOpen = !isCalendarOpen}
					class="p-2 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center {
						isCalendarOpen
							? 'text-emerald-600 bg-emerald-50'
							: 'text-neutral-500 hover:text-neutral-700'
					}"
					title="Jump to date"
				>
					<Calendar class="w-5 h-5" />
				</button>

				{#if isCalendarOpen}
					<div class="absolute right-0 mt-2 w-64 max-h-[320px] bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden flex flex-col z-50">
						<div class="px-3.5 py-2 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between shrink-0">
							<span class="font-sans font-medium text-xs text-neutral-700">
								Chronological Jump
							</span>
							<button
								type="button"
								onclick={() => isCalendarOpen = false}
								class="p-1 text-neutral-400 hover:text-neutral-600 rounded"
							>
								<X class="w-3.5 h-3.5" />
							</button>
						</div>
						<div class="overflow-y-auto py-1 divide-y divide-neutral-50 max-h-[260px] scrollbar-thin">
							{#each dateMap as d (d.dateStr)}
								<button
									type="button"
									onclick={() => {
										onJumpToMessage(d.index);
										isCalendarOpen = false;
									}}
									class="w-full text-left px-4 py-2.5 hover:bg-neutral-50 text-neutral-800 text-xs font-sans transition-colors flex items-center justify-between focus:outline-none focus:bg-neutral-50"
								>
									<span class="font-medium">{d.dateStr}</span>
									<span class="font-mono text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-md">
										{d.count} msgs
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Starred Messages Toggle Button -->
		<button
			type="button"
			onclick={onStarredToggle}
			class="p-2 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center {
				isStarredOpen
					? 'text-amber-600 bg-amber-50'
					: 'text-neutral-500 hover:text-neutral-700'
			}"
			title="Starred messages"
		>
			<Star class="w-5 h-5" />
		</button>

		<!-- Full-text Search Toggle Button -->
		<button
			type="button"
			onclick={onSearchToggle}
			class="p-2 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center {
				isSearchOpen
					? 'text-emerald-600 bg-emerald-50'
					: 'text-neutral-500 hover:text-neutral-700'
			}"
			title="Search messages"
		>
			<Search class="w-5 h-5" />
		</button>
	</div>
</header>
