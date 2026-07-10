import type { Message } from '../types';

// Regular expressions to detect WhatsApp message header prefixes.
// 1. Android style: "dd/mm/yyyy, hh:mm - Sender: Message" or "mm/dd/yy, hh:mm PM - Sender: Message"
const ANDROID_REGEX =
	/^(\d{1,4}[-/.]\d{1,4}[-/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s*-\s*(.*)$/;

// 2. iOS style: "[dd/mm/yyyy, hh:mm:ss] Sender: Message"
const IOS_REGEX =
	/^\[(\d{1,4}[-/.]\d{1,4}[-/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s*(.*)$/;

// 3. Simple Fallback style (some exports do not have '-' or brackets): "dd/mm/yyyy, hh:mm: Sender: Message"
const FALLBACK_REGEX =
	/^(\d{1,4}[-/.]\d{1,4}[-/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?):\s*(.*)$/;

/**
 * Autodetects whether the date format is DD/MM/YYYY or MM/DD/YYYY by scanning a sample of lines.
 * Returns true if DD/MM/YYYY is detected, false if MM/DD/YYYY.
 */
function autodetectDateFormat(lines: string[]): boolean {
	for (let i = 0; i < Math.min(lines.length, 2000); i++) {
		const line = lines[i];
		const match =
			line.match(ANDROID_REGEX) ||
			line.match(IOS_REGEX) ||
			line.match(FALLBACK_REGEX);
		if (match) {
			const datePart = match[1];
			const parts = datePart.split(/[-/.]/);
			if (parts.length >= 2) {
				const first = parseInt(parts[0], 10);
				const second = parseInt(parts[1], 10);
				if (first > 12 && first <= 31) {
					return true; // First part > 12, must be DD/MM
				}
				if (second > 12 && second <= 31) {
					return false; // Second part > 12, must be MM/DD
				}
			}
		}
	}
	return true; // Default to DD/MM
}

/**
 * Parses a date and time string from WhatsApp into a JS Date object.
 */
function parseDate(
	dateStr: string,
	timeStr: string,
	isDDMM: boolean,
): Date | null {
	try {
		const dateParts = dateStr.split(/[-/.]/);
		if (dateParts.length < 3) return null;

		let day = 1;
		let month = 0; // 0-indexed in JS Date
		let year = 2020;

		const part0 = parseInt(dateParts[0], 10);
		const part1 = parseInt(dateParts[1], 10);
		const part2 = parseInt(dateParts[2], 10);

		// Normalize 2-digit years
		if (part2 < 100) {
			year = part2 + 2000;
		} else {
			year = part2;
		}

		if (isDDMM) {
			day = part0;
			month = part1 - 1;
		} else {
			month = part0 - 1;
			day = part1;
		}

		// Parse time
		const timeMatch = timeStr.match(
			/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])?/,
		);
		if (!timeMatch) return null;

		let hours = parseInt(timeMatch[1], 10);
		const minutes = parseInt(timeMatch[2], 10);
		const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
		const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;

		if (ampm) {
			if (ampm === 'PM' && hours < 12) {
				hours += 12;
			} else if (ampm === 'AM' && hours === 12) {
				hours = 0;
			}
		}

		const d = new Date(year, month, day, hours, minutes, seconds);
		return Number.isNaN(d.getTime()) ? null : d;
	} catch {
		return null;
	}
}

function finalizeMessage(msg: Message): Message {
	msg.contentLower = msg.content.toLowerCase();

	if (msg.timestamp) {
		try {
			msg.formattedTime = msg.timestamp.toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
				hour12: true,
			});
			msg.formattedDateShort = msg.timestamp.toLocaleDateString([], {
				month: 'short',
				day: 'numeric',
			});
		} catch {
			msg.formattedTime = '';
			msg.formattedDateShort = '';
		}
	} else if (msg.rawTimestamp) {
		const parts = msg.rawTimestamp.split(',');
		msg.formattedTime = parts[1]?.trim() || msg.rawTimestamp;
		msg.formattedDateShort = parts[0]?.trim() || '';
	} else {
		msg.formattedTime = '';
		msg.formattedDateShort = '';
	}

	return msg;
}

/**
 * Parses the full WhatsApp export text content into an array of Message objects.
 */
export function parseWhatsAppChat(
	text: string,
	onProgress?: (progress: number) => void,
): Message[] {
	// Split content by lines. We preserve lines to reconstruct multiline messages correctly.
	const lines = text.split(/\r?\n/);
	const messages: Message[] = [];

	// Autodetect date format
	const isDDMM = autodetectDateFormat(lines);

	let currentMessage: Message | null = null;
	let messageCounter = 0;
	const totalLines = lines.length;

	for (let i = 0; i < totalLines; i++) {
		const line = lines[i];
		if (line.length === 0) continue;

		if (onProgress && i % 5000 === 0 && totalLines > 0) {
			onProgress(Math.round((i / totalLines) * 100));
		}

		// Fast-path pre-check: a valid message header MUST start with a digit (Android/Fallback) or '[' (iOS).
		const firstCode = line.charCodeAt(0);
		const isPossibleHeader =
			(firstCode >= 48 && firstCode <= 57) || firstCode === 91;

		// Check if the line matches any message pattern if the pre-check passed
		const match = isPossibleHeader
			? line.match(ANDROID_REGEX) ||
				line.match(IOS_REGEX) ||
				line.match(FALLBACK_REGEX)
			: null;

		if (match) {
			// Save the previous message if exists, finalizing it once
			if (currentMessage) {
				messages.push(finalizeMessage(currentMessage));
			}

			const rawDate = match[1];
			const rawTime = match[2];
			const remainder = match[3].trim();
			const timestamp = parseDate(rawDate, rawTime, isDDMM);

			// Analyze remainder to separate Sender from Content
			let sender = 'System';
			let content = remainder;
			let isSystem = true;

			// Look for the sender delimiter ': '
			const colonIndex = remainder.indexOf(': ');
			if (colonIndex !== -1) {
				const potentialSender = remainder.substring(0, colonIndex);

				// Exclude common system phrases from being categorized as sender names
				const hasSystemKeywords =
					potentialSender.includes(' created ') ||
					potentialSender.includes(' changed ') ||
					potentialSender.includes(' added ') ||
					potentialSender.includes(' removed ') ||
					potentialSender.includes(' left ') ||
					potentialSender.includes(' joined ') ||
					potentialSender.includes(' security code ') ||
					potentialSender.includes(' encryption ') ||
					potentialSender.includes(' blocked ') ||
					potentialSender.includes(' deleted ') ||
					potentialSender.includes(' pinned ');

				// If it doesn't look like a long system notification and doesn't contain system keywords
				if (potentialSender.length < 50 && !hasSystemKeywords) {
					sender = potentialSender;
					content = remainder.substring(colonIndex + 2);
					isSystem = false;
				}
			}

			// Detect media/attachment placeholder
			let isAttachment = false;
			let attachmentType: Message['attachmentType'] = null;

			const lowerContent = content.toLowerCase();
			if (
				lowerContent.includes('<media omitted>') ||
				lowerContent.includes('media omitted') ||
				lowerContent.includes('image omitted') ||
				lowerContent.includes('video omitted') ||
				lowerContent.includes('audio omitted') ||
				lowerContent.includes('document omitted') ||
				lowerContent.includes('sticker omitted') ||
				lowerContent.includes('file omitted')
			) {
				isAttachment = true;
				if (lowerContent.includes('image')) {
					attachmentType = 'image';
				} else if (lowerContent.includes('video')) {
					attachmentType = 'video';
				} else if (lowerContent.includes('audio')) {
					attachmentType = 'audio';
				} else if (lowerContent.includes('sticker')) {
					attachmentType = 'sticker';
				} else {
					attachmentType = 'document';
				}
			}

			currentMessage = {
				id: messageCounter++,
				rawTimestamp: `${rawDate}, ${rawTime}`,
				timestamp,
				sender,
				content,
				contentLower: '', // will be set once finalized
				isSystem,
				isAttachment,
				attachmentType,
				formattedTime: '',
				formattedDateShort: '',
			};
		} else {
			// It's a multiline continuation of the current message
			if (currentMessage) {
				currentMessage.content += `\n${line}`;
			} else {
				// Line before any valid message header (unusual, treat as a system message)
				currentMessage = {
					id: messageCounter++,
					rawTimestamp: '',
					timestamp: null,
					sender: 'System',
					content: line,
					contentLower: '',
					isSystem: true,
					isAttachment: false,
					attachmentType: null,
					formattedTime: '',
					formattedDateShort: '',
				};
			}
		}
	}

	// Add the last message
	if (currentMessage) {
		messages.push(finalizeMessage(currentMessage));
	}

	return messages;
}
