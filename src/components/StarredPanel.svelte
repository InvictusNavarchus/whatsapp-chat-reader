<script lang="ts">
import { Star, X, CornerDownRight } from 'lucide-svelte';
import type { Message } from '../types';

interface Props {
	messages: Message[];
	starredMessageIds: Set<number>;
	onSelectMessage: (index: number) => void;
	onClose: () => void;
	onToggleStar: (messageId: number) => void;
}

let {
	messages,
	starredMessageIds,
	onSelectMessage,
	onClose,
	onToggleStar,
}: Props = $props();

// Find starred messages and keep track of their original index in the messages array
const starredMessages = $derived(
	messages
		.map((message, index) => ({ message, index }))
		.filter(({ message }) => starredMessageIds.has(message.id)),
);
</script>

<div class="w-full md:w-[380px] bg-white border-l border-neutral-200 flex flex-col h-full shadow-2xl md:shadow-none shrink-0 z-40 relative">
	<!-- Header -->
	<div class="p-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
		<h3 class="font-sans font-semibold text-neutral-800 text-sm md:text-base flex items-center gap-2">
			<Star class="w-4 h-4 text-amber-500 fill-amber-500" />
			Starred Messages
		</h3>
		<button
			type="button"
			onclick={onClose}
			class="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors focus:outline-none touch-manipulation min-h-[36px]"
		>
			<X class="w-4 h-4" />
		</button>
	</div>

	<!-- Results panel -->
	<div class="flex-1 overflow-y-auto scrollbar-thin">
		{#if starredMessages.length === 0}
			<div class="p-8 text-center text-neutral-400">
				<Star class="w-10 h-10 mx-auto mb-3 text-neutral-200" />
				<p class="font-sans text-sm font-medium">No Starred Messages</p>
				<p class="font-sans text-xs mt-1">
					Hover over any message in the chat and click the star icon to save
					it here.
				</p>
			</div>
		{:else}
			<div class="flex flex-col">
				<div class="px-4 py-2 bg-neutral-50 text-neutral-500 font-sans text-[11px] font-semibold border-b border-neutral-100 flex items-center justify-between">
					<span>SAVED MESSAGES</span>
					<span>{starredMessages.length} starred</span>
				</div>

				<div class="divide-y divide-neutral-100">
					{#each starredMessages as { index, message } (message.id)}
						{@const messageTime = message.formattedDateShort || message.rawTimestamp.split(',')[0] || ''}

						<div class="w-full text-left p-4 hover:bg-neutral-50/50 transition-colors flex flex-col gap-1 font-sans relative group">
							<!-- Clicking this region jumps to the message -->
							<button
								type="button"
								onclick={() => onSelectMessage(index)}
								class="text-left w-full cursor-pointer flex-1 flex flex-col gap-1 pr-8 focus:outline-none"
							>
								<div class="flex justify-between items-baseline w-full">
									<span class="font-semibold text-xs text-neutral-700 truncate max-w-[180px]">
										{message.sender}
									</span>
									<span class="text-[10px] text-neutral-400 font-mono">
										{messageTime}
									</span>
								</div>

								<p class="text-xs text-neutral-500 line-clamp-3 leading-relaxed break-all">
									{#if message.isAttachment}
										[Attachment: {message.content}]
									{:else}
										{message.content}
									{/if}
								</p>

								<div class="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
									<CornerDownRight class="w-3 h-3" />
									<span>Jump to message</span>
								</div>
							</button>

							<!-- Star button to remove from starred list -->
							<button
								type="button"
								onclick={() => onToggleStar(message.id)}
								class="absolute right-4 top-4 p-1.5 hover:bg-neutral-100 text-amber-500 hover:text-neutral-400 rounded-lg transition-colors focus:outline-none"
								title="Unstar message"
							>
								<Star class="w-4 h-4 fill-amber-500" />
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
