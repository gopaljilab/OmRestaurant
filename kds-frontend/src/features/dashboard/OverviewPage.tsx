import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ChefHat,
  BellRing,
  CheckCircle2,
  Flame,
  Soup,
  Coffee,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ordersApi } from '../../services/orders';
import { usePolling } from '../../hooks/usePolling';
import type { Order } from '../../types';
import { Link } from 'react-router-dom';

interface StationSummary {
  id: string;
  name: string;
  icon: React.ReactNode;
  borderAccent: string;
  barColor: string;
  badgeBg: string;
  pendingCount: number;
  cookingCount: number;
}

export const OverviewPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'preparing' | 'ready'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const data = await ordersApi.getOrders();
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load orders', err);
      setError(
        'Unable to connect to Kitchen REST API at http://localhost:8080. Ensure the Spring Boot backend is running.'
      );
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  // Poll every 5 seconds for real-time kitchen updates
  usePolling(() => fetchOrders(false), 5000);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // Derived KPI Metrics
  const activeOrders = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );
  const incomingOrders = orders.filter((o) => o.status === 'incoming');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  // Compute total active items across all active orders
  const totalActiveItems = activeOrders.reduce((sum, ord) => {
    return sum + (ord.items?.reduce((iSum, itm) => iSum + (itm.quantity || 1), 0) || 0);
  }, 0);

  // Check for any delayed orders (> 15 minutes)
  const delayedOrders = activeOrders.filter((ord) => {
    try {
      const elapsedMins = (Date.now() - new Date(ord.created_at).getTime()) / 60000;
      return elapsedMins >= 15;
    } catch {
      return false;
    }
  });

  // Compute station workload from active order items
  const computeStationSummaries = (): StationSummary[] => {
    const stationMap: Record<string, { pending: number; cooking: number }> = {
      tandoor: { pending: 0, cooking: 0 },
      curry: { pending: 0, cooking: 0 },
      south_indian: { pending: 0, cooking: 0 },
      chinese: { pending: 0, cooking: 0 },
      beverage: { pending: 0, cooking: 0 },
    };

    activeOrders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const st = item.station?.toLowerCase() || '';
          if (stationMap[st]) {
            if (item.item_status === 'pending') {
              stationMap[st].pending += item.quantity || 1;
            } else if (item.item_status === 'cooking') {
              stationMap[st].cooking += item.quantity || 1;
            }
          }
        });
      }
    });

    return [
      {
        id: 'tandoor',
        name: 'Tandoor & Chaap',
        icon: <Flame className="h-5 w-5 text-rose-400" />,
        borderAccent: 'border-l-rose-500',
        barColor: 'bg-rose-500',
        badgeBg: 'bg-rose-950/30 border-rose-800/40 text-rose-300',
        pendingCount: stationMap.tandoor.pending,
        cookingCount: stationMap.tandoor.cooking,
      },
      {
        id: 'curry',
        name: 'Mughlai Curries',
        icon: <Soup className="h-5 w-5 text-amber-400" />,
        borderAccent: 'border-l-amber-500',
        barColor: 'bg-amber-500',
        badgeBg: 'bg-amber-950/30 border-amber-800/40 text-amber-300',
        pendingCount: stationMap.curry.pending,
        cookingCount: stationMap.curry.cooking,
      },
      {
        id: 'south_indian',
        name: 'South Indian / Dosas',
        icon: <ChefHat className="h-5 w-5 text-emerald-400" />,
        borderAccent: 'border-l-emerald-500',
        barColor: 'bg-emerald-500',
        badgeBg: 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300',
        pendingCount: stationMap.south_indian.pending,
        cookingCount: stationMap.south_indian.cooking,
      },
      {
        id: 'chinese',
        name: 'Indo-Chinese',
        icon: <Sparkles className="h-5 w-5 text-violet-400" />,
        borderAccent: 'border-l-violet-500',
        barColor: 'bg-violet-500',
        badgeBg: 'bg-violet-950/30 border-violet-800/40 text-violet-300',
        pendingCount: stationMap.chinese.pending,
        cookingCount: stationMap.chinese.cooking,
      },
      {
        id: 'beverage',
        name: 'Beverages & Shakes',
        icon: <Coffee className="h-5 w-5 text-sky-400" />,
        borderAccent: 'border-l-sky-500',
        barColor: 'bg-sky-500',
        badgeBg: 'bg-sky-950/30 border-sky-800/40 text-sky-300',
        pendingCount: stationMap.beverage.pending,
        cookingCount: stationMap.beverage.cooking,
      },
    ];
  };

  const stations = computeStationSummaries();

  const formatElapsed = (createdAt: string) => {
    try {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      const diffMinutes = Math.max(0, Math.floor((now - created) / 60000));
      if (diffMinutes === 0) return { label: 'Just now', minutes: 0, isUrgent: false };
      if (diffMinutes === 1) return { label: '1m ago', minutes: 1, isUrgent: false };
      if (diffMinutes < 60) {
        return {
          label: `${diffMinutes}m ago`,
          minutes: diffMinutes,
          isUrgent: diffMinutes >= 15,
        };
      }
      const hours = Math.floor(diffMinutes / 60);
      return {
        label: `${hours}h ${diffMinutes % 60}m ago`,
        minutes: diffMinutes,
        isUrgent: true,
      };
    } catch {
      return { label: '—', minutes: 0, isUrgent: false };
    }
  };

  const handleQuickStatusTransition = async (
    orderId: number,
    nextStatus: 'preparing' | 'ready' | 'served'
  ) => {
    try {
      await ordersApi.updateOrderStatus(orderId, nextStatus);
      await fetchOrders(false);
    } catch (err) {
      alert(`Status update failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filtered orders for live table
  const displayedOrders = activeOrders.filter((ord) => {
    if (activeTab === 'all') return true;
    return ord.status === activeTab;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Operations Overview
            </h2>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time kitchen load, station pipeline, and active ticket operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            isLoading={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link to="/orders">
            <Button variant="primary" size="sm">
              Kitchen Orders Board
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Urgent Operational Notice Bar */}
      {incomingOrders.length > 0 && (
        <div className="rounded-xl bg-sky-950/60 border border-sky-600/50 p-4 text-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-sky-950/40 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {incomingOrders.length} New Order{incomingOrders.length === 1 ? '' : 's'} Awaiting Confirmation
              </p>
              <p className="text-xs text-sky-300/80">
                Incoming tickets need kitchen acceptance before cooking can begin.
              </p>
            </div>
          </div>
          <Link to="/orders?status=incoming">
            <Button variant="primary" size="sm" className="whitespace-nowrap">
              Review Incoming Tickets
            </Button>
          </Link>
        </div>
      )}

      {delayedOrders.length > 0 && (
        <div className="rounded-xl bg-rose-950/60 border border-rose-600/50 p-3.5 text-rose-200 flex items-center gap-3 shadow-lg">
          <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-300">
            Attention: {delayedOrders.length} active ticket{delayedOrders.length === 1 ? '' : 's'} has been open for over 15 minutes.
          </p>
        </div>
      )}

      {/* Connection Notice if backend is unreachable */}
      {error && (
        <div className="rounded-xl bg-rose-950/50 border border-rose-800/80 p-4 text-rose-200 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-rose-300">Connection Notice</p>
            <p className="text-rose-200/90 mt-0.5 text-xs">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchOrders(true)}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 1. KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Orders"
          value={isLoading ? '-' : activeOrders.length}
          subtitle={isLoading ? 'Loading...' : `${totalActiveItems} total line items in kitchen`}
          icon={<TrendingUp className="h-6 w-6" />}
          variant="purple"
          isLoading={isLoading}
        />
        <StatCard
          title="Incoming Orders"
          value={isLoading ? '-' : incomingOrders.length}
          subtitle={incomingOrders.length > 0 ? '⚠️ Action Required' : 'All confirmed'}
          icon={<BellRing className="h-6 w-6" />}
          variant="blue"
          isLoading={isLoading}
          highlight={incomingOrders.length > 0}
        />
        <StatCard
          title="Preparing (Cooking)"
          value={isLoading ? '-' : preparingOrders.length}
          subtitle="Actively fired across stations"
          icon={<Flame className="h-6 w-6" />}
          variant="amber"
          isLoading={isLoading}
        />
        <StatCard
          title="Ready for Dispatch"
          value={isLoading ? '-' : readyOrders.length}
          subtitle="Cooked & plated for service"
          icon={<CheckCircle2 className="h-6 w-6" />}
          variant="emerald"
          isLoading={isLoading}
        />
      </div>

      {/* 2. Kitchen Station Overview Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Station Workload & Capacity
            </h3>
            <p className="text-xs text-slate-400">
              Real-time item distribution across physical kitchen preparation stations
            </p>
          </div>
          <Link
            to="/stations"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group"
          >
            Station View <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stations.map((st) => {
            const totalItems = st.pendingCount + st.cookingCount;
            // Calculate capacity load percentage (arbitrary base of 8 items for visual indicator)
            const loadPercent = Math.min(100, Math.round((totalItems / 8) * 100));

            const workloadStatus =
              totalItems === 0
                ? { label: 'Idle', badgeClass: 'bg-slate-800 text-slate-400 border-slate-700' }
                : totalItems > 5
                ? { label: 'Heavy Load', badgeClass: 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse' }
                : { label: 'Active', badgeClass: 'bg-amber-950 text-amber-300 border-amber-700' };

            return (
              <Card
                key={st.id}
                className={`border-l-4 ${st.borderAccent} bg-[#111726] p-4 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      {st.icon}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${workloadStatus.badgeClass}`}
                    >
                      {workloadStatus.label}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug" title={st.name}>
                    {st.name}
                  </h4>

                  {/* Workload Capacity Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px] font-medium text-slate-400">
                      <span>Station Load</span>
                      <span className="font-mono text-slate-300">{totalItems} item{totalItems === 1 ? '' : 's'}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${st.barColor} transition-all duration-300`}
                        style={{ width: `${Math.max(6, loadPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-slate-900/80 p-1.5 border border-slate-800/60">
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                      Queued
                    </span>
                    <span className="font-mono text-sm font-black text-slate-200">
                      {st.pendingCount}
                    </span>
                  </div>
                  <div className="rounded-lg bg-amber-950/40 p-1.5 border border-amber-800/40">
                    <span className="block text-[10px] font-semibold text-amber-400 uppercase">
                      Cooking
                    </span>
                    <span className="font-mono text-sm font-black text-amber-300">
                      {st.cookingCount}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 3. Live Kitchen Orders Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Live Kitchen Orders Pipeline
            </h3>
            <p className="text-xs text-slate-400">
              Active orders currently processed through dining, takeaway, and pickup
            </p>
          </div>

          {/* Table Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 p-1 border border-slate-800 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Active ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'incoming'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Incoming ({incomingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('preparing')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'preparing'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cooking ({preparingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'ready'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ready ({readyOrders.length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="rounded-xl border border-slate-800 bg-[#131b2e] p-8 text-center">
            <div className="inline-block animate-spin text-amber-400 mb-3">
              <RefreshCw className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              Loading kitchen operations data...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedOrders.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-[#0f172a]/60 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 mb-4">
              <ChefHat className="h-7 w-7 text-amber-400" />
            </div>
            <h4 className="text-base font-bold text-white">
              {activeTab === 'all'
                ? 'No Active Kitchen Orders'
                : `No Orders in '${activeTab.toUpperCase()}' Status`}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              {activeTab === 'all'
                ? 'The kitchen display is currently clear. Incoming orders from customer dining, takeaway, or pre-orders will automatically appear here.'
                : `No active tickets match the selected status filter.`}
            </p>
            <div className="inline-flex gap-3">
              <Link to="/orders">
                <Button variant="secondary" size="sm">
                  View Full Orders Board
                </Button>
              </Link>
              <Link to="/menu-availability">
                <Button variant="outline" size="sm">
                  Manage Menu 86's
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Orders Table */}
        {!isLoading && displayedOrders.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#111726] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0c1220] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Order</th>
                    <th className="px-5 py-3.5">Type & Table</th>
                    <th className="px-5 py-3.5">Items Summary</th>
                    <th className="px-5 py-3.5">Elapsed Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {displayedOrders.map((order) => {
                    const itemCount = order.items?.reduce(
                      (acc, i) => acc + (i.quantity || 1),
                      0
                    ) || 0;
                    const itemsSummary = order.items
                      ?.slice(0, 3)
                      .map((i) => `${i.quantity}x ${i.dish_name}`)
                      .join(', ');
                    const remainingCount = (order.items?.length || 0) - 3;
                    const elapsed = formatElapsed(order.created_at);

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-850/40 transition-colors ${
                          order.status === 'incoming'
                            ? 'bg-sky-950/15'
                            : order.status === 'ready'
                            ? 'bg-emerald-950/15'
                            : ''
                        }`}
                      >
                        {/* Order Number & Customer */}
                        <td className="px-5 py-4">
                          <div className="font-mono font-black text-amber-400 text-base">
                            {order.order_number}
                          </div>
                          <div className="text-xs text-slate-200 font-medium mt-0.5">
                            {order.customer_name}
                          </div>
                        </td>

                        {/* Type & Table */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <Badge variant={order.order_type} size="sm">
                              {order.order_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {order.table_number ? (
                              <div className="text-xs font-mono font-bold text-slate-200">
                                Table {order.table_number}{' '}
                                {order.zone && (
                                  <span className="text-slate-400 font-normal">({order.zone})</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400">Counter / Takeaway</div>
                            )}
                          </div>
                        </td>

                        {/* Items Summary */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                            {itemsSummary || 'No items listed'}
                            {remainingCount > 0 && (
                              <span className="text-amber-400/90 font-bold">
                                {' '}
                                +{remainingCount} more
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 font-mono">
                            {itemCount} total item{itemCount === 1 ? '' : 's'}
                          </div>
                        </td>

                        {/* Elapsed Time */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${
                              elapsed.isUrgent
                                ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <Clock className={`h-3.5 w-3.5 ${elapsed.isUrgent ? 'text-rose-400' : 'text-slate-400'}`} />
                            <span>{elapsed.label}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <Badge variant={order.status} size="md" dot>
                            {order.status.toUpperCase()}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {order.status === 'incoming' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() =>
                                  handleQuickStatusTransition(order.id, 'preparing')
                                }
                              >
                                Accept & Cook
                              </Button>
                            )}

                            {order.status === 'preparing' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleQuickStatusTransition(order.id, 'ready')
                                }
                                title="Mark all items cooked and ready"
                              >
                                Mark Ready
                              </Button>
                            )}

                            {order.status === 'ready' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  handleQuickStatusTransition(order.id, 'served')
                                }
                                className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                              >
                                Dispatch / Served
                              </Button>
                            )}

                            <Link to={`/orders?selected=${order.id}`}>
                              <Button size="sm" variant="ghost" title="View Order Ticket">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
