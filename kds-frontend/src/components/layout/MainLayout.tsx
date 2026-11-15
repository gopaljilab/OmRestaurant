import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ordersApi } from '../../services/orders';
import { usePolling } from '../../hooks/usePolling';
import { kdsAudio } from '../../services/sound';
import { pingBackendHealth, type ApiHealthState } from '../../services/health';
import type { Order } from '../../types';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('om_kds_sidebar_collapsed') === 'true';
  });
  const [audioMuted, setAudioMuted] = useState<boolean>(() => kdsAudio.getMuted());
  const [visualFlash, setVisualFlash] = useState<boolean>(false);

  // Health monitor state
  const [healthState, setHealthState] = useState<ApiHealthState>({
    isOnline: true,
    latencyMs: 18,
    lastChecked: null,
    isChecking: false,
    error: null,
  });

  const prevIncomingCountRef = useRef<number>(-1);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('om_kds_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleToggleAudio = () => {
    const next = kdsAudio.toggleMuted();
    setAudioMuted(next);
    if (!next) {
      kdsAudio.playBumpFeedback();
    }
  };

  const triggerVisualAlert = () => {
    setVisualFlash(true);
    setTimeout(() => setVisualFlash(false), 900);
  };

  const fetchActiveOrders = useCallback(async () => {
    try {
      const start = performance.now();
      const orders = await ordersApi.getOrders();
      const latency = Math.round(performance.now() - start);

      const active = orders.filter(
        (o) => o.status !== 'completed' && o.status !== 'cancelled'
      );
      setActiveOrders(active);

      // Check if new incoming orders arrived (after first fetch)
      const incoming = active.filter((o) => o.status === 'incoming').length;
      if (prevIncomingCountRef.current !== -1 && incoming > prevIncomingCountRef.current) {
        kdsAudio.playNewOrderChime();
        triggerVisualAlert();
      }
      prevIncomingCountRef.current = incoming;

      setHealthState((prev) => ({
        ...prev,
        isOnline: true,
        latencyMs: latency,
        lastChecked: new Date(),
        error: null,
      }));
    } catch (err) {
      setHealthState((prev) => ({
        ...prev,
        isOnline: false,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : 'Backend unreachable',
      }));
    }
  }, []);

  // Poll orders every 4.5 seconds
  usePolling(fetchActiveOrders, 4500);

  // Periodic health ping
  const runHealthCheck = useCallback(async () => {
    const res = await pingBackendHealth();
    setHealthState((prev) => ({
      ...prev,
      isOnline: res.isOnline,
      latencyMs: res.latencyMs,
      lastChecked: new Date(),
      error: res.error || null,
    }));
  }, []);

  usePolling(runHealthCheck, 12000);

  // Global Keyboard Shortcuts (1-6 for navigation, M for audio mute, [ for sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '1') navigate('/');
      if (e.key === '2') navigate('/orders');
      if (e.key === '3') navigate('/stations');
      if (e.key === '4') navigate('/menu-availability');
      if (e.key === '5') navigate('/history');
      if (e.key === '6') navigate('/settings');
      if (e.key === 'm' || e.key === 'M') handleToggleAudio();
      if (e.key === '[' || e.key === ']') toggleSidebarCollapse();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const preparingCount = activeOrders.filter((o) => o.status === 'preparing').length;

  // Delayed orders (>15m)
  const delayedCount = activeOrders.filter((ord) => {
    try {
      const elapsedMins = (Date.now() - new Date(ord.created_at).getTime()) / 60000;
      return elapsedMins >= 15;
    } catch {
      return false;
    }
  }).length;

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 transition-colors ${
        visualFlash ? 'ring-4 ring-amber-500/70' : ''
      }`}
    >
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <Sidebar
        incomingCount={activeOrders.filter((o) => o.status === 'incoming').length}
        preparingCount={preparingCount}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          activeOrdersCount={activeOrders.length}
          preparingCount={preparingCount}
          delayedCount={delayedCount}
          audioMuted={audioMuted}
          onToggleAudio={handleToggleAudio}
          healthState={healthState}
          onReconnect={fetchActiveOrders}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-[#070b12]">
          <Outlet context={{ activeOrders, refreshOrders: fetchActiveOrders, healthState }} />
        </main>
      </div>
    </div>
  );
};
