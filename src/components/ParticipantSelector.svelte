<script lang="ts">
import { User, MessageSquare, ArrowRight, BookOpen } from 'lucide-svelte';

interface Props {
	participants: string[];
	senderCounts: Record<string, number>;
	onSelectMe: (name: string | null) => void;
	fileName: string;
}

let { participants, senderCounts, onSelectMe, fileName }: Props = $props();

// Sort participants by message count descending
const sortedParticipants = $derived(
	[...participants].sort(
		(a, b) => (senderCounts[b] || 0) - (senderCounts[a] || 0),
	),
);

const totalMessages = $derived(
	Object.values(senderCounts).reduce((acc, count) => acc + count, 0),
);
</script>

<div
	id="participant-selector-container"
	class="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center"
>
	<div class="w-full bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-neutral-100 mb-6">
		<div class="flex items-center gap-2 mb-4 text-emerald-600">
			<BookOpen class="w-5 h-5" />
			<span class="font-sans font-semibold text-xs uppercase tracking-wider">
				File Loaded Successfully
			</span>
		</div>

		<h2
			class="font-display text-2xl font-semibold text-neutral-900 mb-2 truncate"
			title={fileName}
		>
			{fileName}
		</h2>
		<p class="text-neutral-500 font-sans text-xs md:text-sm mb-6 flex items-center gap-2">
			<MessageSquare class="w-4 h-4 text-neutral-400" />
			Parsed {totalMessages.toLocaleString()} messages across{' '}
			{participants.length} participants.
		</p>

		<div class="border-t border-neutral-100 pt-6 mb-6">
			<h3 class="font-sans font-medium text-neutral-800 text-sm md:text-base mb-1.5">
				Who are you in this chat?
			</h3>
			<p class="text-neutral-400 font-sans text-xs mb-4">
				Select your participant name to align your messages on the right (as
				outgoing). All other participants will be shown on the left (as
				incoming).
			</p>

			<div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
				{#each sortedParticipants as name (name)}
					{@const count = senderCounts[name] || 0}
					{@const percentage =
						totalMessages > 0
							? ((count / totalMessages) * 100).toFixed(1)
							: '0'}

					<button
						type="button"
						onclick={() => onSelectMe(name)}
						class="w-full flex items-center justify-between p-3.5 hover:bg-neutral-50 active:bg-neutral-100 border border-neutral-100 hover:border-neutral-200 rounded-xl transition-all text-left font-sans group focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
					>
						<div class="flex items-center gap-3 min-w-0">
							<div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
								<User class="w-4 h-4" />
							</div>
							<div class="min-w-0">
								<p class="font-medium text-neutral-800 truncate pr-2 text-sm md:text-base">
									{name}
								</p>
								<p class="text-neutral-400 text-xs">
									{count.toLocaleString()} messages ({percentage}%)
								</p>
							</div>
						</div>
						<ArrowRight class="w-4 h-4 text-neutral-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
					</button>
				{/each}
			</div>
		</div>

		<button
			type="button"
			onclick={() => onSelectMe(null)}
			class="w-full text-center py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl font-sans font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300 min-h-[44px]"
		>
			Read as Guest (No sender alignment)
		</button>
	</div>
</div>
