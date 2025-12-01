import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { FileMap, DeviceType } from '../types';

interface PreviewPaneProps {
  files: FileMap;
  isGenerating: boolean;
  onAutoFix?: () => void;
  isAnnotating?: boolean;
  onAnnotateSelect?: (x: number, y: number) => void;
  onFileUpdate?: (newFiles: FileMap) => void;
  previewDevice?: DeviceType;
  onDeviceChange?: (device: DeviceType) => void;
}

type Tab = 'preview' | 'code' | 'assets';

type AssetType = 'image' | 'video' | 'link' | 'text';

interface DetectedAsset {
    id: string; // unique key for list
    originalValue: string;
    currentValue: string;
    type: AssetType;
    count: number;
    context?: string; // e.g., "Button" or "Hero Image"
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ 
  files, 
  isGenerating, 
  onAutoFix, 
  isAnnotating, 
  onAnnotateSelect, 
  onFileUpdate,
  previewDevice = 'desktop',
  onDeviceChange
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Remove local device state, use prop
  // const [device, setDevice] = useState<DeviceType>('desktop');
  
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  // Local state to handle manual edits
  const [localFiles, setLocalFiles] = useState<FileMap>(files);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Asset Management State
  const [assets, setAssets] = useState<{
      media: DetectedAsset[];
      links: DetectedAsset[];
      content: DetectedAsset[];
  }>({ media: [], links: [], content: [] });

  // Sync local files when parent files change (new generation)
  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  // Handle manual code edits
  const handleCodeChange = (newContent: string) => {
    if (!selectedFile) return;
    
    const updatedFiles = {
        ...localFiles,
        [selectedFile]: newContent
    };
    
    setLocalFiles(updatedFiles);
    
    // Notify parent to keep global state in sync (for exports etc)
    if (onFileUpdate) {
        onFileUpdate(updatedFiles);
    }
  };

