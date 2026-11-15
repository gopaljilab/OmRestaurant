import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ordersApi } from '../../services/orders';
import { usePolling } from '../../hooks/usePolling';
import type { Order } from '../../types';

export const MainLayout: React.FC = () => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const fetchActiveOrders = useCallback(async () => {
    try {
      const orders = await ordersApi.getOrders();
      // Keep active non-terminal orders
      const active = orders.filter(
        (o) => o.status !== 'completed' && o.status !== 'cancelled'
      );
      setActiveOrders(active);
    } catch {
      // Backend may be offline or unreachable during initial spin up; keep calm
    }
  }, []);

  // Poll every 8 seconds in background for header badge counts
  usePolling(fetchActiveOrders, 8000);

  const incomingCount = activeOrders.filter((o) => o.status === 'incoming').length;
  const preparingCount = activeOrders.filter((o) => o.status === 'preparing').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-100">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        incomingCount={incomingCount}
        preparingCount={preparingCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          activeOrdersCount={activeOrders.length}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{ activeOrders, refreshOrders: fetchActiveOrders }} />
        </main>
      </div>
    </div>
  );
};
