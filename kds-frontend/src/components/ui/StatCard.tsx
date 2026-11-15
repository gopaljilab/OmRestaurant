import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'blue' | 'amber' | 'emerald' | 'purple' | 'default';
  isLoading?: boolean;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  isLoading = false,
  highlight = false,
}) => {
  const variantGradients = {
    blue: 'border-l-4 border-l-sky-500 bg-gradient-to-br from-sky-950/30 to-[#131b2e]',
    amber: 'border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-950/30 to-[#131b2e]',
    emerald: 'border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-950/30 to-[#131b2e]',
    purple: 'border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-950/30 to-[#131b2e]',
    default: 'border-l-4 border-l-slate-600 bg-[#131b2e]',
  };

  const iconColors = {
    blue: 'text-sky-400 bg-sky-950/60 border border-sky-800/40',
    amber: 'text-amber-400 bg-amber-950/60 border border-amber-800/40',
    emerald: 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40',
    purple: 'text-purple-400 bg-purple-950/60 border border-purple-800/40',
    default: 'text-slate-400 bg-slate-800/60 border border-slate-700/40',
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 hover:translate-y-[-2px] ${
        variantGradients[variant]
      } ${highlight ? 'ring-1 ring-amber-500/50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded bg-slate-800 my-1" />
          ) : (
            <div className="text-3xl font-extrabold tracking-tight font-mono text-white">
              {value}
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconColors[variant]}`}>{icon}</div>
      </div>
    </Card>
  );
};
