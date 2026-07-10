import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, Image, Film, Music, FileText, Smile, Info, ArrowUp } from 'lucide-react';
import { Message } from '../types';

interface VirtualMessageListProps {
  messages: Message[];
  me: string | null;
  searchQuery: string;
  jumpToIndex: number | null;
  onJumpDone: () => void;
}

// Escape helper for regex search highlights
const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-amber-100 text-amber-900 rounded-[2px] font-medium px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

// Media placeholder component
function MediaAttachment({ type, content }: { type: Message['attachmentType']; content: string }) {
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
        <p className="font-sans font-medium text-xs text-neutral-800">{getLabel()}</p>
        <p className="font-sans text-[11px] text-neutral-400 truncate">{content}</p>
      </div>
    </div>
  );
}

/**
 * Estimates the height of a message bubble. This ensures the virtual scrollbar matches
 * the overall size, regardless of what index is in the viewport.
 * Account for the container width to be extremely precise and avoid height drift.
 */
function estimateHeight(message: Message, containerWidth: number): number {
  if (message.isSystem) {
    const textLength = message.content.length;
    // System messages are centered and span up to 85% of container width
    const maxSysWidth = Math.max(200, Math.min(containerWidth, 896) * 0.85 - 30);
    const charsPerLine = Math.max(25, Math.floor(maxSysWidth / 7.5));
    const lines = Math.max(1, Math.ceil(textLength / charsPerLine));
    return lines * 20 + 24; // 20px per line + 24px vertical padding
  }

  const textLength = message.content.length;
  // Width of chat bubble area
  const bubbleWidth = Math.max(200, Math.min(containerWidth, 896) * 0.75 - 40);
  const avgCharWidth = 8.0;
  const charsPerLine = Math.max(20, Math.floor(bubbleWidth / avgCharWidth));

  // Handle multi-line messages accurately
  const paragraphs = message.content.split('\n');
  let estimatedLines = 0;
  for (const p of paragraphs) {
    estimatedLines += Math.max(1, Math.ceil(p.length / charsPerLine));
  }

  // Header sender name height
  const headerHeight = message.sender && message.sender !== 'System' ? 18 : 0;
  // Footer timestamp height
  const footerHeight = 14;
  // Media card height
  const mediaHeight = message.isAttachment ? 60 : 0;
  // Vertical spacing
  const verticalSpacing = 16;

  const textHeight = estimatedLines * 18;

  return textHeight + headerHeight + footerHeight + mediaHeight + verticalSpacing;
}

// Memoized message bubble to prevent unneeded re-renders on scroll or search
const MessageBubble = React.memo(function MessageBubble({
  message,
  isMe,
  searchQuery,
  isHighlighted,
}: {
  message: Message;
  isMe: boolean;
  searchQuery: string;
  isHighlighted: boolean;
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
      className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} transition-all`}
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
            <MediaAttachment type={message.attachmentType} content={message.content} />
          ) : (
            /* Text Message Content */
            <p className="font-sans text-[14px] md:text-base leading-[1.4] tracking-normal break-words pr-8">
              <HighlightedText text={message.content} search={searchQuery} />
            </p>
          )}

          {/* Timestamp Footer */}
          <span className="text-[10px] text-neutral-400 font-mono text-right mt-1 self-end leading-none select-none">
            {message.formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
});

export default function VirtualMessageList({
  messages,
  me,
  searchQuery,
  jumpToIndex,
  onJumpDone,
}: VirtualMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(375);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Recalculate container dimensions with a small debounce to avoid spamming layout/state changes
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout | null = null;

    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        if (containerRef.current) {
          setViewportHeight(containerRef.current.clientHeight);
          setContainerWidth(containerRef.current.clientWidth);
        }
      }, 60);
    };

    if (containerRef.current) {
      setViewportHeight(containerRef.current.clientHeight);
      setContainerWidth(containerRef.current.clientWidth);
    }

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, []);

  // Compute cumulative heights and total height based on estimates.
  // This computes whenever messages change or container width changes.
  const { cumulativeHeights, totalHeight } = useMemo(() => {
    const heights = new Array(messages.length + 1);
    heights[0] = 0;
    for (let i = 0; i < messages.length; i++) {
      heights[i + 1] = heights[i] + estimateHeight(messages[i], containerWidth);
    }
    return {
      cumulativeHeights: heights,
      totalHeight: heights[messages.length],
    };
  }, [messages, containerWidth]);

  // Binary search to find the start index for rendering window
  const findStartIndex = (st: number) => {
    let low = 0;
    let high = cumulativeHeights.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (cumulativeHeights[mid] <= st) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.max(0, low - 1);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const top = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(top);
      
      // Show scroll to bottom button if we are scrolled up significantly
      const isUp = scrollHeight - top - clientHeight > 400;
      setShowScrollBottom(isUp);
      
      rafRef.current = null;
    });
  };

  // Clean up raf on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Determine indices of items in current viewport
  const visibleStartIndex = findStartIndex(scrollTop);
  const visibleEndIndex = findStartIndex(scrollTop + viewportHeight);

  // Extend index buffers slightly to ensure fluid scrolling without flickering
  const start = Math.max(0, visibleStartIndex - 15);
  const end = Math.min(messages.length, visibleEndIndex + 20);

  const visibleItems = useMemo(() => {
    return messages.slice(start, end);
  }, [messages, start, end]);

  // Height calculations for spacing buffers
  const topSpacerHeight = cumulativeHeights[start];
  const bottomSpacerHeight = totalHeight - cumulativeHeights[end];

  // Jump index scrolling logic
  useLayoutEffect(() => {
    if (jumpToIndex !== null && containerRef.current) {
      const estimatedY = cumulativeHeights[jumpToIndex];
      // Place the jumped message in the upper-middle region of the viewport
      const targetScroll = Math.max(0, estimatedY - viewportHeight / 3);
      
      containerRef.current.scrollTop = targetScroll;
      setScrollTop(targetScroll);
      
      // Flash animation on the selected message
      setHighlightedId(messages[jumpToIndex].id);
      const timer = setTimeout(() => {
        setHighlightedId(null);
      }, 3000);

      onJumpDone();
      return () => clearTimeout(timer);
    }
  }, [jumpToIndex, cumulativeHeights, viewportHeight, messages, onJumpDone]);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
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
          backgroundSize: '120px 120px'
        }}
      />

      {/* Main Scroll Container */}
      <div
        id="chat-scroll-container"
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative py-4 scroll-smooth focus:outline-none scrollbar-thin scrollbar-thumb-neutral-300"
      >
        <div style={{ minHeight: totalHeight, width: '100%' }} className="flex flex-col">
          {/* Spacer to push visible content down */}
          <div style={{ height: topSpacerHeight }} className="w-full shrink-0" />

          {/* Render Active Window Content */}
          <div className="flex flex-col gap-2.5 px-4 md:px-8 w-full max-w-4xl mx-auto">
            {visibleItems.map((message) => {
              const isMe = me !== null && message.sender === me;
              const isHighlighted = highlightedId === message.id;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isMe={isMe}
                  searchQuery={searchQuery}
                  isHighlighted={isHighlighted}
                />
              );
            })}
          </div>

          {/* Spacer to push remaining space */}
          <div style={{ height: bottomSpacerHeight }} className="w-full shrink-0" />
        </div>
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
