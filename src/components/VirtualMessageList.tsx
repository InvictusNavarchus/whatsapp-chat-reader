import {
	type UIEvent,
	useEffect,
	memo,
	useRef,
	useState,
	useCallback,
	useMemo,
} from 'react';
import { DB_CHUNK_SIZE } from '../utils/db';
import {
	ChevronDown,
	Image,
	Film,
	Music,
	FileText,
	Smile,
	Info,
	Star,
	Loader2,
} from 'lucide-react';
import type { Message } from '../types';

interface VirtualMessageListProps {
	messages: Message[];
	me: string | null;
	searchQuery: string;
	jumpToIndex: number | null;
	onJumpDone: () => void;
	starredMessageIds: Set<number>;
	onToggleStarMessage: (id: number) => void;
	onLoadChunk: (index: number) => void;
}

// Escape helper for regex search highlights
const escapeRegExp = (str: string) =>
	str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to generate consistent readable pastel colors for sender names (cached for performance)
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

// Text highlighting helper component
function HighlightedText({ text, search }: { text: string; search: string }) {
	if (!search || search.trim().length < 2) {
		return <span className="whitespace-pre-wrap">{text}</span>;
	}
	// Fast path: if the text doesn't contain the search query, avoid RegExp allocations completely
	if (!text.toLowerCase().includes(search.toLowerCase())) {
		return <span className="whitespace-pre-wrap">{text}</span>;
	}
	const parts = text.split(new RegExp(`(${escapeRegExp(search)})`, 'gi'));
	const items = parts.map((part, i) => ({
		id: `${i}-${part}`,
		part,
	}));
	return (
		<span className="whitespace-pre-wrap">
			{items.map((item) =>
				item.part.toLowerCase() === search.toLowerCase() ? (
					<mark
						key={item.id}
						className="bg-amber-100 text-amber-900 rounded-[2px] font-medium px-0.5"
					>
						{item.part}
					</mark>
				) : (
					item.part
				),
			)}
		</span>
	);
}

// Media placeholder component
function MediaAttachment({
	type,
	content,
}: {
	type: Message['attachmentType'];
	content: string;
}) {
	const getIcon = () => {
		switch (type) {
			case 'image':
				return <Image className="w-5 h-5 text-emerald-600" />;
			case 'video':
				return <Film className="w-5 h-5 text-indigo-600" />;
			case 'audio':
				return <Music className="w-5 h-5 text-amber-600" />;
			case 'sticker':
				return <Smile className="w-5 h-5 text-pink-600" />;
			default:
				return <FileText className="w-5 h-5 text-blue-600" />;
		}
	};

	const getLabel = () => {
		switch (type) {
			case 'image':
				return 'Photo';
			case 'video':
				return 'Video';
			case 'audio':
				return 'Voice note / Audio';
			case 'sticker':
				return 'Sticker';
			default:
				return 'Document';
		}
	};

	return (
		<div className="flex items-center gap-3 bg-neutral-50/80 border border-neutral-100 rounded-lg p-2.5 my-1.5 max-w-[260px] md:max-w-[320px]">
			<div className="p-2 bg-white rounded-md shadow-sm shrink-0">
				{getIcon()}
			</div>
			<div className="min-w-0">
				<p className="font-sans font-medium text-xs text-neutral-800">
					{getLabel()}
				</p>
				<p className="font-sans text-[11px] text-neutral-400 truncate">
					{content}
				</p>
			</div>
		</div>
	);
}

