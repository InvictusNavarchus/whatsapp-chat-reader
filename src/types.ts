export interface Message {
  id: number;
  rawTimestamp: string;
  timestamp: Date | null;
  sender: string;
  content: string;
  contentLower: string;
  isSystem: boolean;
  isAttachment: boolean;
  attachmentType: 'image' | 'video' | 'audio' | 'document' | 'sticker' | null;
  formattedTime: string;
  formattedDateShort: string;
}

export interface ChatStats {
  totalMessages: number;
  participants: string[];
  senderCounts: Record<string, number>;
  startDate: Date | null;
  endDate: Date | null;
}

export interface SearchMatch {
  index: number;
  message: Message;
}
