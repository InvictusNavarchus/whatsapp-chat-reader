import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, CornerDownRight } from 'lucide-react';
import { Message, SearchMatch } from '../types';

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface SearchPanelProps {
  messages: Message[];
  onSelectMatch: (index: number) => void;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export default function SearchPanel({
  messages,
  onSelectMatch,
  onClose,
  searchQuery,
  onSearchQueryChange,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Compute matches based on query
  const matches: SearchMatch[] = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];

    const queryLower = searchQuery.toLowerCase();
    const results: SearchMatch[] = [];

    // Scan through all messages to find occurrences
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      // Skip system messages and attachments if we are searching for text specifically,
      // but let's check content regardless.
      if (msg.content.toLowerCase().includes(queryLower)) {
        results.push({
          index: i,
          message: msg,
        });
      }
    }
    return results;
  }, [messages, searchQuery]);

  // Cap visible search items in side panel to ensure extreme rendering speed (mobile optimization)
  const MAX_SIDEBAR_MATCHES = 200;
  const slicedMatches = useMemo(() => {
    return matches.slice(0, MAX_SIDEBAR_MATCHES);
  }, [matches]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchQueryChange(e.target.value);
  };

  const clearSearch = () => {
    onSearchQueryChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full md:w-[380px] bg-white border-l border-neutral-200 flex flex-col h-full shadow-2xl md:shadow-none shrink-0 z-40 relative">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
        <h3 className="font-sans font-semibold text-neutral-800 text-sm md:text-base flex items-center gap-2">
          <Search className="w-4 h-4 text-neutral-500" />
          Search Messages
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors focus:outline-none touch-manipulation min-h-[36px]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Input area */}
      <div className="p-4 border-b border-neutral-100 shrink-0">
        <div className="relative">
          <input
            type="text"
            ref={inputRef}
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search words, phrases..."
            className="w-full pl-9 pr-8 py-2 border border-neutral-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-neutral-400 bg-neutral-50/50"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-2.5 p-0.5 hover:bg-neutral-200 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-neutral-400 font-sans mt-2">
          Type at least 2 characters to search. Search is case-insensitive.
        </p>
      </div>

      {/* Results panel */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {searchQuery.trim().length < 2 ? (
          <div className="p-8 text-center text-neutral-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-neutral-200" />
            <p className="font-sans text-sm font-medium">Search History</p>
            <p className="font-sans text-xs mt-1">Enter a keyword above to find conversations instantly.</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center text-neutral-400">
            <X className="w-10 h-10 mx-auto mb-3 text-neutral-200" />
            <p className="font-sans text-sm font-medium">No results found</p>
            <p className="font-sans text-xs mt-1">No messages match "{searchQuery}" in this chat.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="px-4 py-2 bg-neutral-50 text-neutral-500 font-sans text-[11px] font-semibold border-b border-neutral-100 flex items-center justify-between">
              <span>MATCHES FOUND</span>
              <span>
                {matches.length > MAX_SIDEBAR_MATCHES
                  ? `Showing top ${MAX_SIDEBAR_MATCHES} of ${matches.length}`
                  : `${matches.length} matches`}
              </span>
            </div>

            <div className="divide-y divide-neutral-100">
              {slicedMatches.map(({ index, message }) => {
                const parts = message.content.split(new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi'));
                const messageTime = message.timestamp
                  ? message.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : message.rawTimestamp.split(',')[0] || '';

                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => onSelectMatch(index)}
                    className="w-full text-left p-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors focus:outline-none focus:bg-neutral-50 flex flex-col gap-1 font-sans"
                  >
                    <div className="flex justify-between items-baseline w-full">
                      <span className="font-semibold text-xs text-neutral-700 truncate max-w-[180px]">
                        {message.sender}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {messageTime}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed break-all">
                      {parts.map((part, idx) =>
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark key={idx} className="bg-amber-100 text-amber-900 font-semibold rounded-[2px] px-0.5">
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )}
                    </p>

                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1">
                      <CornerDownRight className="w-3 h-3" />
                      <span>Jump to message</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
