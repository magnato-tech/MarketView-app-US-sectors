import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  icon,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-slate-950/20 dark:bg-slate-950/20 light:bg-slate-50 rounded-xl border border-dashed border-slate-800 dark:border-slate-800 light:border-slate-200 ${className}`}>
      {icon && <div className="mb-4 text-slate-600">{icon}</div>}
      <h4 className="text-sm font-bold text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-500 light:text-slate-400 max-w-[240px] leading-relaxed">
        {description}
      </p>
    </div>
  );
};
