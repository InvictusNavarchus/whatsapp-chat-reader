<script lang="ts">
import { untrack } from 'svelte';
import { createVirtualizer } from '@tanstack/svelte-virtual';
import {
	ChevronDown,
	Image,
	Film,
	Music,
	FileText,
	Smile,
	Info,
	Star,
} from 'lucide-svelte';
import type { Message } from '../types';

interface Props {
	messages: Message[];
	me: string | null;
	searchQuery: string;
	jumpToIndex: number | null;
	onJumpDone: () => void;
	starredMessageIds: Set<number>;
	onToggleStarMessage: (id: number) => void;
}

let {
	messages,
	me,
	searchQuery,
	jumpToIndex,
	onJumpDone,
	starredMessageIds,
	onToggleStarMessage,
}: Props = $props();

const escapeRegExp = (str: string) =>
	str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to generate consistent readable pastel colors for sender names
const senderColorCache = new Map<string, string>();
function getSenderColor(sender: string): string {
	const cached = senderColorCache.get(sender);
	if (cached) return cached;

	let hash = 0;
	for (let i = 0; i < sender.length; i++) {
		hash = sender.charCodeAt(i) + ((hash << 5) - hash);
	}
	const hues = [340, 20, 145, 195, 240, 280, 315];
	const hue = hues[Math.abs(hash) % hues.length];
	const color = `hsl(${hue}, 70%, 35%)`;
	senderColorCache.set(sender, color);
	return color;
}

let parentRef = $state<HTMLDivElement | null>(null);
let showScrollBottom = $state(false);
let highlightedId = $state<number | null>(null);

// Initialize TanStack Virtualizer
const virtualizer = createVirtualizer({
	getScrollElement: () => parentRef,
	get count() {
		return messages.length;
	},
	estimateSize: () => 80,
	getItemKey: (index) => messages[index]?.id ?? index,
	overscan: 10,
});

// Keep virtualizer options updated reactively
$effect(() => {
	// Track messages.length and parentRef reactively
	const count = messages.length;
	const ref = parentRef;

	untrack(() => {
		$virtualizer.setOptions({
			getScrollElement: () => ref,
			count,
			estimateSize: () => 80,
			getItemKey: (index) => messages[index]?.id ?? index,
			overscan: 10,
		});
	});
});

// Svelte action to measure elements
function measureElement(node: HTMLElement, index: number) {
	$virtualizer.measureElement(node);
	return {
		update(newIndex: number) {
			$virtualizer.measureElement(node);
		},
	};
}

// Handle scrolling to bottom and showing/hiding the button
const handleScroll = (e: Event) => {
	const target = e.currentTarget as HTMLDivElement;
	const isUp =
		target.scrollHeight - target.scrollTop - target.clientHeight > 400;
	showScrollBottom = isUp;
};

// Jump to message logic
$effect(() => {
	if (jumpToIndex !== null && $virtualizer) {
		const targetMessage = messages[jumpToIndex];
		if (!targetMessage) return;

		console.log(
			'Jumping to index:',
			jumpToIndex,
			'Message ID:',
			targetMessage.id,
		);

		// 1. Scroll immediately to estimated position
		$virtualizer.scrollToIndex(jumpToIndex, { align: 'center' });

		// Fallback: If element is already in DOM, scroll it into view immediately
		const initialEl = document.getElementById(`message-${targetMessage.id}`);
		if (initialEl) {
			initialEl.scrollIntoView({ block: 'center' });
		}

		// 2. Scroll in next frame (before paint)
		const rafId = requestAnimationFrame(() => {
			$virtualizer.scrollToIndex(jumpToIndex, { align: 'center' });
			const rafEl = document.getElementById(`message-${targetMessage.id}`);
			if (rafEl) {
				rafEl.scrollIntoView({ block: 'center' });
			}
		});

		// 3. Scroll after paint & layout completes (50ms)
		const timeoutId = setTimeout(() => {
			$virtualizer.scrollToIndex(jumpToIndex, { align: 'center' });
			const timeoutEl = document.getElementById(`message-${targetMessage.id}`);
			if (timeoutEl) {
				timeoutEl.scrollIntoView({ block: 'center' });
			}
		}, 50);

		// Trigger the flash animation on the selected message
		highlightedId = targetMessage.id;
		const flashTimer = setTimeout(() => {
			highlightedId = null;
		}, 3000);

		onJumpDone();

		return () => {
			cancelAnimationFrame(rafId);
			clearTimeout(timeoutId);
			clearTimeout(flashTimer);
		};
	}
});

