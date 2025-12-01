import React, { useState, useCallback, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import ChatInterface from './components/ChatInterface';
import PreviewPane from './components/PreviewPane';
import RunSettingsPanel from './components/RunSettings';
import { sendMessageToGemini, parseGeneratedFiles, DEFAULT_SYSTEM_INSTRUCTION, resetChat } from './services/geminiService';
import { Message, ViewMode, Attachment, FileMap, RunSettings, DeviceType } from './types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<FileMap>({});
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SPLIT);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);
  const [isThinking, setIsThinking] = useState(false);
  
  // Annotation State
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [pendingAnnotations, setPendingAnnotations] = useState<{x: number, y: number}[]>([]);

  // Preview Device State (for context awareness)
  const [previewDevice, setPreviewDevice] = useState<DeviceType>('desktop');

  // Right Sidebar & Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [runSettings, setRunSettings] = useState<RunSettings>({
    model: 'gemini-2.5-flash',
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
  });
  
  // Create New Menu State
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = useCallback(async (attachments: Attachment[] = [], overrideInput?: string) => {
    let textToSend = overrideInput || input;
    
    // Add Context Context for AI (Annotations + Viewport)
    let contextData = "";
    
    if (!overrideInput && pendingAnnotations.length > 0) {
        contextData += pendingAnnotations.map(a => `[CONTEXT: User clicked at screen coordinates ${a.x}% horizontal, ${a.y}% vertical]`).join('\n');
    }
    
    // Append viewport context so AI knows if user is looking at mobile/desktop
    contextData += `\n[CONTEXT: User is currently viewing the app in ${previewDevice.toUpperCase()} mode.]`;
    
    if (contextData) {
        textToSend = `${textToSend}\n\n${contextData}`;
    }

    if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: textToSend, // Display the full text including context for transparency, or could strip it for UI
      timestamp: Date.now(),
      attachments: attachments
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideInput) {
        setInput('');
        setPendingAnnotations([]); // Clear annotations after send
    }
    setIsLoading(true);

    const assistantMessageId = generateId();
    const startTime = Date.now();

    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: 'assistant', content: '', timestamp: startTime }
    ]);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      let accumulatedText = '';
      
      await sendMessageToGemini(
        textToSend, 
        attachments, 
        messages, 
        (textChunk) => {
          accumulatedText = textChunk;
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === assistantMessageId 
                ? { ...msg, content: accumulatedText } 
                : msg
            )
          );

          const files = parseGeneratedFiles(accumulatedText);
          if (Object.keys(files).length > 0) {
              setCurrentFiles(files);
          }
        },
        systemInstruction,
        isThinking,
        runSettings,
        abortControllerRef.current.signal
      );

      // On complete, update latency
      const endTime = Date.now();
      const latency = endTime - startTime;
      setMessages((prev) => 
        prev.map((msg) => 
            msg.id === assistantMessageId 
            ? { ...msg, latency: latency }
            : msg
        )
      );

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Failed to send message", error);
        
        // Show specific error if available (e.g. missing API key)
        const errorMessage = error.message && (error.message.includes('API Key') || error.message.includes('API key')) 
            ? `Error: ${error.message}`
            : 'Error: Failed to connect. Please check your API key or internet connection.';
            
        setMessages((prev) => [
            ...prev,
            { id: generateId(), role: 'assistant', content: errorMessage, timestamp: Date.now() }
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, messages, systemInstruction, isThinking, runSettings, pendingAnnotations, previewDevice]);

  const handleStop = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setCurrentFiles({});
    resetChat();
    setPendingAnnotations([]);
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setIsCreateMenuOpen(false);
  };

  const handleImportClick = () => {
    projectInputRef.current?.click();
    setIsCreateMenuOpen(false);
  };

  const handleAutoFix = () => {
      // Trigger a specific prompt for auto-fixing
      handleSendMessage([], "Auto Fix: Please analyze the current code for any syntax errors, logical bugs, missing accessibility attributes, or responsive layout issues and fix them. Ensure the code is robust.");
  };

  const handleAnnotationSelect = (x: number, y: number) => {
      setPendingAnnotations(prev => [...prev, {x, y}]);
      setIsAnnotating(false); // Turn off annotation mode after selection to mimic "click tool -> select -> done" flow
  };

  const handleFileUpdate = (newFiles: FileMap) => {
    setCurrentFiles(newFiles);
  };

  const handleProjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newFiles: FileMap = {};
    
    try {
        if (file.name.endsWith('.zip')) {
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(file);
            
            for (const filename of Object.keys(loadedZip.files)) {
                if (!loadedZip.files[filename].dir && !filename.startsWith('__MACOSX') && !filename.includes('.DS_Store')) {
                const content = await loadedZip.files[filename].async('string');
                newFiles[filename] = content;
                }
            }
        } else if (file.name.endsWith('.html')) {
            const content = await file.text();
            // Use filename or default to index.html if it's the main file
            newFiles[file.name] = content;
            if (file.name !== 'index.html' && !newFiles['index.html']) {
                 newFiles['index.html'] = content;
            }
        }

        if (Object.keys(newFiles).length > 0) {
            setCurrentFiles(newFiles);
            
            // Construct a context message to inform AI of the imported code
            let contextMessage = "";
            Object.entries(newFiles).forEach(([name, content]) => {
                contextMessage += `__FILE: ${name}__\n${content}\n\n`;
            });
            
            setMessages(prev => [
                ...prev, 
                { 
                    id: generateId(), 
                    role: 'user', 
                    content: `I have imported the project files (${Object.keys(newFiles).join(', ')}). Use this as the current state.`, 
                    timestamp: Date.now() 
                },
                {
                    id: generateId(),
                    role: 'assistant',
                    content: contextMessage, 
                    timestamp: Date.now(),
                    latency: 0
                }
            ]);
        }
    } catch (error) {
        console.error("Failed to import project:", error);
        alert("Failed to import project file.");
    }
    
    if (projectInputRef.current) projectInputRef.current.value = '';
  };

  return (
    <div className="flex h-screen w-screen bg-lovable-dark overflow-hidden font-sans text-lovable-text">
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Minimal Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-lovable-border bg-lovable-dark shrink-0 relative">
          <div className="flex items-center gap-4" ref={createMenuRef}>
             <button 
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-lovable-accent text-white rounded-lg text-xs font-medium hover:bg-lovable-accentHover transition-colors shadow-sm"
             >
                <i className="fa-solid fa-plus"></i>
                <span className="hidden sm:inline">New</span>
             </button>

             {isCreateMenuOpen && (
                 <div className="absolute top-12 left-4 z-50 w-56 bg-[#2d2e30] rounded-lg shadow-xl border border-lovable-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button onClick={handleClearChat} className="w-full text-left px-4 py-3 text-sm text-lovable-text hover:bg-lovable-hover transition-colors flex items-center gap-3">
                        <i className="fa-regular fa-message text-lovable-accent"></i>
                        <div>
                            <div className="font-medium">New Prompt</div>
                            <div className="text-[10px] text-lovable-textDim">Start a fresh chat session</div>
                        </div>
                    </button>
                    <div className="h-px bg-lovable-border mx-2"></div>
                    <button onClick={handleImportClick} className="w-full text-left px-4 py-3 text-sm text-lovable-text hover:bg-lovable-hover transition-colors flex items-center gap-3">
                        <i className="fa-solid fa-file-import text-green-400"></i>
                        <div>
                            <div className="font-medium">Import Project</div>
                            <div className="text-[10px] text-lovable-textDim">Upload .zip or .html</div>
                        </div>
                    </button>
                     <button onClick={() => {}} className="w-full text-left px-4 py-3 text-sm text-lovable-textDim hover:bg-lovable-hover transition-colors flex items-center gap-3 cursor-not-allowed opacity-50">
                        <i className="fa-solid fa-image text-purple-400"></i>
                        <div>
                            <div className="font-medium">Image to App</div>
                            <div className="text-[10px] text-lovable-textDim">Coming soon</div>
                        </div>
                    </button>
                </div>
             )}
          </div>
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
             <span className="text-sm font-bold text-lovable-text tracking-wide opacity-90">LOVABLE</span>
          </div>
          
          <div className="flex items-center gap-3">
             {/* View Mode Switcher */}
            <div className="flex bg-lovable-panel p-0.5 rounded border border-lovable-border md:hidden">
                <button 
                onClick={() => setViewMode(ViewMode.CHAT)}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${viewMode === ViewMode.CHAT ? 'bg-lovable-hover text-white' : 'text-lovable-textDim'}`}
                >
                Chat
                </button>
                <button 
                onClick={() => setViewMode(ViewMode.PREVIEW)}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${viewMode === ViewMode.PREVIEW ? 'bg-lovable-hover text-white' : 'text-lovable-textDim'}`}
                >
                Preview
                </button>
            </div>
            
            <input 
                type="file" 
                ref={projectInputRef} 
                className="hidden" 
                accept=".zip,.html"
                onChange={handleProjectFileChange}
            />
            {/* Mobile-only import */}
            <button 
              onClick={handleImportClick}
              className="md:hidden text-lovable-accent hover:text-lovable-accentHover px-3 py-1.5 text-xs font-medium bg-blue-900/10 rounded transition-colors flex items-center gap-2"
            >
                 <i className="fa-solid fa-file-import"></i>
            </button>
            
            <div className="w-px h-4 bg-lovable-border mx-1"></div>

            <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`text-lovable-textDim hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full ${isSettingsOpen ? 'bg-lovable-hover' : ''}`}
            >
                 <i className="fa-solid fa-sliders"></i>
            </button>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Chat Pane */}
          <div className={`
            flex-col transition-all duration-300 h-full border-r border-lovable-border bg-lovable-dark
            ${viewMode === ViewMode.CHAT ? 'flex w-full' : ''}
            ${viewMode === ViewMode.SPLIT ? 'hidden md:flex md:w-[450px]' : ''}
            ${viewMode === ViewMode.PREVIEW ? 'hidden' : ''}
          `}>
            <ChatInterface 
              messages={messages} 
              input={input} 
              setInput={setInput} 
              onSend={(attachments) => handleSendMessage(attachments)}
              isLoading={isLoading}
              systemInstruction={systemInstruction}
              setSystemInstruction={setSystemInstruction}
              onStop={handleStop}
              onClear={handleClearChat}
              isThinking={isThinking}
              setIsThinking={setIsThinking}
              isAnnotating={isAnnotating}
              setIsAnnotating={setIsAnnotating}
              pendingAnnotations={pendingAnnotations}
              onRemoveAnnotation={(index) => setPendingAnnotations(prev => prev.filter((_, i) => i !== index))}
            />
          </div>

          {/* Preview Pane */}
          <div className={`
            flex-col transition-all duration-300 h-full bg-[#1e1e20]
            ${viewMode === ViewMode.PREVIEW ? 'flex w-full' : ''}
            ${viewMode === ViewMode.SPLIT ? 'hidden md:flex flex-1' : ''}
            ${viewMode === ViewMode.CHAT ? 'hidden' : ''}
          `}>
             <PreviewPane 
                files={currentFiles} 
                isGenerating={isLoading} 
                onAutoFix={handleAutoFix}
                isAnnotating={isAnnotating}
                onAnnotateSelect={handleAnnotationSelect}
                onFileUpdate={handleFileUpdate}
                previewDevice={previewDevice}
                onDeviceChange={setPreviewDevice}
             />
          </div>

           {/* Right Sidebar: Run Settings */}
           <RunSettingsPanel 
              settings={runSettings} 
              setSettings={setRunSettings} 
              isOpen={isSettingsOpen} 
              onClose={() => setIsSettingsOpen(false)}
           />

        </div>
      </main>
    </div>
  );
};

export default App;