import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import FileUploader from './components/FileUploader';
import ParticipantSelector from './components/ParticipantSelector';
import ChatHeader from './components/ChatHeader';
import VirtualMessageList from './components/VirtualMessageList';
import SearchPanel from './components/SearchPanel';
import { parseWhatsAppChat } from './utils/parser';
import { Message } from './types';

type AppStep = 'UPLOAD' | 'SELECT_IDENTITY' | 'READER';

export default function App() {
	const [step, setStep] = useState<AppStep>('UPLOAD');
	const [messages, setMessages] = useState<Message[]>([]);
	const [fileName, setFileName] = useState<string>('');
	const [participants, setParticipants] = useState<string[]>([]);
	const [senderCounts, setSenderCounts] = useState<Record<string, number>>({});
	const [me, setMe] = useState<string | null>(null);

	// Search and Scroll Navigation coordination
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [jumpToIndex, setJumpToIndex] = useState<number | null>(null);

	const handleChatLoaded = (text: string, name: string) => {
		const parsed = parseWhatsAppChat(text);
		if (parsed.length === 0) {
			alert(
				'Unable to extract any messages. Please check if this is a standard WhatsApp chat log export.',
			);
			return;
		}

		// Identify unique participants and message counts
		const senders = new Set<string>();
		const counts: Record<string, number> = {};

		parsed.forEach((msg) => {
			if (!msg.isSystem && msg.sender !== 'System') {
				senders.add(msg.sender);
				counts[msg.sender] = (counts[msg.sender] || 0) + 1;
			}
		});

		const participantList = Array.from(senders);

		setMessages(parsed);
		setParticipants(participantList);
		setSenderCounts(counts);
		setFileName(name);

		// If there are clear participants, let the user pick their own identity,
		// otherwise jump straight to the reader view.
		if (participantList.length > 0) {
			setStep('SELECT_IDENTITY');
		} else {
			setMe(null);
			setStep('READER');
		}
	};

	const handleIdentitySelected = (name: string | null) => {
		setMe(name);
		setStep('READER');
	};

	const handleBackToUpload = () => {
		if (
			window.confirm('Are you sure you want to unload the current chat log?')
		) {
			setStep('UPLOAD');
			setMessages([]);
			setFileName('');
			setParticipants([]);
			setSenderCounts({});
			setMe(null);
			setIsSearchOpen(false);
			setSearchQuery('');
			setJumpToIndex(null);
		}
	};

	const handleJumpToMessage = (index: number) => {
		setJumpToIndex(index);
		// On mobile, close search sidebar after jumping to keep things uncluttered
		if (window.innerWidth < 768) {
			setIsSearchOpen(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#fafaf9] flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
			<AnimatePresence mode="wait">
				{step === 'UPLOAD' && (
					<motion.div
						key="upload"
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -15 }}
						transition={{ duration: 0.25, ease: 'easeOut' }}
						className="flex-1 flex flex-col justify-center py-6"
					>
						<FileUploader onChatLoaded={handleChatLoaded} />
					</motion.div>
				)}

				{step === 'SELECT_IDENTITY' && (
					<motion.div
						key="identity"
						initial={{ opacity: 0, scale: 0.98 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.98 }}
						transition={{ duration: 0.25, ease: 'easeOut' }}
						className="flex-1 flex flex-col justify-center py-6"
					>
						<ParticipantSelector
							participants={participants}
							senderCounts={senderCounts}
							onSelectMe={handleIdentitySelected}
							fileName={fileName}
						/>
					</motion.div>
				)}

				{step === 'READER' && (
					<motion.div
						key="reader"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="flex-1 flex flex-col h-screen overflow-hidden"
					>
						{/* Header Area */}
						<ChatHeader
							fileName={fileName}
							messages={messages}
							participants={participants}
							me={me}
							onBack={handleBackToUpload}
							onSearchToggle={() => setIsSearchOpen(!isSearchOpen)}
							isSearchOpen={isSearchOpen}
							onJumpToMessage={handleJumpToMessage}
						/>

						{/* Chat Area Content Workspace */}
						<div className="flex-1 flex flex-row overflow-hidden relative">
							{/* Main Scrolling Viewer */}
							<VirtualMessageList
								messages={messages}
								me={me}
								searchQuery={searchQuery}
								jumpToIndex={jumpToIndex}
								onJumpDone={() => setJumpToIndex(null)}
							/>

							{/* Collapsible Slide-out Search Panel */}
							<AnimatePresence>
								{isSearchOpen && (
									<motion.div
										initial={{ x: '100%' }}
										animate={{ x: 0 }}
										exit={{ x: '100%' }}
										transition={{ type: 'spring', damping: 25, stiffness: 220 }}
										className="absolute right-0 top-0 bottom-0 md:relative h-full shadow-2xl md:shadow-none z-40 max-w-full"
									>
										<SearchPanel
											messages={messages}
											searchQuery={searchQuery}
											onSearchQueryChange={setSearchQuery}
											onSelectMatch={handleJumpToMessage}
											onClose={() => setIsSearchOpen(false)}
										/>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
