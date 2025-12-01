import React from 'react';

interface SidebarProps {
    currentModelName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentModelName = "Gemini 2.5 Flash" }) => {
  return (
    <div className="w-16 md:w-64 flex-shrink-0 bg-lovable-panel border-r border-lovable-border flex flex-col h-full transition-all duration-300">
      {/* Navigation - Just Lists now */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 mt-2">
        <div>
          <p className="px-3 text-xs font-medium text-lovable-textDim uppercase tracking-wider mb-2 hidden md:block">Library</p>
          <ul className="space-y-0.5">
            <li>
              <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-lovable-text hover:bg-lovable-hover rounded-md transition-colors">
                <i className="fa-regular fa-folder text-lovable-textDim mr-0 md:mr-3 w-4 text-center"></i>
                <span className="hidden md:block truncate">Dashboard V1</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-lovable-text hover:bg-lovable-hover rounded-md transition-colors">
                <i className="fa-regular fa-folder text-lovable-textDim mr-0 md:mr-3 w-4 text-center"></i>
                <span className="hidden md:block truncate">Landing Page</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <p className="px-3 text-xs font-medium text-lovable-textDim uppercase tracking-wider mb-2 hidden md:block">Recent</p>
           <ul className="space-y-0.5">
            <li>
              <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-lovable-text hover:bg-lovable-hover rounded-md transition-colors">
                <i className="fa-regular fa-clock text-lovable-textDim mr-0 md:mr-3 w-4 text-center"></i>
                <span className="hidden md:block truncate">Login Screen</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-lovable-border">
        <div className="flex items-center w-full justify-between px-1">
            <div className="flex items-center min-w-0 gap-3">
                <div className="h-7 w-7 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    D
                </div>
                <div className="hidden md:block overflow-hidden">
                    <p className="text-xs font-medium text-lovable-textDim truncate">{currentModelName}</p>
                </div>
            </div>
            <button className="text-lovable-textDim hover:text-white">
                <i className="fa-solid fa-gear"></i>
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;