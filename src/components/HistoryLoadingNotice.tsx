import { Loader2 } from 'lucide-react';

/**
 * Shown in result panels while DB chunks are still streaming in: lists are
 * built from loaded messages only, so they may be incomplete until then.
 */
export default function HistoryLoadingNotice() {
	return (
		<div className="px-4 py-2 flex items-center gap-2 bg-surface-hover border-b border-border-subtle text-[11px] font-sans text-text-tertiary">
			<Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
			<span>Still loading messages. Results may be incomplete.</span>
		</div>
	);
}
