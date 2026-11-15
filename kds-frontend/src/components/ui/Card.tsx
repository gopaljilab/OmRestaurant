import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'surface' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#131b2e] border border-slate-800/80 shadow-lg shadow-black/40',
    surface: 'bg-[#0f172a] border border-slate-800/50',
    bordered: 'bg-transparent border border-slate-800',
  };

  return (
    <div
      className={`rounded-xl ${variantStyles[variant]} p-5 transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
