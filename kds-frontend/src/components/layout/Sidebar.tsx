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
  Server,
  Database,
} from 'lucide-react';

interface SidebarProps {
  incomingCount?: number;
  preparingCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  incomingCount = 0,
  preparingCount = 0,
  isOpen = false,
  onClose,
  isCollapsed = false,
}) => {
  const navItems = [
    {
      to: '/',
      label: 'Overview',
      shortLabel: 'Overview',
      shortcut: '1',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      to: '/orders',
      label: 'Kitchen Orders',
      shortLabel: 'Orders',
      shortcut: '2',
      icon: UtensilsCrossed,
      badge: incomingCount > 0 ? incomingCount : undefined,
      badgeColor: 'bg-sky-500 text-slate-950',
    },
    {
      to: '/stations',
      label: 'Kitchen Stations',
      shortLabel: 'Stations',
      shortcut: '3',
      icon: Flame,
      badge: preparingCount > 0 ? preparingCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      to: '/menu-availability',
      label: 'Menu 86 / Stock',
      shortLabel: 'Menu',
      shortcut: '4',
      icon: CheckCircle2,
      badge: undefined,
    },
    {
      to: '/history',
      label: 'Order History',
      shortLabel: 'History',
      shortcut: '5',
      icon: History,
      badge: undefined,
    },
    {
      to: '/settings',
      label: 'KDS Settings',
      shortLabel: 'Settings',
      shortcut: '6',
      icon: Settings,
      badge: undefined,
    },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex-shrink-0 border-r border-slate-800 bg-[#080c14] flex flex-col justify-between transition-all duration-200 select-none lg:relative lg:translate-x-0 ${
        isOpen ? 'translate-x-0 shadow-2xl w-60' : '-translate-x-full lg:translate-x-0'
      } ${isCollapsed ? 'lg:w-[68px]' : 'lg:w-60'}`}
    >
      {/* Top Navigation */}
      <div className="p-3 space-y-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {!isCollapsed && <span>Kitchen Stations</span>}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer ml-auto"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onClose?.()}
                title={isCollapsed ? `${item.label} (Press ${item.shortcut})` : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-xl transition-all duration-150 cursor-pointer ${
                    isCollapsed
                      ? 'justify-center p-3'
                      : 'justify-between px-3.5 py-2.5 text-xs font-semibold'
                  } ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/20'
                      : 'text-slate-400 hover:bg-slate-900/90 hover:text-white border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                            isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        {/* Dot badge on collapsed mode */}
                        {isCollapsed && item.badge !== undefined && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold font-mono text-slate-950 px-1">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {!isCollapsed && (
                        <span className="truncate tracking-wide">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5">
                        {item.badge !== undefined && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                              item.badgeColor || 'bg-slate-800 text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <span className="hidden xl:inline text-[10px] font-mono text-slate-600 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                          {item.shortcut}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / Telemetry & External Links */}
      <div className="p-3 border-t border-slate-800/80 space-y-2.5">
        {!isCollapsed ? (
          <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Server className="h-3 w-3 text-emerald-400" />
                Backend
              </span>
              <span className="font-mono text-emerald-400 font-bold text-[10px]">
                Spring Boot 4.1
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-amber-400" />
                Database
              </span>
              <span className="font-mono text-amber-300 font-bold text-[10px]">
                PostgreSQL 16
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1 text-slate-500">
            <span title="Spring Boot Backend Online" className="h-2 w-2 rounded-full bg-emerald-400" />
            <span title="PostgreSQL 16 Database" className="h-2 w-2 rounded-full bg-amber-400" />
          </div>
        )}

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Customer Website in New Tab"
          className={`flex items-center rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-900 transition-colors ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2 text-xs'
          }`}
        >
          {!isCollapsed && <span className="font-medium">Customer Web</span>}
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
        </a>
      </div>
    </aside>
  );
};
