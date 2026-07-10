<script lang="ts">
import { onMount } from 'svelte';
import { Search, X, MessageSquare, CornerDownRight } from 'lucide-svelte';
import type { Message, SearchMatch } from '../types';

const escapeRegExp = (str: string) =>
	str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Props {
	messages: Message[];
	onSelectMatch: (index: number) => void;
	onClose: () => void;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
}

let {
	messages,
	onSelectMatch,
	onClose,
	searchQuery,
	onSearchQueryChange,
}: Props = $props();

let inputRef = $state<HTMLInputElement | null>(null);
let draftQuery = $state('');

// Sync draftQuery with parent searchQuery when it updates
$effect(() => {
	draftQuery = searchQuery;
});

// Focus search input on mount
onMount(() => {
	inputRef?.focus();
});

// Compute matches reactively (equivalent to useMemo)
const matches = $derived.by<SearchMatch[]>(() => {
	if (!searchQuery || searchQuery.trim().length < 2) return [];

	const queryLower = searchQuery.toLowerCase();
	const results: SearchMatch[] = [];

	// Scan through pre-indexed lowercase content
	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		if (msg.contentLower.includes(queryLower)) {
			results.push({
				index: i,
				message: msg,
			});
		}
	}
	return results;
});

const MAX_SIDEBAR_MATCHES = 200;
const slicedMatches = $derived(matches.slice(0, MAX_SIDEBAR_MATCHES));

const handleInputChange = (e: Event) => {
	const target = e.target as HTMLInputElement;
	draftQuery = target.value;
};

const handleSearchSubmit = (e: SubmitEvent | Event) => {
	e.preventDefault();
	onSearchQueryChange(draftQuery);
};

const clearSearch = () => {
	draftQuery = '';
	onSearchQueryChange('');
	inputRef?.focus();
};

// For highlighting matched queries in Svelte template
const searchRegex = $derived(
	searchQuery ? new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi') : null,
);
</script>

<div class="w-full md:w-[380px] bg-white border-l border-neutral-200 flex flex-col h-full shadow-2xl md:shadow-none shrink-0 z-40 relative">
	<!-- Header -->
	<div class="p-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
		<h3 class="font-sans font-semibold text-neutral-800 text-sm md:text-base flex items-center gap-2">
			<Search class="w-4 h-4 text-neutral-500" />
			Search Messages
		</h3>
		<button
			type="button"
			onclick={onClose}
			class="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors focus:outline-none touch-manipulation min-h-[36px]"
		>
			<X class="w-4 h-4" />
		</button>
	</div>

	<!-- Input area -->
	<div class="p-4 border-b border-neutral-100 shrink-0">
		<form onsubmit={handleSearchSubmit} class="flex gap-2">
			<div class="relative flex-1">
				<input
					type="text"
					bind:this={inputRef}
					value={draftQuery}
					oninput={handleInputChange}
					placeholder="Search words, phrases..."
					class="w-full pl-9 pr-8 py-2 border border-neutral-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-neutral-400 bg-neutral-50/50"
				/>
				<Search class="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
				{#if draftQuery}
					<button
						type="button"
						onclick={clearSearch}
						class="absolute right-2.5 top-2.5 p-0.5 hover:bg-neutral-200 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors"
					>
						<X class="w-3.5 h-3.5" />
					</button>
				{/if}
			</div>
			<button
				type="submit"
				class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-sans font-medium transition-colors cursor-pointer min-h-[40px] shrink-0"
			>
				Search
			</button>
		</form>
		<p class="text-[11px] text-neutral-400 font-sans mt-2">
			Type at least 2 characters and press Search. Matches are highlighted
			in the conversation.
		</p>
	</div>

	<!-- Results panel -->
	<div class="flex-1 overflow-y-auto scrollbar-thin">
		{#if searchQuery.trim().length < 2}
			<div class="p-8 text-center text-neutral-400">
				<MessageSquare class="w-10 h-10 mx-auto mb-3 text-neutral-200" />
				<p class="font-sans text-sm font-medium">Search History</p>
				<p class="font-sans text-xs mt-1">
					Enter a keyword above to find conversations instantly.
				</p>
			</div>
		{:else if matches.length === 0}
			<div class="p-8 text-center text-neutral-400">
				<X class="w-10 h-10 mx-auto mb-3 text-neutral-200" />
				<p class="font-sans text-sm font-medium">No results found</p>
				<p class="font-sans text-xs mt-1">
					No messages match "{searchQuery}" in this chat.
				</p>
			</div>
		{:else}
			<div class="flex flex-col">
				<div class="px-4 py-2 bg-neutral-50 text-neutral-500 font-sans text-[11px] font-semibold border-b border-neutral-100 flex items-center justify-between">
					<span>MATCHES FOUND</span>
					<span>
						{matches.length > MAX_SIDEBAR_MATCHES
							? `Showing top ${MAX_SIDEBAR_MATCHES} of ${matches.length}`
							: `${matches.length} matches`}
					</span>
				</div>

				<div class="divide-y divide-neutral-100">
					{#each slicedMatches as { index, message } (message.id)}
						{@const messageTime = message.formattedDateShort || message.rawTimestamp.split(',')[0] || ''}
						{@const parts = searchRegex ? message.content.split(searchRegex) : [message.content]}
						<button
							type="button"
							onclick={() => onSelectMatch(index)}
							class="w-full text-left p-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors focus:outline-none focus:bg-neutral-50 flex flex-col gap-1 font-sans"
						>
							<div class="flex justify-between items-baseline w-full">
								<span class="font-semibold text-xs text-neutral-700 truncate max-w-[180px]">
									{message.sender}
								</span>
								<span class="text-[10px] text-neutral-400 font-mono">
									{messageTime}
								</span>
							</div>

							<p class="text-xs text-neutral-500 line-clamp-2 leading-relaxed break-all">
								{#each parts as part, idx (`${message.id}-part-${idx}`)}
									{#if part.toLowerCase() === searchQuery.toLowerCase()}
										<mark class="bg-amber-100 text-amber-900 font-semibold rounded-[2px] px-0.5">
											{part}
										</mark>
									{:else}
										{part}
									{/if}
								{/each}
							</p>

							<div class="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
								<CornerDownRight class="w-3 h-3" />
								<span>Jump to message</span>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
