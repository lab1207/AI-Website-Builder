import React, { useEffect, useState } from 'react';
import { RunSettings } from '../types';
import { getAvailableModels } from '../services/geminiService';

interface RunSettingsProps {
  settings: RunSettings;
  setSettings: (settings: RunSettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

const RunSettingsPanel: React.FC<RunSettingsProps> = ({ settings, setSettings, isOpen, onClose }) => {
  const [models, setModels] = useState<{value: string, label: string}[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const available = await getAvailableModels();
            setModels(available);
        } catch (err) {
            console.error("Failed to fetch models", err);
            // Fallback default
            setModels([
                { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
                { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' }
            ]);
        } finally {
            setLoadingModels(false);
        }
    };
    fetchModels();
  }, []);

  if (!isOpen) return null;

  const handleChange = (key: keyof RunSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="w-80 h-full bg-lovable-panel border-l border-lovable-border flex flex-col overflow-y-auto z-30 transition-all duration-300">
      <div className="h-14 flex items-center justify-between px-4 border-b border-lovable-border shrink-0">
        <h3 className="text-sm font-medium text-lovable-text">Run settings</h3>
        <button onClick={onClose} className="text-lovable-textDim hover:text-lovable-text">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-lovable-text">Model</label>
          <div className="relative">
            {loadingModels ? (
                <div className="w-full h-8 bg-lovable-dark border border-lovable-border rounded animate-pulse"></div>
            ) : (
                <>
                    <select 
                    value={settings.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full bg-lovable-dark border border-lovable-border rounded px-3 py-2 text-xs text-lovable-text appearance-none focus:border-lovable-accent focus:outline-none"
                    >
                        {models.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-2.5 pointer-events-none text-lovable-textDim">
                    <i className="fa-solid fa-chevron-down text-[10px]"></i>
                    </div>
                </>
            )}
          </div>
        </div>

        {/* Temperature */}
        <div className="space-y-2">
           <div className="flex justify-between">
              <label className="text-xs font-medium text-lovable-text">Temperature</label>
              <input 
                type="number" 
                value={settings.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                step="0.1" min="0" max="2"
                className="w-12 bg-transparent text-right text-xs text-lovable-textDim focus:text-lovable-text focus:outline-none"
              />
           </div>
           <input 
              type="range" 
              min="0" max="2" step="0.1" 
              value={settings.temperature} 
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full h-1 bg-lovable-border rounded-lg appearance-none cursor-pointer accent-lovable-accent"
           />
           <p className="text-[10px] text-lovable-textDim">Controls randomness. Higher values mean more creativity.</p>
        </div>

        {/* Top K */}
        <div className="space-y-2">
           <div className="flex justify-between">
              <label className="text-xs font-medium text-lovable-text">Top K</label>
              <input 
                type="number" 
                value={settings.topK || 40}
                onChange={(e) => handleChange('topK', parseInt(e.target.value))}
                className="w-12 bg-transparent text-right text-xs text-lovable-textDim focus:text-lovable-text focus:outline-none"
              />
           </div>
           <input 
              type="range" 
              min="1" max="100" step="1" 
              value={settings.topK || 40} 
              onChange={(e) => handleChange('topK', parseInt(e.target.value))}
              className="w-full h-1 bg-lovable-border rounded-lg appearance-none cursor-pointer accent-lovable-accent"
           />
        </div>

         {/* Top P */}
         <div className="space-y-2">
           <div className="flex justify-between">
              <label className="text-xs font-medium text-lovable-text">Top P</label>
              <input 
                type="number" 
                value={settings.topP || 0.95}
                onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
                step="0.01" min="0" max="1"
                className="w-12 bg-transparent text-right text-xs text-lovable-textDim focus:text-lovable-text focus:outline-none"
              />
           </div>
           <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={settings.topP || 0.95} 
              onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
              className="w-full h-1 bg-lovable-border rounded-lg appearance-none cursor-pointer accent-lovable-accent"
           />
        </div>

        {/* Max Output Tokens */}
        <div className="space-y-2">
             <div className="flex justify-between">
              <label className="text-xs font-medium text-lovable-text">Max Output Tokens</label>
               <input 
                type="number" 
                value={settings.maxOutputTokens || 8192}
                onChange={(e) => handleChange('maxOutputTokens', parseInt(e.target.value))}
                className="w-16 bg-transparent text-right text-xs text-lovable-textDim focus:text-lovable-text focus:outline-none"
              />
           </div>
            <input 
              type="range" 
              min="1" max="32768" step="100" 
              value={settings.maxOutputTokens || 8192} 
              onChange={(e) => handleChange('maxOutputTokens', parseInt(e.target.value))}
              className="w-full h-1 bg-lovable-border rounded-lg appearance-none cursor-pointer accent-lovable-accent"
           />
        </div>

        {/* Safety Settings Placeholder */}
        <div className="space-y-3 pt-4 border-t border-lovable-border">
            <h4 className="text-xs font-medium text-lovable-text">Safety settings</h4>
            {['Hate speech', 'Sexually explicit', 'Harassment', 'Dangerous content'].map(cat => (
                 <div key={cat} className="flex justify-between items-center">
                    <span className="text-xs text-lovable-textDim">{cat}</span>
                    <span className="text-[10px] text-lovable-text px-2 py-1 bg-lovable-dark rounded border border-lovable-border">Block some</span>
                 </div>
            ))}
        </div>

      </div>
    </div>
  );
};

export default RunSettingsPanel;
