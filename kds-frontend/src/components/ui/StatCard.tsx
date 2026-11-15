import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'blue' | 'amber' | 'emerald' | 'purple' | 'rose' | 'default';
  isLoading?: boolean;
  highlight?: boolean;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  isLoading = false,
  highlight = false,
  badge,
}) => {
  const variantStyles = {
    blue: 'border-sky-500/40 bg-gradient-to-b from-[#0e213b] to-[#0c1626] shadow-[0_4px_20px_rgba(56,189,248,0.08)]',
    amber: 'border-amber-500/40 bg-gradient-to-b from-[#261705] to-[#140f06] shadow-[0_4px_20px_rgba(245,158,11,0.08)]',
    emerald: 'border-emerald-500/40 bg-gradient-to-b from-[#092416] to-[#06160e] shadow-[0_4px_20px_rgba(16,185,129,0.08)]',
    purple: 'border-purple-500/40 bg-gradient-to-b from-[#21113b] to-[#140b24] shadow-[0_4px_20px_rgba(168,85,247,0.08)]',
    rose: 'border-rose-500/60 bg-gradient-to-b from-[#2b0c12] to-[#18070a] shadow-[0_4px_25px_rgba(244,63,94,0.18)]',
    default: 'border-slate-800 bg-[#0f172a] shadow-lg shadow-black/40',
  };

  const iconColors = {
    blue: 'text-sky-300 bg-sky-950/80 border border-sky-500/40',
    amber: 'text-amber-300 bg-amber-950/80 border border-amber-500/40',
    emerald: 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/40',
    purple: 'text-purple-300 bg-purple-950/80 border border-purple-500/40',
    rose: 'text-rose-300 bg-rose-950/80 border border-rose-500/50',
    default: 'text-slate-400 bg-slate-800/80 border border-slate-700/50',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
        variantStyles[variant]
      } ${highlight ? 'ring-2 ring-amber-500/70 shadow-amber-950/50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {title}
            </p>
            {badge && (
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-300 border border-rose-500/30 animate-pulse">
                {badge}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="h-10 w-24 animate-pulse rounded bg-slate-800/80 my-1" />
          ) : (
            <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white">
              {value}
            </div>
          )}

          {subtitle && (
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{subtitle}</p>
          )}
        </div>

        <div className={`p-3 rounded-xl flex-shrink-0 ${iconColors[variant]}`}>{icon}</div>
      </div>
    </div>
  );
};
