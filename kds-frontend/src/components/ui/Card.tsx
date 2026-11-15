import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'surface' | 'bordered' | 'incoming' | 'preparing' | 'delayed' | 'ready';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#0f172a] border border-slate-800 shadow-lg shadow-black/40',
    surface: 'bg-[#0b1120] border border-slate-800/80',
    bordered: 'bg-transparent border border-slate-800',
    incoming: 'bg-[#0a182e] border-2 border-sky-500/80 shadow-[0_4px_24px_rgba(56,189,248,0.14)]',
    preparing: 'bg-[#1e1306] border-2 border-amber-500/80 shadow-[0_4px_24px_rgba(245,158,11,0.14)]',
    delayed: 'bg-[#220a0d] border-2 border-rose-500 shadow-[0_4px_30px_rgba(244,63,94,0.25)] animate-pulse',
    ready: 'bg-[#061e13] border-2 border-emerald-500/80 shadow-[0_4px_24px_rgba(16,185,129,0.14)]',
  };

  return (
    <div
      className={`rounded-2xl ${variantStyles[variant]} p-5 transition-all duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
