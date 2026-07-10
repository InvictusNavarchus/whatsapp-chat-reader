import { create } from 'zustand';
import type { DateMapEntry } from '../types';

export type AppStep = 'UPLOAD' | 'SELECT_IDENTITY' | 'READER';

interface ChatState {
	step: AppStep;
	fileName: string;
	participants: string[];
	senderCounts: Record<string, number>;
	me: string | null;
	currentChatId: string | null;
	dateMap: DateMapEntry[];
	isConversationReady: boolean;

	// Search & navigation panel states
	isSearchOpen: boolean;
	isStarredOpen: boolean;
	searchQuery: string;
	jumpToIndex: number | null;

	// Setters
	setStep: (step: AppStep) => void;
	setFileName: (name: string) => void;
	setParticipants: (participants: string[]) => void;
	setSenderCounts: (counts: Record<string, number>) => void;
	setMe: (me: string | null) => void;
	setCurrentChatId: (id: string | null) => void;
	setDateMap: (dateMap: DateMapEntry[]) => void;
	setIsConversationReady: (ready: boolean) => void;

	// UI panels
	setIsSearchOpen: (open: boolean) => void;
	setIsStarredOpen: (open: boolean) => void;
	openSearch: () => void;
	openStarred: () => void;
	closeAllPanels: () => void;
	setSearchQuery: (query: string) => void;
	setJumpToIndex: (index: number | null) => void;

	// Unload chat / Reset UI store
	reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
	step: 'UPLOAD',
	fileName: '',
	participants: [],
	senderCounts: {},
	me: null,
	currentChatId: null,
	dateMap: [],
	isConversationReady: false,

	isSearchOpen: false,
	isStarredOpen: false,
	searchQuery: '',
	jumpToIndex: null,

	setStep: (step) => set({ step }),
	setFileName: (fileName) => set({ fileName }),
	setParticipants: (participants) => set({ participants }),
	setSenderCounts: (senderCounts) => set({ senderCounts }),
	setMe: (me) => set({ me }),
	setCurrentChatId: (currentChatId) => set({ currentChatId }),
	setDateMap: (dateMap) => set({ dateMap }),
	setIsConversationReady: (isConversationReady) => set({ isConversationReady }),

	setIsSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
	setIsStarredOpen: (isStarredOpen) => set({ isStarredOpen }),
	openSearch: () => set({ isSearchOpen: true, isStarredOpen: false }),
	openStarred: () => set({ isSearchOpen: false, isStarredOpen: true }),
	closeAllPanels: () => set({ isSearchOpen: false, isStarredOpen: false }),
	setSearchQuery: (searchQuery) => set({ searchQuery }),
	setJumpToIndex: (jumpToIndex) => set({ jumpToIndex }),

	reset: () =>
		set({
			step: 'UPLOAD',
			fileName: '',
			participants: [],
			senderCounts: {},
			me: null,
			currentChatId: null,
			dateMap: [],
			isConversationReady: false,
			isSearchOpen: false,
			isStarredOpen: false,
			searchQuery: '',
			jumpToIndex: null,
		}),
}));
