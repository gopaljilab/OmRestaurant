import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Flame,
  CheckCircle2,
  History,
  Settings,
  ExternalLink,
  X,
} from 'lucide-react';

interface SidebarProps {
  incomingCount?: number;
  preparingCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  incomingCount = 0,
  preparingCount = 0,
  isOpen = false,
  onClose,
}) => {
  const navItems = [
    {
      to: '/',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      to: '/orders',
      label: 'Kitchen Orders',
      icon: UtensilsCrossed,
      badge: incomingCount > 0 ? incomingCount : undefined,
      badgeColor: 'bg-sky-500 text-slate-950',
    },
    {
      to: '/stations',
      label: 'Kitchen Stations',
      icon: Flame,
      badge: preparingCount > 0 ? preparingCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      to: '/menu-availability',
      label: 'Menu Availability',
      icon: CheckCircle2,
      badge: undefined,
    },
    {
      to: '/history',
      label: 'Order History',
      icon: History,
      badge: undefined,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      badge: undefined,
    },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 border-r border-slate-800 bg-[#0b0f19] flex flex-col justify-between transition-transform duration-200 lg:relative lg:translate-x-0 ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Navigation Links */}
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Kitchen Navigation</span>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.badgeColor || 'bg-slate-700 text-white'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Backend Runtime</span>
            <span className="font-mono text-emerald-400 font-semibold">Spring Boot</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Database</span>
            <span className="font-mono text-amber-300">PostgreSQL 16</span>
          </div>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-amber-300 hover:bg-slate-800/40 transition-colors"
        >
          <span>Customer Website</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </aside>
  );
};
