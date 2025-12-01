import React, { useRef, useEffect, useState } from 'react';
import { Message, Attachment } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSend: (attachments: Attachment[]) => void;
  isLoading: boolean;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  onStop: () => void;
  onClear: () => void;
  isThinking: boolean;
  setIsThinking: (value: boolean) => void;
  isAnnotating: boolean;
  setIsAnnotating: (value: boolean) => void;
  pendingAnnotations: {x: number, y: number}[];
  onRemoveAnnotation: (index: number) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  input, 
  setInput, 
  onSend, 
  isLoading,
  systemInstruction,
  setSystemInstruction,
  onStop,
  onClear,
  isThinking,
  setIsThinking,
  isAnnotating,
  setIsAnnotating,
  pendingAnnotations,
  onRemoveAnnotation
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSystemInstructionOpen, setIsSystemInstructionOpen] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSystemInstructionOpen, isLoading]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((input.trim() || attachments.length > 0 || pendingAnnotations.length > 0) && !isLoading) {
      onSend(attachments);
      setAttachments([]);
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }
  };

  const insertCodeBlock = () => {
    const newText = input + "\n```\n\n```";
    setInput(newText);
    setTimeout(() => {
        if(inputRef.current) {
            inputRef.current.focus();
            const cursorPos = newText.length - 4;
            inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
    }, 10);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAttachment: Attachment = {
            type: 'image',
            content: event.target.result as string,
            mimeType: file.type
          };
          setAttachments([...attachments, newAttachment]);
        }
      };
      
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    if(inputRef.current) inputRef.current.focus();
  };

  const renderMessageContent = (content: string) => {
    if (content.includes('__FILE:')) {
      const parts = content.split(/__FILE:.*__/);
      const preText = parts[0].trim();
      
      return (
        <div>
           {preText && <div className="whitespace-pre-wrap mb-4 font-normal text-lovable-text">{preText}</div>}
           <div className="flex items-center p-3 bg-lovable-panel rounded border border-lovable-border gap-3 w-fit">
              <div className="h-6 w-6 rounded-full bg-green-900/50 flex items-center justify-center text-green-400 text-xs">
                <i className="fa-solid fa-check"></i>
              </div>
              <div>
                 <p className="text-sm font-medium text-lovable-text">Code Generated</p>
                 <p className="text-xs text-lovable-textDim">View in Preview tab</p>
              </div>
           </div>
        </div>
      );
    }
    return <div className="whitespace-pre-wrap font-normal text-lovable-text leading-relaxed">{content}</div>;
  };

  const suggestions = [
    { icon: "fa-solid fa-store", text: "E-commerce landing page with hero section" },
    { icon: "fa-brands fa-js", text: "Interactive To-Do List with local storage" },
    { icon: "fa-solid fa-chart-pie", text: "Dashboard layout with sidebar and charts" },
    { icon: "fa-solid fa-envelope", text: "Contact form with validation and success state" }
  ];

  return (
    <div className="flex flex-col h-full bg-lovable-dark">
      {/* System Instructions & Toolbar */}
      <div className="shrink-0 border-b border-lovable-border bg-lovable-dark z-20">
        <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsSystemInstructionOpen(!isSystemInstructionOpen)}
                    className="flex items-center gap-2 text-xs font-medium text-lovable-textDim hover:text-lovable-text transition-colors"
                >
                    <i className={`fa-solid fa-chevron-${isSystemInstructionOpen ? 'up' : 'down'} w-3`}></i>
                    <span>System Instructions</span>
                </button>
                
                <button 
                    onClick={() => setIsThinking(!isThinking)}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors px-2 py-1 rounded border ${isThinking ? 'bg-purple-900/30 border-purple-500/50 text-purple-300' : 'border-transparent text-lovable-textDim hover:text-lovable-text'}`}
                    title="Enable Thinking Mode (Gemini 3 Pro)"
                >
                    <i className={`fa-solid fa-brain ${isThinking ? 'animate-pulse' : ''}`}></i>
                    <span>Thinking Mode</span>
                </button>
            </div>

            <button 
                onClick={onClear}
                className="text-xs text-lovable-textDim hover:text-red-400 transition-colors flex items-center gap-1"
                title="Clear Chat"
            >
                <i className="fa-regular fa-trash-can"></i>
                <span className="hidden sm:inline">Clear Chat</span>
            </button>
        </div>
        
        {isSystemInstructionOpen && (
            <div className="px-4 pb-4">
                <textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    className="w-full h-32 bg-lovable-panel border border-lovable-border rounded p-3 text-xs font-mono text-lovable-text focus:outline-none focus:border-lovable-accent resize-none"
                    placeholder="Enter system instructions..."
                />
            </div>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-lovable-textDim opacity-50 px-6">
             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
                <i className="fa-solid fa-sparkles text-2xl text-white"></i>
             </div>
             <h2 className="text-xl font-semibold text-white mb-2">Build something amazing</h2>
             <p className="text-sm text-lovable-textDim mb-10 text-center max-w-md">
                I'm your expert frontend engineer. Describe what you want, or upload a screenshot, and I'll code it pixel-perfectly.
             </p>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestions.map((s, i) => (
                    <button 
                        key={i} 
                        onClick={() => handleSuggestionClick(s.text)}
                        className="text-left p-4 rounded-xl border border-lovable-border bg-lovable-panel hover:bg-lovable-hover hover:border-lovable-accent/50 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-6 h-6 rounded bg-[#2a2b2d] flex items-center justify-center text-lovable-accent group-hover:scale-110 transition-transform">
                                <i className={s.icon + " text-xs"}></i>
                            </div>
                            <span className="text-sm text-lovable-text group-hover:text-white">{s.text}</span>
                        </div>
                    </button>
                ))}
             </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               {/* User Message - Right aligned bubble */}
               {msg.role === 'user' ? (
                 <div className="max-w-[85%] sm:max-w-[75%]">
                    <div className="bg-[#303133] rounded-2xl rounded-tr-sm px-5 py-3 text-lovable-text whitespace-pre-wrap">
                        {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                                {msg.attachments.map((att, idx) => (
                                <img 
                                    key={idx} 
                                    src={att.content} 
                                    alt="attachment" 
                                    className="h-32 w-auto rounded border border-lovable-border object-contain bg-black/20" 
                                />
                                ))}
                            </div>
                        )}
                        {/* Display embedded context if any (it might be in content string or handled separately) */}
                        {msg.content}
                    </div>
                 </div>
               ) : (
                 /* Assistant Message - Left aligned, clean text with icon */
                 <div className="flex flex-col gap-1 max-w-[90%]">
                    <div className="flex gap-4">
                        <div className="shrink-0 mt-1">
                            <i className="fa-solid fa-sparkles text-lovable-accent text-lg"></i>
                        </div>
                        <div className="text-sm md:text-base pt-0.5">
                            {renderMessageContent(msg.content)}
                        </div>
                    </div>
                    {/* Latency and Meta info */}
                    <div className="pl-9 flex items-center gap-3 mt-1">
                       {msg.latency && (
                           <span className="text-[10px] text-lovable-textDim font-mono">
                               <i className="fa-regular fa-clock mr-1"></i>
                               {(msg.latency / 1000).toFixed(1)}s
                           </span>
                       )}
                    </div>
                 </div>
               )}
            </div>
          ))
        )}
        {isLoading && (
            <div className="flex gap-4 max-w-[90%]">
                <div className="shrink-0 mt-1">
                     <span className="w-4 h-4 block rounded-full border-2 border-lovable-textDim/30 border-t-lovable-accent animate-spin"></span>
                </div>
                <div className="text-lovable-textDim pt-0.5 text-sm">
                    {isThinking ? 'Thinking deeply...' : 'Thinking...'}
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-lovable-dark z-10">
        <div className="max-w-4xl mx-auto">
            {/* Attachment & Annotation Previews */}
            {(attachments.length > 0 || pendingAnnotations.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((att, idx) => (
                        <div key={idx} className="relative group">
                            <img src={att.content} alt="preview" className="h-12 w-12 object-cover rounded border border-lovable-border" />
                            <button 
                                onClick={() => removeAttachment(idx)}
                                className="absolute -top-1 -right-1 bg-lovable-panel text-lovable-text rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:text-white border border-lovable-border"
                            >
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                    ))}
                    {pendingAnnotations.map((ann, idx) => (
                         <div key={`ann-${idx}`} className="flex items-center gap-2 bg-[#2a2b2d] border border-lovable-border rounded-full px-3 py-1 text-xs text-lovable-text">
                            <i className="fa-solid fa-location-dot text-lovable-accent"></i>
                            <span>Position: {ann.x}%, {ann.y}%</span>
                            <button 
                                onClick={() => onRemoveAnnotation(idx)}
                                className="ml-1 text-lovable-textDim hover:text-white"
                            >
                                <i className="fa-solid fa-times"></i>
                            </button>
                         </div>
                    ))}
                </div>
            )}
            
            <div className="relative bg-lovable-panel rounded-[28px] focus-within:bg-[#303133] transition-colors">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type something..."
                    className="w-full bg-transparent text-lovable-text placeholder-lovable-textDim text-base px-6 py-4 focus:outline-none resize-none max-h-60 rounded-[28px]"
                    rows={1}
                />
                
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                     <div className="flex items-center mr-1 gap-1">
                         <button 
                            onClick={() => setIsAnnotating(!isAnnotating)}
                            className={`p-2 transition-colors rounded-full ${isAnnotating ? 'bg-lovable-accent text-white' : 'text-lovable-textDim hover:text-lovable-text hover:bg-white/10'}`}
                            title={isAnnotating ? "Click on preview to select location" : "Annotate (Select location in preview)"}
                        >
                             <i className="fa-solid fa-location-crosshairs"></i>
                        </button>
                         <button 
                            onClick={insertCodeBlock}
                            className="p-2 text-lovable-textDim hover:text-lovable-text transition-colors rounded-full hover:bg-white/10"
                            title="Insert code block"
                        >
                             <i className="fa-solid fa-code"></i>
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-lovable-textDim hover:text-lovable-text transition-colors rounded-full hover:bg-white/10"
                            title="Add image"
                        >
                            <i className="fa-regular fa-image text-lg"></i>
                        </button>
                    </div>

                    {isLoading ? (
                         <button 
                            onClick={onStop}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-lovable-text text-lovable-dark hover:opacity-90 transition-opacity"
                            title="Stop generation"
                        >
                            <i className="fa-solid fa-square text-sm"></i>
                        </button>
                    ) : (
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() && attachments.length === 0 && pendingAnnotations.length === 0}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                                (input.trim() || attachments.length > 0 || pendingAnnotations.length > 0)
                                ? 'bg-lovable-accent text-white hover:bg-lovable-accentHover' 
                                : 'bg-transparent text-lovable-textDim'
                            }`}
                        >
                            <i className="fa-solid fa-arrow-up"></i>
                        </button>
                    )}
                </div>
            </div>
            <div className="text-center mt-2 flex items-center justify-center gap-2">
                <span className="text-[10px] text-lovable-textDim">Gemini 2.5 Flash can make mistakes. Check important info.</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;