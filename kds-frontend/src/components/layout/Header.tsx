import React, { useState, useEffect } from 'react';
import {
  Clock,
  Menu,
  Volume2,
  VolumeX,
  RefreshCw,
  Activity,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  Flame,
  CheckCircle,
} from 'lucide-react';
import type { ApiHealthState } from '../../services/health';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  activeOrdersCount?: number;
  preparingCount?: number;
  delayedCount?: number;
  audioMuted?: boolean;
  onToggleAudio?: () => void;
  healthState?: ApiHealthState;
  onReconnect?: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  activeOrdersCount = 0,
  preparingCount = 0,
  delayedCount = 0,
  audioMuted = false,
  onToggleAudio,
  healthState = { isOnline: true, latencyMs: 24, lastChecked: null, isChecking: false, error: null },
  onReconnect,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleReconnectClick = async () => {
    if (!onReconnect || isReconnecting) return;
    setIsReconnecting(true);
    try {
      await onReconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between select-none">
      {/* Left: Collapse toggle, Brand & Station */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        {/* Mobile toggle */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Desktop collapse toggle */}
        {onToggleSidebarCollapse && (
          <button
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            title={isSidebarCollapsed ? 'Expand sidebar (Maximize menu)' : 'Collapse sidebar (Maximize ticket board)'}
            aria-label="Toggle sidebar width"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-amber-400" />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-slate-400" />
            )}
          </button>
        )}

        {/* Logo Badge with live operational beacon */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-slate-950 font-black shadow-md shadow-amber-500/20 text-base sm:text-lg flex-shrink-0">
            OM
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
                OM KDS
              </h1>
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30 whitespace-nowrap">
                PASS v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              Kitchen Display & Operations
            </p>
          </div>
        </div>
      </div>

      {/* Center: Real-Time Shift Operations Summary */}
      <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-shrink-0">
        {/* Active Tickets Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs shadow-inner">
          <span className="text-slate-400 font-medium">Active:</span>
          <span className="font-mono font-bold text-sky-400 text-sm tracking-tight">
            {activeOrdersCount}
          </span>
        </div>

        {/* Cooking Items Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs shadow-inner">
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-slate-400 font-medium">Cooking:</span>
          <span className="font-mono font-bold text-amber-300 text-sm tracking-tight">
            {preparingCount}
          </span>
        </div>

        {/* Delayed Orders (>15m) High-Priority Alert Pill */}
        {delayedCount > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-xs text-rose-200 animate-pulse shadow-lg shadow-rose-950/50">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-bounce" />
            <span className="font-bold">DELAYED:</span>
            <span className="font-mono font-black text-rose-300 text-sm">{delayedCount}</span>
            <span className="text-[10px] uppercase font-semibold text-rose-400/90">&gt;15m</span>
          </div>
        ) : (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-400 font-medium">
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span>Pace Normal</span>
          </div>
        )}
      </div>

      {/* Right: Audio Toggle, Connection Health & Monospace Clock */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Audio / Chime Alert Toggle */}
        <button
          onClick={onToggleAudio}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            audioMuted
              ? 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-950/20 hover:bg-amber-900/40'
          }`}
          title={audioMuted ? 'Kitchen audio alert is muted (Click to unmute chime)' : 'Kitchen chime is active for new orders (Click to mute)'}
          aria-label="Toggle KDS audio alerts"
        >
          {audioMuted ? (
            <>
              <VolumeX className="h-4 w-4 text-slate-500" />
              <span className="hidden xl:inline text-[11px] font-medium">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 text-amber-400" />
              <span className="hidden xl:inline text-[11px] font-bold">Chime</span>
            </>
          )}
        </button>

        {/* API Health Monitor & Latency */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-colors ${
            healthState.isOnline
              ? 'bg-slate-900/90 border-slate-800 text-slate-300'
              : 'bg-rose-950/70 border-rose-600/60 text-rose-200 animate-pulse'
          }`}
        >
          <Activity
            className={`h-3.5 w-3.5 ${
              healthState.isOnline
                ? (healthState.latencyMs ?? 0) < 150
                  ? 'text-emerald-400'
                  : 'text-amber-400'
                : 'text-rose-400'
            }`}
          />
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                healthState.isOnline ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
              }`}
            />
            <span className="font-mono text-[11px] font-bold">
              {healthState.isOnline
                ? `${healthState.latencyMs ?? 20}ms`
                : 'OFFLINE'}
            </span>
          </div>

          {/* Smooth Reconnect Handler */}
          {(!healthState.isOnline || isReconnecting) && (
            <button
              onClick={handleReconnectClick}
              disabled={isReconnecting}
              className="ml-1 p-1 rounded-md bg-rose-900/80 hover:bg-rose-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              title="Manual Reconnect"
            >
              <RefreshCw className={`h-3 w-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Retry</span>
            </button>
          )}
        </div>

        {/* Monospace Operational Clock with Live Seconds */}
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-2.5 sm:px-3 py-1.5 text-xs text-slate-300 shadow-inner">
          <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <span className="hidden 2xl:inline text-slate-400 font-medium">{formattedDate}</span>
          <span className="hidden 2xl:inline text-slate-700">|</span>
          <span className="font-mono font-bold text-white tracking-wider text-xs sm:text-sm whitespace-nowrap">
            {formattedTime}
          </span>
        </div>
      </div>
    </header>
  );
};