// Memoized message bubble to prevent unneeded re-renders on scroll or search
const MessageBubble = memo(function MessageBubble({
	message,
	isMe,
	searchQuery,
	isHighlighted,
	isStarred,
	onToggleStar,
}: {
	message: Message;
	isMe: boolean;
	searchQuery: string;
	isHighlighted: boolean;
	isStarred: boolean;
	onToggleStar: () => void;
}) {
	const isSystem = message.isSystem;

	if (isSystem) {
		return (
			<div
				className="w-full flex justify-center my-1.5 focus:outline-none"
				id={`message-${message.id}`}
			>
				<div className="max-w-[85%] bg-white/70 border border-neutral-100 text-neutral-500 font-sans text-[11px] md:text-xs py-1 px-3 rounded-lg shadow-sm text-center flex items-center gap-1.5 leading-relaxed">
					<Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
					<span>{message.content}</span>
					{message.formattedTime && (
						<span className="text-[9px] text-neutral-400 font-mono shrink-0 ml-1">
							({message.formattedTime})
						</span>
					)}
				</div>
			</div>
		);
	}

	return (
		<div
			id={`message-${message.id}`}
			className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} transition-all group/msg`}
		>
			<div
				className={`max-w-[82%] md:max-w-[72%] rounded-2xl relative shadow-sm transition-all duration-500 ${
					isMe
						? 'bg-[#d9fdd3] border border-[#d1f4cb] text-[#111b21] rounded-tr-none'
						: 'bg-white border border-neutral-100 text-[#111b21] rounded-tl-none'
				} ${
					isHighlighted
						? 'ring-4 ring-amber-400 scale-[1.01] shadow-md z-10'
						: ''
				}`}
			>
				<div className="px-3.5 py-2 flex flex-col">
					{/* Participant Name Header */}
					{!isMe && (
						<span
							className="font-sans font-semibold text-[12px] md:text-xs mb-0.5 truncate"
							style={{ color: getSenderColor(message.sender) }}
						>
							{message.sender}
						</span>
					)}

					{/* Attachment Container */}
					{message.isAttachment ? (
						<MediaAttachment
							type={message.attachmentType}
							content={message.content}
						/>
					) : (
						/* Text Message Content */
						<p className="font-sans text-[14px] md:text-base leading-[1.4] tracking-normal wrap-break-word pr-8">
							<HighlightedText text={message.content} search={searchQuery} />
						</p>
					)}

					{/* Timestamp Footer */}
					<div className="text-[10px] text-neutral-400 font-mono text-right mt-1 self-end leading-none select-none flex items-center gap-1.5 min-h-[16px]">
						<button
							type="button"
							onClick={onToggleStar}
							className={`p-0.5 rounded transition-all focus:outline-none ${
								isStarred
									? 'text-amber-500 hover:text-amber-600 scale-100'
									: 'text-neutral-300 hover:text-amber-500 opacity-0 group-hover/msg:opacity-100 focus:opacity-100 hover:scale-110 cursor-pointer'
							}`}
							title={isStarred ? 'Unstar message' : 'Star message'}
						>
							<Star
								className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-500' : ''}`}
							/>
						</button>
						{message.isEdited && <span>Edited</span>}
						<span>{message.formattedTime}</span>
					</div>
				</div>
			</div>
		</div>
	);
});

interface MessageChunkProps {
	chunkIndex: number;
	messages: Message[];
	me: string | null;
	searchQuery: string;
	starredMessageIds: Set<number>;
	onToggleStarMessage: (id: number) => void;
	isForceRendered: boolean;
	onMeasured: (index: number, height: number) => void;
	cachedHeight: number | null;
	highlightedId: number | null;
	onLoadChunk: (index: number) => void;
}

