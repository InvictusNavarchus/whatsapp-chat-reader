import { useState, useCallback } from 'react';
import type { Message, DateMapEntry } from '../types';

interface ParseResult {
	messages: Message[];
	dateMap: DateMapEntry[];
	participants: string[];
	senderCounts: Record<string, number>;
	fileName: string;
}

interface UseChatParserOptions {
	onComplete: (result: ParseResult) => void;
	onError: (err: string) => void;
}

export function useChatParser(options: UseChatParserOptions) {
	const [isParsing, setIsParsing] = useState(false);
	const [parseProgress, setParseProgress] = useState<number | null>(null);

	const parse = useCallback(
		(text: string, name: string) => {
			setIsParsing(true);
			setParseProgress(0);

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
					setParseProgress(progress);
				} else if (type === 'complete' && parsed) {
					worker.terminate();
					setIsParsing(false);
					setParseProgress(null);

					if (parsed.length === 0) {
						options.onError(
							'Unable to extract any messages. Please check if this is a standard WhatsApp chat log export.',
						);
						return;
					}

					options.onComplete({
						messages: parsed,
						dateMap: parsedDateMap || [],
						participants: parsedParticipants || [],
						senderCounts: parsedSenderCounts || {},
						fileName: name,
					});
				} else if (type === 'error') {
					worker.terminate();
					setIsParsing(false);
					setParseProgress(null);
					options.onError(error || 'Unknown parsing error');
				}
			};

			worker.onerror = (err) => {
				console.error('Worker error:', err);
				worker.terminate();
				setIsParsing(false);
				setParseProgress(null);
				options.onError('An error occurred in the parser background thread.');
			};
		},
		[options],
	);

	return {
		parse,
		isParsing,
		setIsParsing,
		parseProgress,
		setParseProgress,
	};
}