const scrollToBottom = () => {
	if (parentRef) {
		parentRef.scrollTo({
			top: parentRef.scrollHeight,
			behavior: 'smooth',
		});
	}
};
</script>

<!-- Snippets for Reusable Layouts -->

{#snippet HighlightedText(text: string, search: string)}
	{#if !search || search.trim().length < 2 || !text.toLowerCase().includes(search.toLowerCase())}
		<span class="whitespace-pre-wrap">{text}</span>
	{:else}
		{@const parts = text.split(new RegExp(`(${escapeRegExp(search)})`, 'gi'))}
		<span class="whitespace-pre-wrap">
			{#each parts as part, i (`${i}-${part}`)}
				{#if part.toLowerCase() === search.toLowerCase()}
					<mark class="bg-amber-100 text-amber-900 rounded-[2px] font-medium px-0.5">
						{part}
					</mark>
				{:else}
					{part}
				{/if}
			{/each}
		</span>
	{/if}
{/snippet}

{#snippet MediaAttachmentSnippet(type: Message['attachmentType'], content: string)}
	<div class="flex items-center gap-3 bg-neutral-50/80 border border-neutral-100 rounded-lg p-2.5 my-1.5 max-w-[260px] md:max-w-[320px]">
		<div class="p-2 bg-white rounded-md shadow-sm shrink-0">
			{#if type === 'image'}
				<Image class="w-5 h-5 text-emerald-600" />
			{:else if type === 'video'}
				<Film class="w-5 h-5 text-indigo-600" />
			{:else if type === 'audio'}
				<Music class="w-5 h-5 text-amber-600" />
			{:else if type === 'sticker'}
				<Smile class="w-5 h-5 text-pink-600" />
			{:else}
				<FileText class="w-5 h-5 text-blue-600" />
			{/if}
		</div>
		<div class="min-w-0">
			<p class="font-sans font-medium text-xs text-neutral-800">
				{#if type === 'image'}
					Photo
				{:else if type === 'video'}
					Video
				{:else if type === 'audio'}
					Voice note / Audio
				{:else if type === 'sticker'}
					Sticker
				{:else}
					Document
				{/if}
			</p>
			<p class="font-sans text-[11px] text-neutral-400 truncate">
				{content}
			</p>
		</div>
	</div>
{/snippet}

{#snippet MessageBubbleSnippet(message: Message, isMe: boolean, isHighlighted: boolean, isStarred: boolean)}
	{@const isSystem = message.isSystem}

	{#if isSystem}
		<div
			class="w-full flex justify-center my-1.5 focus:outline-none"
			id="message-{message.id}"
		>
			<div class="max-w-[85%] bg-white/70 border border-neutral-100 text-neutral-500 font-sans text-[11px] md:text-xs py-1 px-3 rounded-lg shadow-sm text-center flex items-center gap-1.5 leading-relaxed">
				<Info class="w-3.5 h-3.5 text-neutral-400 shrink-0" />
				<span>{message.content}</span>
				{#if message.formattedTime}
					<span class="text-[9px] text-neutral-400 font-mono shrink-0 ml-1">
						({message.formattedTime})
					</span>
				{/if}
			</div>
		</div>
	{:else}
		<div
			id="message-{message.id}"
			class="w-full flex {isMe ? 'justify-end' : 'justify-start'} transition-all group/msg"
		>
			<div
				class="max-w-[82%] md:max-w-[72%] rounded-2xl relative shadow-sm transition-all duration-500 {
					isMe
						? 'bg-[#d9fdd3] border border-[#d1f4cb] text-[#111b21] rounded-tr-none'
						: 'bg-white border border-neutral-100 text-[#111b21] rounded-tl-none'
				} {
					isHighlighted
						? 'ring-4 ring-amber-400 scale-[1.01] shadow-md z-10'
						: ''
				}"
			>
				<div class="px-3.5 py-2 flex flex-col">
					<!-- Participant Name Header -->
					{#if !isMe}
						<span
							class="font-sans font-semibold text-[12px] md:text-xs mb-0.5 truncate"
							style="color: {getSenderColor(message.sender)}"
						>
							{message.sender}
						</span>
					{/if}

					<!-- Attachment Container -->
					{#if message.isAttachment}
						{@render MediaAttachmentSnippet(message.attachmentType, message.content)}
					{:else}
						<!-- Text Message Content -->
						<p class="font-sans text-[14px] md:text-base leading-[1.4] tracking-normal wrap-break-word pr-8">
							{@render HighlightedText(message.content, searchQuery)}
						</p>
					{/if}

					<!-- Timestamp Footer -->
					<div class="text-[10px] text-neutral-400 font-mono text-right mt-1 self-end leading-none select-none flex items-center gap-1.5 min-h-[16px]">
						<button
							type="button"
							onclick={() => onToggleStarMessage(message.id)}
							class="p-0.5 rounded transition-all focus:outline-none {
								isStarred
									? 'text-amber-500 hover:text-amber-600 scale-100'
									: 'text-neutral-300 hover:text-amber-500 opacity-0 group-hover/msg:opacity-100 focus:opacity-100 hover:scale-110 cursor-pointer'
							}"
							title={isStarred ? 'Unstar message' : 'Star message'}
						>
							<Star
								class="w-3.5 h-3.5 {isStarred ? 'fill-amber-500' : ''}"
							/>
						</button>
						<span>{message.formattedTime}</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/snippet}

<div class="relative flex-1 bg-[#efeae2] overflow-hidden flex flex-col h-full">
	<!-- Decorative WhatsApp Background Pattern overlay -->
	<div
		class="absolute inset-0 opacity-[0.06] pointer-events-none"
		style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 0c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z'/%3E%3C/g%3E%3C/svg%3E&quot;); background-size: 120px 120px;"
	></div>

	<!-- Main Scroll Container -->
	<div
		bind:this={parentRef}
		onscroll={handleScroll}
		class="flex-1 overflow-y-auto relative py-4 focus:outline-none scrollbar-thin scrollbar-thumb-neutral-300"
	>
		{#if $virtualizer}
			<div
				style="height: {$virtualizer.getTotalSize()}px; width: 100%; position: relative;"
			>
				{#each $virtualizer.getVirtualItems() as virtualRow (virtualRow.key)}
					{@const message = messages[virtualRow.index]}
					{#if message}
						{@const isMe = me !== null && message.sender === me}
						{@const isHighlighted = highlightedId === message.id}
						{@const isStarred = starredMessageIds.has(message.id)}

						<div
							use:measureElement={virtualRow.index}
							data-index={virtualRow.index}
							style="position: absolute; top: 0; left: 0; width: 100%; transform: translateY({virtualRow.start}px);"
							class="py-1.5 px-4 md:px-8"
						>
							<div class="w-full max-w-4xl mx-auto">
								{@render MessageBubbleSnippet(message, isMe, isHighlighted, isStarred)}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- Floating Scroll-to-Bottom Widget -->
	{#if showScrollBottom}
		<button
			type="button"
			onclick={scrollToBottom}
			class="absolute bottom-6 right-6 w-11 h-11 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-full shadow-lg flex items-center justify-center text-neutral-500 hover:text-neutral-700 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation z-20"
		>
			<ChevronDown class="w-5 h-5 animate-bounce" />
		</button>
	{/if}
</div>
