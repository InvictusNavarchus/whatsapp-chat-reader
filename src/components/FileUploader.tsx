import React, { useState, useRef } from 'react';
import { Upload, FileText, BookOpen, AlertCircle } from 'lucide-react';
import { SAMPLE_CHAT } from '../utils/sampleChat';

interface FileUploaderProps {
  onChatLoaded: (text: string, fileName: string) => void;
}

export default function FileUploader({ onChatLoaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.txt')) {
      setError('Please upload a valid WhatsApp export .txt file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        setError('The selected file is empty.');
        return;
      }
      setError(null);
      onChatLoaded(text, file.name);
    };
    reader.onerror = () => {
      setError('An error occurred while reading the file.');
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const loadDemo = () => {
    onChatLoaded(SAMPLE_CHAT, 'Weekend Plans (Sample Chat).txt');
  };

  return (
    <div id="file-uploader-container" className="w-full max-w-2xl mx-auto px-4 py-8 md:py-16 flex flex-col items-center">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-neutral-900 mb-3">
          WhatsApp Chat Reader
        </h1>
        <p className="text-neutral-500 font-sans max-w-md mx-auto text-sm md:text-base leading-relaxed">
          An offline-first, blazing-fast reader designed to render, search, and navigate large exported WhatsApp chat logs beautifully.
        </p>
      </div>

      {/* Main Drag & Drop / Upload Card */}
      <div
        id="dropzone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full bg-white rounded-2xl border-2 border-dashed p-8 md:p-12 text-center cursor-pointer transition-all duration-200 shadow-sm flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/40 scale-[0.99]'
            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept=".txt"
          className="hidden"
        />

        <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-50 text-neutral-400 group-hover:bg-neutral-100'}`}>
          <Upload className="w-8 h-8" />
        </div>

        <p className="font-sans font-medium text-neutral-800 text-base mb-1">
          {isDragging ? 'Drop your chat file here!' : 'Drag & drop your chat .txt file here'}
        </p>
        <p className="font-sans text-neutral-400 text-xs md:text-sm mb-4">
          or click to browse your local files
        </p>
        
        <div className="px-3 py-1 bg-neutral-100 text-neutral-600 font-mono text-[10px] uppercase tracking-wider rounded-md font-semibold">
          Supports iOS & Android formats
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100 text-sm max-w-full">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="font-sans">{error}</p>
        </div>
      )}

      {/* Demo / Sample Chat Trigger */}
      <div className="mt-6 w-full flex items-center justify-center">
        <button
          type="button"
          onClick={loadDemo}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-sans font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 touch-manipulation min-h-[44px]"
        >
          <BookOpen className="w-4 h-4" />
          Load Sample Weekend Chat
        </button>
      </div>

      {/* Instructions Card */}
      <div className="mt-12 w-full bg-neutral-50 rounded-2xl p-6 md:p-8 border border-neutral-100">
        <h3 className="font-sans font-semibold text-neutral-800 text-sm md:text-base mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          How to export your chat from WhatsApp:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm text-neutral-600">
          <div>
            <h4 className="font-sans font-medium text-neutral-800 mb-1.5">For iOS (iPhone)</h4>
            <ol className="list-decimal list-inside space-y-1 font-sans leading-relaxed">
              <li>Open WhatsApp and go to the chat.</li>
              <li>Tap on the contact or group name at the top.</li>
              <li>Scroll down and tap <strong>Export Chat</strong>.</li>
              <li>Choose <strong>Without Media</strong> (for a faster, smaller export).</li>
              <li>Save the exported <code className="font-mono bg-neutral-100 px-1 rounded">_chat.txt</code> file.</li>
            </ol>
          </div>
          <div>
            <h4 className="font-sans font-medium text-neutral-800 mb-1.5">For Android</h4>
            <ol className="list-decimal list-inside space-y-1 font-sans leading-relaxed">
              <li>Open WhatsApp and open the chat.</li>
              <li>Tap the three vertical dots (⋮) in the top right.</li>
              <li>Select <strong>More</strong> &rarr; <strong>Export chat</strong>.</li>
              <li>Choose <strong>Without media</strong>.</li>
              <li>Save the exported <code className="font-mono bg-neutral-100 px-1 rounded">WhatsApp Chat with ....txt</code> file.</li>
            </ol>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-neutral-100 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <p className="font-sans text-xs text-neutral-400 leading-relaxed">
            <strong>Security & Privacy:</strong> This reader is 100% offline-first. Your uploaded chat file is parsed completely inside your local browser. No data, text, or file content is ever transmitted to any external server or cloud service.
          </p>
        </div>
      </div>
    </div>
  );
}