const MessageChunk = memo(function MessageChunk({
	chunkIndex,
	messages,
	me,
	searchQuery,
	starredMessageIds,
	onToggleStarMessage,
	isForceRendered,
	onMeasured,
	cachedHeight,
	highlightedId,
	onLoadChunk,
}: MessageChunkProps) {
	const [isIntersecting, setIsIntersecting] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const isMounted = isIntersecting || isForceRendered;
	const estimatedHeight = cachedHeight ?? messages.length * 72; // Avg message height estimate

	const isEmpty = messages.length === 0 || messages[0] === undefined;

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsIntersecting(entry.isIntersecting);
				if (!entry.isIntersecting) {
					const rect = el.getBoundingClientRect();
					if (rect.height > 100) {
						onMeasured(chunkIndex, rect.height);
					}
				}
			},
			{
				rootMargin: '600px 0px 600px 0px', // Pre-load viewport margin
			},
		);

		observer.observe(el);

		return () => {
			observer.disconnect();
		};
	}, [chunkIndex, onMeasured]);

	// Load chunk when it comes into view (or is force rendered) and its messages are empty/undefined
	useEffect(() => {
		if (isMounted && isEmpty) {
			onLoadChunk(chunkIndex);
		}
	}, [isMounted, isEmpty, chunkIndex, onLoadChunk]);

	if (!isMounted) {
		return (
			<div
				ref={containerRef}
				data-chunk-index={chunkIndex}
				style={{ height: `${estimatedHeight}px` }}
				className="w-full"
			/>
		);
	}

	if (isEmpty) {
		return (
			<div
				ref={containerRef}
				data-chunk-index={chunkIndex}
				style={{ height: `${estimatedHeight}px` }}
				className="w-full flex items-center justify-center py-8"
			>
				<Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			data-chunk-index={chunkIndex}
			className="w-full flex flex-col"
			style={{ minHeight: cachedHeight ? `${cachedHeight}px` : undefined }}
		>
			{messages.map((message) => {
				const isMe = me !== null && message.sender === me;
				const isHighlighted = highlightedId === message.id;
				const isStarred = starredMessageIds.has(message.id);

				return (
					<div key={message.id} className="py-1.5 px-4 md:px-8">
						<div className="w-full max-w-4xl mx-auto">
							<MessageBubble
								message={message}
								isMe={isMe}
								searchQuery={searchQuery}
								isHighlighted={isHighlighted}
								isStarred={isStarred}
								onToggleStar={() => onToggleStarMessage(message.id)}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
});

export default function VirtualMessageList({
	messages,
	me,
	searchQuery,
	jumpToIndex,
	onJumpDone,
	starredMessageIds,
	onToggleStarMessage,
	onLoadChunk,
}: VirtualMessageListProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const [showScrollBottom, setShowScrollBottom] = useState(false);
	const [highlightedId, setHighlightedId] = useState<number | null>(null);
	const [forceRenderChunkIndex, setForceRenderChunkIndex] = useState<
		number | null
	>(null);
	const [chunkHeights, setChunkHeights] = useState<Record<number, number>>({});

	// Split messages into chunk groups
	const chunks = useMemo(() => {
		const result: { id: string; messages: Message[] }[] = [];
		let chunkIndex = 0;
		for (let i = 0; i < messages.length; i += DB_CHUNK_SIZE) {
			result.push({
				id: `chunk-${chunkIndex}`,
				messages: messages.slice(i, i + DB_CHUNK_SIZE),
			});
			chunkIndex++;
		}
		return result;
	}, [messages]);

	const handleChunkMeasured = useCallback((index: number, height: number) => {
		setChunkHeights((prev) => {
			if (prev[index] === height) return prev;
			return { ...prev, [index]: height };
		});
	}, []);

	// Reset cached heights on window resize
	useEffect(() => {
		const handleResize = () => {
			setChunkHeights({});
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Handle scrolling to bottom and showing/hiding the button
	const handleScroll = (e: UIEvent<HTMLDivElement>) => {
		const target = e.currentTarget;
		const isUp =
			target.scrollHeight - target.scrollTop - target.clientHeight > 400;
		setShowScrollBottom(isUp);
	};

	// Jump to message logic
	useEffect(() => {
		if (jumpToIndex !== null) {
			const targetMessage = messages[jumpToIndex];
			if (!targetMessage) return;

			const targetChunkIndex = Math.floor(jumpToIndex / DB_CHUNK_SIZE);
			console.log(
				'Jumping to index:',
				jumpToIndex,
				'Message ID:',
				targetMessage.id,
				'Chunk Index:',
				targetChunkIndex,
			);

			setForceRenderChunkIndex(targetChunkIndex);

			let flashTimer: ReturnType<typeof setTimeout> | undefined;
			let timeoutId: ReturnType<typeof setTimeout> | undefined;

			const tryScroll = () => {
				const el = document.getElementById(`message-${targetMessage.id}`);
				if (el) {
					el.scrollIntoView({ block: 'center', behavior: 'auto' });
					setHighlightedId(targetMessage.id);
					flashTimer = setTimeout(() => {
						setHighlightedId(null);
					}, 3000);
					onJumpDone();
					return true;
				}
				return false;
			};

			if (tryScroll()) {
				return () => {
					if (flashTimer) clearTimeout(flashTimer);
				};
			}

			const rafId = requestAnimationFrame(() => {
				if (tryScroll()) return;
				timeoutId = setTimeout(() => {
					if (!tryScroll()) {
						onJumpDone();
					}
				}, 60);
			});

			const clearForceTimer = setTimeout(() => {
				setForceRenderChunkIndex(null);
			}, 1200);

			return () => {
				cancelAnimationFrame(rafId);
				if (timeoutId) clearTimeout(timeoutId);
				if (flashTimer) clearTimeout(flashTimer);
				clearTimeout(clearForceTimer);
			};
		}
	}, [jumpToIndex, messages, onJumpDone]);

	const scrollToBottom = () => {
		if (parentRef.current) {
			parentRef.current.scrollTo({
				top: parentRef.current.scrollHeight,
				behavior: 'smooth',
			});
		}
	};

	return (
		<div className="relative flex-1 bg-[#efeae2] overflow-hidden flex flex-col h-full">
			{/* Decorative WhatsApp Background Pattern overlay */}
			<div
				className="absolute inset-0 opacity-[0.06] pointer-events-none"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 0c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z'/%3E%3C/g%3E%3C/svg%3E")`,
					backgroundSize: '120px 120px',
				}}
			/>

			{/* Main Scroll Container */}
			<div
				ref={parentRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto relative py-4 focus:outline-none scrollbar-thin scrollbar-thumb-neutral-300"
				style={{ overflowAnchor: 'auto' }}
			>
				{chunks.map((chunk, index) => (
					<MessageChunk
						key={chunk.id}
						chunkIndex={index}
						messages={chunk.messages}
						me={me}
						searchQuery={searchQuery}
						starredMessageIds={starredMessageIds}
						onToggleStarMessage={onToggleStarMessage}
						isForceRendered={forceRenderChunkIndex === index}
						onMeasured={handleChunkMeasured}
						cachedHeight={chunkHeights[index] ?? null}
						highlightedId={highlightedId}
						onLoadChunk={onLoadChunk}
					/>
				))}
			</div>

			{/* Floating Scroll-to-Bottom Widget */}
			{showScrollBottom && (
				<button
					type="button"
					onClick={scrollToBottom}
					className="absolute bottom-6 right-6 w-11 h-11 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-full shadow-lg flex items-center justify-center text-neutral-500 hover:text-neutral-700 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation z-20"
				>
					<ChevronDown className="w-5 h-5 animate-bounce" />
				</button>
			)}
		</div>
	);
}
