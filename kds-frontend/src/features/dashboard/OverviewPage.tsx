import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronRight,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ordersApi } from '../../services/orders';
import { soundService } from '../../services/sound';
import { usePolling } from '../../hooks/usePolling';
import type { Order } from '../../types';
import { Link, useNavigate } from 'react-router-dom';

interface StationRow {
  id: string;
  name: string;
  lead: string;
  icon: React.ReactNode;
  accentColor: string;
  barColor: string;
  badgeClass: string;
  pendingCount: number;
  cookingCount: number;
  totalPortions: number;
  capacityPercent: number;
  statusLabel: 'IDLE' | 'OPTIMAL' | 'BUSY' | 'SURGE';
}

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'preparing' | 'ready' | 'delayed'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(soundService.isMuted());
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

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

  // Real-time polling every 5 seconds
  usePolling(() => fetchOrders(false), 5000);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  const toggleSound = () => {
    const nextState = !isMuted;
    soundService.setMuted(nextState);
    setIsMuted(nextState);
    if (!nextState) {
      soundService.playChime();
    }
  };

  // Derived KPI Metrics
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled'),
    [orders]
  );

  const incomingOrders = useMemo(
    () => orders.filter((o) => o.status === 'incoming'),
    [orders]
  );

  const preparingOrders = useMemo(
    () => orders.filter((o) => o.status === 'preparing'),
    [orders]
  );

  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === 'ready'),
    [orders]
  );

  // Compute total active portions
  const totalActiveItems = useMemo(() => {
    return activeOrders.reduce((sum, ord) => {
      return sum + (ord.items?.reduce((iSum, itm) => iSum + (itm.quantity || 1), 0) || 0);
    }, 0);
  }, [activeOrders]);

  // Delayed orders (> 15 minutes)
  const delayedOrders = useMemo(() => {
    return activeOrders.filter((ord) => {
      try {
        const elapsedMins = (Date.now() - new Date(ord.created_at).getTime()) / 60000;
        return elapsedMins >= 15;
      } catch {
        return false;
      }
    });
  }, [activeOrders]);

  // Compute Tabular Station Workload Matrix
  const stationRows: StationRow[] = useMemo(() => {
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
          const st = (item.station || '').toLowerCase();
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

    const definitions = [
      {
        id: 'tandoor',
        name: 'Tandoor & Chaap',
        lead: 'Line 1 • Clay Oven',
        icon: <Flame className="h-4 w-4 text-rose-400" />,
        accentColor: 'text-rose-400',
        barColor: 'bg-rose-500',
        badgeClass: 'border-rose-700/60 text-rose-300 bg-rose-950/40',
        capacityThreshold: 10,
      },
      {
        id: 'curry',
        name: 'Mughlai Curries',
        lead: 'Line 2 • Gravy Station',
        icon: <Soup className="h-4 w-4 text-amber-400" />,
        accentColor: 'text-amber-400',
        barColor: 'bg-amber-500',
        badgeClass: 'border-amber-700/60 text-amber-300 bg-amber-950/40',
        capacityThreshold: 12,
      },
      {
        id: 'south_indian',
        name: 'South Indian & Dosas',
        lead: 'Line 3 • Flat Griddle',
        icon: <ChefHat className="h-4 w-4 text-emerald-400" />,
        accentColor: 'text-emerald-400',
        barColor: 'bg-emerald-500',
        badgeClass: 'border-emerald-700/60 text-emerald-300 bg-emerald-950/40',
        capacityThreshold: 8,
      },
      {
        id: 'chinese',
        name: 'Indo-Chinese',
        lead: 'Line 4 • Wok Station',
        icon: <Sparkles className="h-4 w-4 text-violet-400" />,
        accentColor: 'text-violet-400',
        barColor: 'bg-violet-500',
        badgeClass: 'border-violet-700/60 text-violet-300 bg-violet-950/40',
        capacityThreshold: 8,
      },
      {
        id: 'beverage',
        name: 'Beverages & Desserts',
        lead: 'Bar & Dispense',
        icon: <Coffee className="h-4 w-4 text-sky-400" />,
        accentColor: 'text-sky-400',
        barColor: 'bg-sky-500',
        badgeClass: 'border-sky-700/60 text-sky-300 bg-sky-950/40',
        capacityThreshold: 6,
      },
    ];

    return definitions.map((def) => {
      const counts = stationMap[def.id] || { pending: 0, cooking: 0 };
      const total = counts.pending + counts.cooking;
      const capacityPercent = Math.min(100, Math.round((total / def.capacityThreshold) * 100));

      let statusLabel: StationRow['statusLabel'] = 'IDLE';
      if (total > 0 && total <= Math.floor(def.capacityThreshold * 0.5)) {
        statusLabel = 'OPTIMAL';
      } else if (total > Math.floor(def.capacityThreshold * 0.5) && total < def.capacityThreshold) {
        statusLabel = 'BUSY';
      } else if (total >= def.capacityThreshold) {
        statusLabel = 'SURGE';
      }

      return {
        ...def,
        pendingCount: counts.pending,
        cookingCount: counts.cooking,
        totalPortions: total,
        capacityPercent,
        statusLabel,
      };
    });
  }, [activeOrders]);

  const formatElapsed = (createdAt: string) => {
    try {
      const created = new Date(createdAt).getTime();
      const diffMinutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
      const isUrgent = diffMinutes >= 15;
      if (diffMinutes === 0) return { label: '<1m', full: 'Just now', isUrgent: false };
      if (diffMinutes < 60) return { label: `${diffMinutes}m`, full: `${diffMinutes}m ago`, isUrgent };
      const hours = Math.floor(diffMinutes / 60);
      return { label: `${hours}h ${diffMinutes % 60}m`, full: `${hours}h ${diffMinutes % 60}m ago`, isUrgent: true };
    } catch {
      return { label: '—', full: '—', isUrgent: false };
    }
  };

  const handleQuickStatusTransition = async (
    orderId: number,
    nextStatus: 'preparing' | 'ready' | 'served'
  ) => {
    setActionInProgress(orderId);
    try {
      soundService.playBumpSound();
      await ordersApi.updateOrderStatus(orderId, nextStatus);
      await fetchOrders(false);
    } catch (err) {
      alert(`Status update failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Filtered orders for the live pipeline table
  const displayedOrders = useMemo(() => {
    return activeOrders.filter((ord) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'delayed') {
        const elapsedMins = (Date.now() - new Date(ord.created_at).getTime()) / 60000;
        return elapsedMins >= 15;
      }
      return ord.status === activeTab;
    });
  }, [activeOrders, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Operations Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono">
              Operations Command
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time kitchen load balancing, station workload pipeline, and expedited order fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSound}
            className={`border-slate-800 text-xs font-mono ${
              isMuted ? 'text-slate-400 hover:text-slate-200' : 'text-amber-400 border-amber-500/40 bg-amber-500/10'
            }`}
            title="Toggle Kitchen Chimes"
          >
            {isMuted ? <VolumeX className="h-4 w-4 mr-1 text-slate-500" /> : <Volume2 className="h-4 w-4 mr-1 text-amber-400" />}
            {isMuted ? 'AUDIO MUTED' : 'CHIME ACTIVE'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            isLoading={isRefreshing}
            className="border-slate-800 text-xs font-mono"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </Button>

          <Link to="/orders">
            <Button variant="primary" size="sm" className="font-mono text-xs font-bold uppercase shadow-lg shadow-amber-950/40">
              Orders Board
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Urgent Operational Alerts */}
      {delayedOrders.length > 0 && (
        <div className="rounded-xl bg-[#260a0f] border-2 border-rose-600/80 p-4 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl shadow-rose-950/50 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40">
              <AlertCircle className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-sm font-black text-white font-mono uppercase tracking-wide">
                CRITICAL THRESHOLD ALERT: {delayedOrders.length} TICKET{delayedOrders.length === 1 ? '' : 'S'} EXCEEDED 15 MINS
              </p>
              <p className="text-xs text-rose-300 mt-0.5">
                Active tickets require immediate kitchen expediting to maintain restaurant SLA service quality.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('delayed')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-mono font-black uppercase whitespace-nowrap cursor-pointer transition-all shadow-md"
          >
            FILTER DELAYED TICKETS
          </button>
        </div>
      )}

      {incomingOrders.length > 0 && (
        <div className="rounded-xl bg-[#0b1a2f] border-2 border-sky-500/70 p-4 text-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl shadow-sky-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <BellRing className="h-6 w-6 stroke-[2.5] animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-black text-white font-mono uppercase tracking-wide">
                {incomingOrders.length} NEW ORDER{incomingOrders.length === 1 ? '' : 'S'} AWAITING KITCHEN ACCEPTANCE
              </p>
              <p className="text-xs text-sky-300 mt-0.5">
                New tickets from dining room or takeaway must be accepted and fired to physical prep lines.
              </p>
            </div>
          </div>
          <Link to="/orders?status=incoming">
            <button className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 text-xs font-mono font-black uppercase whitespace-nowrap cursor-pointer transition-all shadow-md">
              FIRE TICKETS NOW
            </button>
          </Link>
        </div>
      )}

      {/* Backend connection warning */}
      {error && (
        <div className="rounded-xl bg-rose-950/60 border border-rose-800 p-4 text-rose-200 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-rose-300 font-mono">BACKEND REST API UNREACHABLE</p>
            <p className="text-rose-200/90 mt-0.5">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchOrders(true)} className="text-xs font-mono">
            RETRY
          </Button>
        </div>
      )}

      {/* 1. Executive Operations KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="ACTIVE TICKETS"
          value={isLoading ? '-' : activeOrders.length}
          subtitle={isLoading ? 'Calculating...' : `${totalActiveItems} total portions`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="purple"
          isLoading={isLoading}
        />
        <StatCard
          title="INCOMING / NEW"
          value={isLoading ? '-' : incomingOrders.length}
          subtitle={incomingOrders.length > 0 ? 'Requires action' : 'All fired'}
          icon={<BellRing className="h-5 w-5" />}
          variant="blue"
          isLoading={isLoading}
          highlight={incomingOrders.length > 0}
        />
        <StatCard
          title="ON THE HEAT"
          value={isLoading ? '-' : preparingOrders.length}
          subtitle="Cooking across stations"
          icon={<Flame className="h-5 w-5" />}
          variant="amber"
          isLoading={isLoading}
        />
        <StatCard
          title="READY TO EXPEDITE"
          value={isLoading ? '-' : readyOrders.length}
          subtitle="Plated & waiting dispatch"
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="emerald"
          isLoading={isLoading}
        />
        <StatCard
          title="DELAYED (>15M)"
          value={isLoading ? '-' : delayedOrders.length}
          subtitle={delayedOrders.length > 0 ? 'Service alert' : 'On-schedule'}
          icon={<Clock className="h-5 w-5" />}
          variant="rose"
          isLoading={isLoading}
          highlight={delayedOrders.length > 0}
        />
      </div>

      {/* 2. Station Workload Operations Tabular Matrix */}
      <Card className="bg-[#0b101d] border-slate-800 overflow-hidden shadow-2xl p-0">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0e1424]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
                Station Workload & Capacity Matrix
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                5 PHYSICAL PREP LINES
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tabular tracking of queued dishes, active pans, and line capacity load.
            </p>
          </div>

          <Link
            to="/stations"
            className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 group self-start sm:self-auto"
          >
            OPEN STATION TOUCH KDS <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Dense Tabular Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-[#090d18] text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Station & Line</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Queued</th>
                <th className="px-4 py-3.5 text-right">Cooking</th>
                <th className="px-4 py-3.5 text-right">Total Portions</th>
                <th className="px-6 py-3.5 w-60">Capacity Utilization</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stationRows.map((st) => {
                const isOverloaded = st.statusLabel === 'SURGE';
                return (
                  <tr
                    key={st.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isOverloaded ? 'bg-rose-950/15' : ''
                    }`}
                  >
                    {/* Station Name & Info */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          {st.icon}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5 font-sans">
                            {st.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {st.lead}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          st.statusLabel === 'SURGE'
                            ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
                            : st.statusLabel === 'BUSY'
                            ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                            : st.statusLabel === 'OPTIMAL'
                            ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {st.statusLabel === 'SURGE' && <AlertTriangle className="h-3 w-3 text-rose-400" />}
                        {st.statusLabel}
                      </span>
                    </td>

                    {/* Queued (Pending) */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <span className={`text-base font-black ${st.pendingCount > 0 ? 'text-sky-300' : 'text-slate-500'}`}>
                        {st.pendingCount}
                      </span>
                    </td>

                    {/* Cooking */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <span className={`text-base font-black ${st.cookingCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {st.cookingCount}
                      </span>
                    </td>

                    {/* Total Portions */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <span className={`text-base font-black ${st.totalPortions > 0 ? 'text-white' : 'text-slate-600'}`}>
                        {st.totalPortions}
                      </span>
                    </td>

                    {/* Capacity Load Bar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-sans">Line Load</span>
                          <span className={`font-bold ${isOverloaded ? 'text-rose-400' : 'text-slate-300'}`}>
                            {st.capacityPercent}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${st.barColor} transition-all duration-300 ${
                              isOverloaded ? 'animate-pulse' : ''
                            }`}
                            style={{ width: `${Math.max(4, st.capacityPercent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/stations?station=${st.id}`)}
                        className="text-[11px] font-mono font-bold border-slate-800 hover:border-amber-500/50"
                      >
                        VIEW LINE
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. Live Expedite Pipeline & Orders Operations Table */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
              Live Expedite Pipeline
            </h3>
            <p className="text-xs text-slate-400">
              Active tickets sorted by dining channel, elapsed kitchen timers, and service readiness.
            </p>
          </div>

          {/* Pipeline Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-[#090d18] p-1 border border-slate-800 overflow-x-auto text-xs font-mono">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL ACTIVE ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'incoming'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              INCOMING ({incomingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('preparing')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'preparing'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ON HEAT ({preparingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ready'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              READY ({readyOrders.length})
            </button>
            {delayedOrders.length > 0 && (
              <button
                onClick={() => setActiveTab('delayed')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'delayed'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 animate-pulse'
                    : 'text-rose-400 hover:text-rose-300 border border-rose-900/60'
                }`}
              >
                DELAYED ({delayedOrders.length})
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-12 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-400 mx-auto mb-3" />
            <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              STREAMING KITCHEN DATA...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedOrders.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-[#0a0f1d] p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 mb-3">
              <ChefHat className="h-6 w-6 text-amber-400" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase font-mono">
              {activeTab === 'all' ? 'Kitchen Display All Clear' : `No Orders in '${activeTab.toUpperCase()}'`}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              All dishes have been cooked and dispatched. New incoming tickets will automatically appear here.
            </p>
            <div className="inline-flex gap-2.5">
              <Link to="/orders">
                <Button variant="secondary" size="sm" className="font-mono text-xs">
                  Full Orders Board
                </Button>
              </Link>
              <Link to="/menu-availability">
                <Button variant="outline" size="sm" className="font-mono text-xs">
                  Manage Menu 86's
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Expedite Pipeline Table */}
        {!isLoading && displayedOrders.length > 0 && (
          <Card className="bg-[#0b101d] border-slate-800 overflow-hidden shadow-2xl p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#090d18] text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="px-5 py-3.5">Ticket #</th>
                    <th className="px-4 py-3.5">Channel / Table</th>
                    <th className="px-5 py-3.5">Items & Modifiers</th>
                    <th className="px-4 py-3.5">Elapsed Timer</th>
                    <th className="px-4 py-3.5">Kitchen Status</th>
                    <th className="px-5 py-3.5 text-right">Expedite Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {displayedOrders.map((order) => {
                    const elapsed = formatElapsed(order.created_at);
                    const totalQty = order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0;
                    const isOrderDelayed = elapsed.isUrgent;
                    const isProcessing = actionInProgress === order.id;

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isOrderDelayed
                            ? 'bg-rose-950/20'
                            : order.status === 'incoming'
                            ? 'bg-sky-950/15'
                            : order.status === 'ready'
                            ? 'bg-emerald-950/15'
                            : ''
                        }`}
                      >
                        {/* Ticket Number & Customer */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-mono font-black text-amber-400 text-base">
                            {order.order_number}
                          </div>
                          <div className="text-xs text-slate-200 font-semibold mt-0.5">
                            {order.customer_name}
                          </div>
                        </td>

                        {/* Channel & Table */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <Badge variant={order.order_type} size="sm">
                              {order.order_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {order.table_number ? (
                              <div className="text-xs font-mono font-bold text-white">
                                TABLE {order.table_number}{' '}
                                {order.zone && (
                                  <span className="text-slate-400 font-normal">({order.zone})</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] font-mono text-slate-400">COUNTER / PICKUP</div>
                            )}
                          </div>
                        </td>

                        {/* Items & Modifiers */}
                        <td className="px-5 py-4 max-w-sm">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1.5">
                              {order.items?.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-xs text-slate-200 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded"
                                >
                                  <span className="font-mono font-bold text-amber-400">
                                    {item.quantity}x
                                  </span>
                                  <span>{item.dish_name}</span>
                                  {item.notes && (
                                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-700/60 px-1 rounded ml-1">
                                      {item.notes}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                              Total: <span className="text-white font-bold">{totalQty}</span> portion{totalQty === 1 ? '' : 's'}
                            </div>
                          </div>
                        </td>

                        {/* Elapsed Timer in JetBrains Mono */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                              isOrderDelayed
                                ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <Clock className={`h-3.5 w-3.5 ${isOrderDelayed ? 'text-rose-400' : 'text-slate-400'}`} />
                            <span>{elapsed.full}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={order.status} size="md" dot>
                            {order.status.toUpperCase()}
                          </Badge>
                        </td>

                        {/* Expedite Quick Action */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {order.status === 'incoming' && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleQuickStatusTransition(order.id, 'preparing')}
                                className="px-3.5 py-2 rounded-xl text-xs font-mono font-black uppercase bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 shadow-md cursor-pointer transition-transform flex items-center gap-1.5"
                              >
                                <Flame className="h-3.5 w-3.5" />
                                ACCEPT & FIRE
                              </button>
                            )}

                            {order.status === 'preparing' && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleQuickStatusTransition(order.id, 'ready')}
                                className="px-3.5 py-2 rounded-xl text-xs font-mono font-black uppercase bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 shadow-md cursor-pointer transition-transform flex items-center gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                                MARK READY
                              </button>
                            )}

                            {order.status === 'ready' && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleQuickStatusTransition(order.id, 'served')}
                                className="px-3.5 py-2 rounded-xl text-xs font-mono font-black uppercase bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-md cursor-pointer transition-transform flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                DISPATCH / SERVE
                              </button>
                            )}

                            <Link to={`/orders?selected=${order.id}`}>
                              <Button size="sm" variant="ghost" title="View Full Ticket">
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
          </Card>
        )}
      </div>
    </div>
  );
};
