import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Bell, User, Clock, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  activeOrdersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  activeOrdersCount = 0,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-[#0c1220]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black shadow-md shadow-amber-500/20 text-base sm:text-lg flex-shrink-0">
          OM
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              OM Restaurant
            </h1>
            <span className="hidden md:inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/20 whitespace-nowrap">
              KDS v2.0
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden xl:block">
            Kitchen Operations & Display System
          </p>
        </div>
      </div>

      {/* Center/Right Info: Clock, Connection, User */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {/* Live Date & Time */}
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-slate-900/90 border border-slate-800 px-2.5 sm:px-3 py-1.5 text-xs text-slate-300">
          <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <span className="hidden xl:inline text-slate-400">{formattedDate}</span>
          <span className="hidden xl:inline text-slate-600">|</span>
          <span className="font-mono font-semibold text-white tracking-wide whitespace-nowrap">
            {formattedTime}
          </span>
        </div>

        {/* Connection Status Indicator */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-700/50 text-rose-300 animate-pulse'
          }`}
          title={isOnline ? 'Connected to Kitchen Network' : 'Network Disconnected'}
        >
          {isOnline ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden lg:inline">ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden lg:inline">OFFLINE</span>
            </>
          )}
        </div>

        {/* Active Orders Quick Alert */}
        {activeOrdersCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-amber-950/50 border border-amber-600/40 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <Bell className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
            <span>{activeOrdersCount} Active</span>
          </div>
        )}

        {/* User / Station Manager Profile */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-3 sm:pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-tight">Head Chef</p>
            <p className="text-[10px] text-slate-400">Main Kitchen</p>
          </div>
        </div>
      </div>
    </header>
  );
};