  useEffect(() => {
    if (Object.keys(localFiles).length > 0 && !selectedFile) {
      setSelectedFile(Object.keys(localFiles)[0]);
    }
    if (selectedFile && !localFiles[selectedFile] && Object.keys(localFiles).length > 0) {
      setSelectedFile(Object.keys(localFiles)[0]);
    }
    scanForAssets();
  }, [localFiles, selectedFile]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
          if (isFullScreen) setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen]);

  const scanForAssets = () => {
    const mediaMap = new Map<string, DetectedAsset>();
    const linkMap = new Map<string, DetectedAsset>();
    const textMap = new Map<string, DetectedAsset>();
    
    // Helper to add/update asset
    const addAsset = (map: Map<string, DetectedAsset>, value: string, type: AssetType, context?: string) => {
        if (!value || value.trim() === '' || value.startsWith('data:')) return;
        
        if (map.has(value)) {
            const existing = map.get(value)!;
            existing.count++;
        } else {
            map.set(value, {
                id: `${type}-${value}-${Math.random()}`,
                originalValue: value,
                currentValue: value,
                type,
                count: 1,
                context
            });
        }
    };

    if (localFiles['index.html']) {
        const html = localFiles['index.html'];

        // 1. Scan Images (src)
        const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
            addAsset(mediaMap, match[1], 'image');
        }

        // 2. Scan Videos (src)
        const videoRegex = /<(?:video|source)[^>]+src=["']([^"']+)["']/g;
        while ((match = videoRegex.exec(html)) !== null) {
            addAsset(mediaMap, match[1], 'video');
        }

        // 3. Scan Links (href)
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/g;
        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                addAsset(linkMap, href, 'link');
            }
        }

        // 4. Scan Button Text
        const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/g;
        while ((match = buttonRegex.exec(html)) !== null) {
            const text = match[1].trim();
            // Simple text only, avoid nested tags if possible
            if (text && !text.includes('<')) {
                addAsset(textMap, text, 'text', 'Button');
            }
        }
    }

    // 5. Scan CSS for Background Images
    Object.keys(localFiles).forEach(filename => {
        if (filename.endsWith('.css') || filename === 'index.html') {
             const content = localFiles[filename];
             const urlRegex = /url\((['"]?)(.*?)\1\)/g;
             let match;
             while ((match = urlRegex.exec(content)) !== null) {
                 addAsset(mediaMap, match[2], 'image');
             }
        }
    });

    setAssets({
        media: Array.from(mediaMap.values()),
        links: Array.from(linkMap.values()),
        content: Array.from(textMap.values())
    });
  };

  const handleUpdateAsset = (asset: DetectedAsset, newValue: string) => {
      if (!newValue || newValue === asset.currentValue) return;
      
      const newFiles = { ...localFiles };
      let updated = false;

      // Escape special characters for regex
      const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
      };

      Object.keys(newFiles).forEach(filename => {
          const content = newFiles[filename];
          let newContent = content;

          if (asset.type === 'text') {
             // For text, we need to be careful not to replace attributes, only content
             // This is a naive replacement, but works for the scope of a simple editor
             // We look for >OLD_VALUE<
             const regex = new RegExp(`>${escapeRegExp(asset.currentValue)}<`, 'g');
             if (regex.test(content)) {
                 newContent = content.replace(regex, `>${newValue}<`);
                 updated = true;
             }
          } else {
             // For URLs (src, href), simple global replace is usually safe enough for generated code
             if (content.includes(asset.currentValue)) {
                 newContent = content.split(asset.currentValue).join(newValue);
                 updated = true;
             }
          }

          if (updated) {
              newFiles[filename] = newContent;
          }
      });

      if (updated) {
          setLocalFiles(newFiles);
          if (onFileUpdate) {
              onFileUpdate(newFiles);
          }
      }
  };

  // Helper to build the single HTML content
  const getBundledHtml = () => {
    if (!localFiles['index.html']) return '';
    let htmlContent = localFiles['index.html'];

    Object.keys(localFiles).forEach(filename => {
        if (filename.endsWith('.css')) {
            const cssContent = localFiles[filename];
            const linkRegex = new RegExp(`<link[^>]+href=["']${filename}["'][^>]*>`, 'gi');
            if (linkRegex.test(htmlContent)) {
                htmlContent = htmlContent.replace(linkRegex, `<style>${cssContent}</style>`);
            } else {
                htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
            }
        }
    });

    Object.keys(localFiles).forEach(filename => {
        if (filename.endsWith('.js')) {
            const jsContent = localFiles[filename];
            const scriptRegex = new RegExp(`<script[^>]+src=["']${filename}["'][^>]*>\\s*<\\/script>`, 'gi');
            if (scriptRegex.test(htmlContent)) {
                 htmlContent = htmlContent.replace(scriptRegex, `<script>${jsContent}</script>`);
            } else {
                 htmlContent = htmlContent.replace('</body>', `<script>${jsContent}</script></body>`);
            }
        }
    });

    return htmlContent;
  };

  // Re-run the bundle and update iframe whenever activeTab becomes 'preview' or localFiles change or reload requested
  useEffect(() => {
    if (activeTab === 'preview' && iframeRef.current && localFiles['index.html']) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        const bundled = getBundledHtml();
        doc.write(bundled); 
        doc.close();
      }
    }
  }, [localFiles, activeTab, refreshTrigger]);

  const handleCopyCode = () => {
    if (selectedFile && localFiles[selectedFile]) {
        navigator.clipboard.writeText(localFiles[selectedFile]);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleReload = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getWidthClass = () => {
    switch (previewDevice) {
      case 'mobile': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      case 'desktop': return 'w-full';
    }
  };

  const handleExportLiquid = () => {
     if (localFiles['index.html']) {
         const blob = new Blob([localFiles['index.html']], { type: 'text/plain' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = 'section.liquid';
         a.click();
         URL.revokeObjectURL(url);
     }
     setShowExportMenu(false);
  };
  
  const handleExportSingleHTML = () => {
      const bundled = getBundledHtml();
      if (bundled) {
         const blob = new Blob([bundled], { type: 'text/html' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = 'index.html';
         a.click();
         URL.revokeObjectURL(url);
      }
      setShowExportMenu(false);
  };

  const handleExportSeparated = async () => {
    try {
      const zip = new JSZip();
      Object.keys(localFiles).forEach(filename => {
          zip.file(filename, localFiles[filename]);
      });
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = "project.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to zip files", error);
    } finally {
      setShowExportMenu(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !onAnnotateSelect) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    
    onAnnotateSelect(Math.round(xPercent), Math.round(yPercent));
  };

  if (Object.keys(localFiles).length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-lovable-textDim bg-lovable-dark">
        <i className="fa-regular fa-eye text-3xl mb-3 opacity-20"></i>
        <p>Preview will appear here</p>
      </div>
    );
  }

  const containerClasses = isFullScreen 
    ? "fixed inset-0 z-50 flex flex-col h-screen w-screen bg-lovable-dark"
    : "flex flex-col h-full bg-lovable-dark overflow-hidden";

  const totalAssets = assets.media.length + assets.links.length + assets.content.length;

  return (
    <div className={containerClasses}>
      {/* Toolbar */}
      <div className="h-12 bg-lovable-panel border-b border-lovable-border flex items-center justify-between px-4 z-20 relative shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex border-b border-transparent">
                <button 
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-3 text-xs font-medium transition-colors border-b-2 ${activeTab === 'preview' ? 'text-lovable-accent border-lovable-accent' : 'text-lovable-textDim border-transparent hover:text-lovable-text'}`}
                >
                    Preview
                </button>
                <button 
                    onClick={() => setActiveTab('code')}
                    className={`px-3 py-3 text-xs font-medium transition-colors border-b-2 ${activeTab === 'code' ? 'text-lovable-accent border-lovable-accent' : 'text-lovable-textDim border-transparent hover:text-lovable-text'}`}
                >
                    Code
                </button>
                <button 
                    onClick={() => setActiveTab('assets')}
                    className={`px-3 py-3 text-xs font-medium transition-colors border-b-2 ${activeTab === 'assets' ? 'text-lovable-accent border-lovable-accent' : 'text-lovable-textDim border-transparent hover:text-lovable-text'}`}
                >
                    Assets <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#2a2b2d] text-[9px]">{totalAssets}</span>
                </button>
            </div>
            
            {/* Auto Fix Button */}
            {onAutoFix && activeTab === 'preview' && (
                <button 
                    onClick={onAutoFix}
                    disabled={isGenerating}
                    className="ml-2 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-500/30 hover:bg-purple-900/50 transition-colors flex items-center gap-2"
                >
                   <i className="fa-solid fa-wand-magic-sparkles"></i>
                   <span className="hidden sm:inline">Auto Fix</span>
                </button>
            )}
        </div>

        {activeTab === 'preview' && (
             <div className="flex bg-lovable-dark rounded border border-lovable-border p-0.5">
                <button 
                    onClick={() => onDeviceChange && onDeviceChange('desktop')}
                    className={`p-1.5 rounded transition-colors ${previewDevice === 'desktop' ? 'bg-lovable-hover text-lovable-text' : 'text-lovable-textDim hover:text-lovable-text'}`}
                    title="Desktop"
                >
                    <i className="fa-solid fa-desktop text-xs"></i>
                </button>
                <button 
                    onClick={() => onDeviceChange && onDeviceChange('tablet')}
                    className={`p-1.5 rounded transition-colors ${previewDevice === 'tablet' ? 'bg-lovable-hover text-lovable-text' : 'text-lovable-textDim hover:text-lovable-text'}`}
                    title="Tablet"
                >
                    <i className="fa-solid fa-tablet-screen-button text-xs"></i>
                </button>
                <button 
                    onClick={() => onDeviceChange && onDeviceChange('mobile')}
                    className={`p-1.5 rounded transition-colors ${previewDevice === 'mobile' ? 'bg-lovable-hover text-lovable-text' : 'text-lovable-textDim hover:text-lovable-text'}`}
                    title="Mobile"
                >
                    <i className="fa-solid fa-mobile-screen-button text-xs"></i>
                </button>
             </div>
        )}

        <div className="flex items-center space-x-2">
            {activeTab === 'preview' && (
                <>
                    <button 
                        onClick={handleReload}
                        className={`text-lovable-textDim hover:text-lovable-text hover:bg-lovable-hover p-1.5 rounded transition-colors`}
                        title="Reload Preview"
                    >
                        <i className="fa-solid fa-rotate-right"></i>
                    </button>
                    <button 
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={`text-lovable-textDim hover:text-lovable-text hover:bg-lovable-hover p-1.5 rounded transition-colors`}
                        title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    >
                        <i className={`fa-solid ${isFullScreen ? 'fa-compress' : 'fa-expand'}`}></i>
                    </button>
                </>
            )}

            <div className="relative">
                <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-lovable-textDim hover:text-lovable-text hover:bg-lovable-hover rounded transition-colors`}
                >
                    <i className="fa-solid fa-download"></i>
                    <span>Export</span>
                </button>
                
                {showExportMenu && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-lovable-panel border border-lovable-border rounded shadow-xl py-1 z-50">
                        <button onClick={handleExportSeparated} className="w-full text-left px-4 py-2 text-xs text-lovable-text hover:bg-lovable-hover transition-colors">
                            Download ZIP
                        </button>
                         <button onClick={handleExportSingleHTML} className="w-full text-left px-4 py-2 text-xs text-lovable-text hover:bg-lovable-hover transition-colors">
                            Export Single HTML
                        </button>
                        <button onClick={handleExportLiquid} className="w-full text-left px-4 py-2 text-xs text-lovable-text hover:bg-lovable-hover transition-colors">
                            Export Liquid
                        </button>
                    </div>
                )}
            </div>

             <button 
                onClick={handleCopyCode}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-lovable-textDim hover:text-lovable-text hover:bg-lovable-hover rounded transition-colors"
             >
                <i className={`fa-regular ${copyFeedback ? 'fa-check text-green-400' : 'fa-copy'}`}></i>
                <span>{copyFeedback ? 'Copied' : 'Copy'}</span>
             </button>
        </div>
      </div>

      <div className="flex-1 bg-[#1e1e20] relative overflow-hidden flex justify-center z-10 w-full" onClick={() => setShowExportMenu(false)}>
        {activeTab === 'preview' && (
             <div className={`h-full transition-all duration-300 shadow-xl ${getWidthClass()} bg-white my-0 mx-auto border-x border-lovable-border relative`}>
                <iframe
                    ref={iframeRef}
                    title="Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                />
                
                {/* Annotation Overlay */}
                {isAnnotating && (
                    <div 
                        ref={containerRef}
                        className="absolute inset-0 z-50 cursor-crosshair bg-black/5"
                        onClick={handleOverlayClick}
                    >
                         {/* Instruction Tooltip */}
                         <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-lovable-dark border border-lovable-border text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none animate-in fade-in slide-in-from-top-2">
                             Select an element to annotate
                         </div>
                    </div>
                )}
             </div>
        )}
        
        {activeTab === 'code' && (
            <div className="w-full h-full flex bg-lovable-dark">
                <div className="w-48 bg-lovable-panel border-r border-lovable-border flex flex-col shrink-0">
                    <div className="p-3 text-xs font-semibold text-lovable-textDim uppercase tracking-wider">
                        Files
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {Object.keys(localFiles).map(filename => (
                            <button
                                key={filename}
                                onClick={() => setSelectedFile(filename)}
                                className={`w-full text-left px-4 py-2 text-xs font-mono flex items-center gap-2 ${selectedFile === filename ? 'bg-lovable-hover text-lovable-text border-l-2 border-lovable-accent' : 'text-lovable-textDim hover:bg-lovable-hover hover:text-lovable-text border-l-2 border-transparent'}`}
                            >
                                <span className="truncate">{filename}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 h-full overflow-hidden bg-[#1e1e20] relative">
                    {selectedFile && localFiles[selectedFile] !== undefined ? (
                        <textarea
                            value={localFiles[selectedFile]}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            className="w-full h-full bg-[#1e1e20] text-gray-300 font-mono text-xs p-4 resize-none focus:outline-none custom-scrollbar leading-relaxed"
                            spellCheck={false}
                            autoCapitalize="off"
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-lovable-textDim">
                            Select a file
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'assets' && (
            <div className="w-full h-full bg-lovable-dark overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-8 pb-10">
                    
                    {totalAssets === 0 && (
                         <div className="flex flex-col items-center justify-center py-16 border border-dashed border-lovable-border rounded-lg bg-lovable-panel/30">
                            <i className="fa-regular fa-folder-open text-4xl text-lovable-textDim mb-4 opacity-50"></i>
                            <h3 className="text-lovable-text font-medium mb-1">No assets detected</h3>
                            <p className="text-lovable-textDim text-sm">We couldn't find any editable images, links, or text in your project.</p>
                        </div>
                    )}

                    {/* Media Section */}
                    {assets.media.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-lovable-text uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-regular fa-images"></i> Media ({assets.media.length})
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {assets.media.map((asset) => (
                                    <div key={asset.id} className="bg-lovable-panel border border-lovable-border rounded-lg p-4 flex gap-4 items-start group hover:border-lovable-border/80 transition-all">
                                        <div className="w-24 h-24 shrink-0 bg-black/20 rounded flex items-center justify-center overflow-hidden border border-lovable-border relative">
                                            {asset.type === 'image' ? (
                                                <img src={asset.currentValue} alt="preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                            ) : (
                                                <i className="fa-solid fa-video text-lovable-textDim text-2xl"></i>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <div>
                                                <label className="text-xs text-lovable-textDim font-medium block mb-1">Source URL</label>
                                                <div className="relative">
                                                     <input 
                                                        type="text" 
                                                        defaultValue={asset.currentValue}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== asset.currentValue) {
                                                                handleUpdateAsset(asset, e.target.value);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') e.currentTarget.blur();
                                                        }}
                                                        className="w-full bg-lovable-dark border border-lovable-border rounded px-3 py-2 text-sm text-lovable-text focus:border-lovable-accent focus:outline-none transition-colors font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-lovable-textDim bg-lovable-dark px-2 py-1 rounded">
                                                    {asset.type.toUpperCase()} • {asset.count} instance{asset.count > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Links Section */}
                    {assets.links.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-lovable-text uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-link"></i> Navigation ({assets.links.length})
                            </h2>
                            <div className="grid grid-cols-1 gap-3">
                                {assets.links.map((asset) => (
                                    <div key={asset.id} className="bg-lovable-panel border border-lovable-border rounded-lg px-4 py-3 flex items-center gap-4 hover:border-lovable-border/80 transition-all">
                                        <div className="w-8 h-8 rounded-full bg-lovable-dark flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-globe text-lovable-textDim text-xs"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <input 
                                                type="text" 
                                                defaultValue={asset.currentValue}
                                                onBlur={(e) => {
                                                    if (e.target.value !== asset.currentValue) {
                                                        handleUpdateAsset(asset, e.target.value);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                }}
                                                className="w-full bg-transparent border-none p-0 text-sm text-lovable-text focus:ring-0 focus:outline-none font-mono"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <a href={asset.currentValue} target="_blank" rel="noopener noreferrer" className="text-lovable-textDim hover:text-lovable-accent p-2">
                                            <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Content/Buttons Section */}
                    {assets.content.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-lovable-text uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-regular fa-pen-to-square"></i> Content & Buttons ({assets.content.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assets.content.map((asset) => (
                                    <div key={asset.id} className="bg-lovable-panel border border-lovable-border rounded-lg p-4 hover:border-lovable-border/80 transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] uppercase font-bold text-lovable-textDim bg-lovable-dark px-1.5 py-0.5 rounded">
                                                {asset.context || 'Text'}
                                            </span>
                                        </div>
                                        <input 
                                            type="text" 
                                            defaultValue={asset.currentValue}
                                            onBlur={(e) => {
                                                if (e.target.value !== asset.currentValue) {
                                                    handleUpdateAsset(asset, e.target.value);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') e.currentTarget.blur();
                                            }}
                                            className="w-full bg-lovable-dark border border-lovable-border rounded px-3 py-2 text-sm text-lovable-text focus:border-lovable-accent focus:outline-none transition-colors"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPane;