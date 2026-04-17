import React from 'react';

interface InfoIconProps {
  title: string;
  className?: string;
  size?: number;
}

export const InfoIcon: React.FC<InfoIconProps> = ({ title, className = "", size = 12 }) => (
  <div className={`group relative inline-block cursor-help ml-1 ${className}`} title={title}>
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="text-slate-500 hover:text-indigo-400 transition-colors"
    >
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-slate-700 shadow-xl">
      {title}
    </div>
  </div>
);
