import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Flame,
  Soup,
  Coffee,
  ChefHat,
  Sparkles,
  Clock,
  CheckCircle,
  RefreshCw,
  Layers,
  Check,
  AlertTriangle,
  Volume2,
  VolumeX,
  Keyboard,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ordersApi } from '../../services/orders';
import { soundService } from '../../services/sound';
import { usePolling } from '../../hooks/usePolling';
import type { Order, OrderItem, OrderItemStatus } from '../../types';

interface StationItemView {
  orderId: number;
  orderNumber: string;
  orderType: string;
  tableNumber: string | null;
  zone?: string | null;
  createdAt: string;
  item: OrderItem;
}

export const StationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStation = searchParams.get('station') || 'all';

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>(initialStation);
  const [viewMode, setViewMode] = useState<'split' | 'all'>('split');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundService.isMuted());
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  // Sync state if URL query param changes
  useEffect(() => {
    const stationParam = searchParams.get('station');
    if (stationParam && stationParam !== selectedStation) {
      setSelectedStation(stationParam);
    }
  }, [searchParams, selectedStation]);

  const handleSelectStation = (stationId: string) => {
    setSelectedStation(stationId);
    if (stationId === 'all') {
      searchParams.delete('station');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ station: stationId });
    }
  };

  const fetchOrders = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const preparing = await ordersApi.getOrders('preparing');
      const incoming = await ordersApi.getOrders('incoming');
      setOrders([...incoming, ...preparing]);
    } catch (err) {
      console.error('Failed to fetch orders for stations', err);
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  usePolling(() => fetchOrders(false), 4000);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  const handleUpdateItem = async (
    orderId: number,
    itemId: number,
    newStatus: OrderItemStatus
  ) => {
    setActionInProgress(itemId);
    try {
      soundService.playBumpSound();
      await ordersApi.updateOrderItemStatus(orderId, itemId, newStatus);
      await fetchOrders(false);
    } catch (err) {
      alert(`Failed to update item: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleSound = () => {
    const next = !isMuted;
    soundService.setMuted(next);
    setIsMuted(next);
    if (!next) soundService.playChime();
  };

  // Compute active item counts per station
  const stationCounts: Record<string, { pending: number; cooking: number; total: number }> = {
    all: { pending: 0, cooking: 0, total: 0 },
    tandoor: { pending: 0, cooking: 0, total: 0 },
    curry: { pending: 0, cooking: 0, total: 0 },
    south_indian: { pending: 0, cooking: 0, total: 0 },
    chinese: { pending: 0, cooking: 0, total: 0 },
    beverage: { pending: 0, cooking: 0, total: 0 },
  };

  orders.forEach((o) => {
    o.items?.forEach((itm) => {
      if (itm.item_status !== 'done') {
        const st = (itm.station || '').toLowerCase();
        const qty = itm.quantity || 1;
        stationCounts.all.total += qty;
        if (itm.item_status === 'pending') stationCounts.all.pending += qty;
        if (itm.item_status === 'cooking') stationCounts.all.cooking += qty;

        if (stationCounts[st] !== undefined) {
          stationCounts[st].total += qty;
          if (itm.item_status === 'pending') stationCounts[st].pending += qty;
          if (itm.item_status === 'cooking') stationCounts[st].cooking += qty;
        }
      }
    });
  });

  const stations = [
    {
      id: 'all',
      name: 'All Stations',
      icon: <Layers className="h-4 w-4" />,
      counts: stationCounts.all,
    },
    {
      id: 'tandoor',
      name: 'Tandoor & Chaap',
      icon: <Flame className="h-4 w-4 text-rose-400" />,
      counts: stationCounts.tandoor,
    },
    {
      id: 'curry',
      name: 'Mughlai Curries',
      icon: <Soup className="h-4 w-4 text-amber-400" />,
      counts: stationCounts.curry,
    },
    {
      id: 'south_indian',
      name: 'South Indian & Dosas',
      icon: <ChefHat className="h-4 w-4 text-emerald-400" />,
      counts: stationCounts.south_indian,
    },
    {
      id: 'chinese',
      name: 'Indo-Chinese',
      icon: <Sparkles className="h-4 w-4 text-violet-400" />,
      counts: stationCounts.chinese,
    },
    {
      id: 'beverage',
      name: 'Beverages & Shakes',
      icon: <Coffee className="h-4 w-4 text-sky-400" />,
      counts: stationCounts.beverage,
    },
  ];

  // Flatten active orders into station line items
  const stationItems: StationItemView[] = useMemo(() => {
    const list: StationItemView[] = [];
    orders.forEach((order) => {
      if (order.items) {
        order.items.forEach((item) => {
          const itemStation = (item.station || '').toLowerCase();
          if (
            (selectedStation === 'all' || itemStation === selectedStation) &&
            item.item_status !== 'done'
          ) {
            list.push({
              orderId: order.id,
              orderNumber: order.order_number,
              orderType: order.order_type,
              tableNumber: order.table_number,
              zone: order.zone,
              createdAt: order.created_at,
              item,
            });
          }
        });
      }
    });
    return list;
  }, [orders, selectedStation]);

  const pendingItems = useMemo(
    () => stationItems.filter((i) => i.item.item_status === 'pending'),
    [stationItems]
  );

  const cookingItems = useMemo(
    () => stationItems.filter((i) => i.item.item_status === 'cooking'),
    [stationItems]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === ' ' || e.key.toLowerCase() === 'b') {
        e.preventDefault();
        // Bump the oldest active cooking dish to done, or fire the oldest pending dish
        if (cookingItems.length > 0) {
          const target = cookingItems[0];
          handleUpdateItem(target.orderId, target.item.id, 'done');
        } else if (pendingItems.length > 0) {
          const target = pendingItems[0];
          handleUpdateItem(target.orderId, target.item.id, 'cooking');
        }
      } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (stations[index]) {
          handleSelectStation(stations[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cookingItems, pendingItems, stations]);

  const formatElapsed = (createdAt: string) => {
    try {
      const created = new Date(createdAt).getTime();
      const diffMinutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
      const isUrgent = diffMinutes >= 12;
      if (diffMinutes === 0) return { label: '<1m', isUrgent: false };
      if (diffMinutes < 60) return { label: `${diffMinutes}m`, isUrgent };
      return { label: `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`, isUrgent: true };
    } catch {
      return { label: '—', isUrgent: false };
    }
  };

  const renderItemCard = (viewItem: StationItemView) => {
    const { orderId, orderNumber, orderType, tableNumber, zone, createdAt, item } = viewItem;
    const isCooking = item.item_status === 'cooking';
    const elapsed = formatElapsed(createdAt);
    const isProcessing = actionInProgress === item.id;

    return (
      <div
        key={`${orderId}-${item.id}`}
        className={`rounded-2xl border-2 p-4 flex flex-col justify-between shadow-xl transition-all ${
          isCooking
            ? 'bg-[#181105] border-amber-500/90 shadow-amber-950/40'
            : 'bg-[#0a1526] border-sky-500/70 shadow-sky-950/30'
        } ${elapsed.isUrgent ? 'ring-2 ring-rose-500/80' : ''}`}
      >
        <div>
          {/* Card Top: Order Number, Channel / Table, Elapsed Timer */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-amber-400 text-lg tracking-tight">
                {orderNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black uppercase bg-slate-900 border border-slate-700 text-white">
                {tableNumber ? `T${tableNumber}${zone ? ` (${zone})` : ''}` : orderType.replace('_', ' ')}
              </span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                elapsed.isUrgent
                  ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <Clock className={`h-3.5 w-3.5 ${elapsed.isUrgent ? 'text-rose-400' : 'text-slate-400'}`} />
              <span>{elapsed.label}</span>
            </div>
          </div>

          {/* Dish Portion & Name */}
          <div className="py-3.5 space-y-2.5">
            <div className="flex items-start gap-3">
              {/* Massive High-Contrast Portion Badge for 6-8 ft Visibility */}
              <div
                className={`px-3 py-1 rounded-xl font-mono text-2xl font-black flex items-center justify-center border-2 flex-shrink-0 ${
                  isCooking
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/50'
                    : 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-950/50'
                }`}
              >
                {item.quantity}x
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-base sm:text-lg font-black text-white leading-tight break-words">
                  {item.dish_name}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    {item.station}
                  </span>
                  {item.spice_level && (
                    <span className="text-[10px] font-mono font-extrabold uppercase text-rose-300 bg-rose-950/80 border border-rose-700/80 px-2 py-0.5 rounded">
                      SPICE: {item.spice_level}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* High-Contrast Modifier / Allergy Instructions */}
            {item.notes && (
              <div className="rounded-xl bg-amber-950/80 border-2 border-amber-500/80 p-2.5 text-amber-200">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-400 uppercase">
                  <AlertTriangle className="h-3.5 w-3.5" /> SPECIAL MODIFIER:
                </div>
                <p className="text-xs font-black mt-0.5 text-amber-100 italic">
                  "{item.notes}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Huge Touch Action Targets for Line Cooks (>= 50px Height) */}
        <div className="pt-3 border-t border-slate-800/80">
          {!isCooking ? (
            <button
              disabled={isProcessing}
              onClick={() => handleUpdateItem(orderId, item.id, 'cooking')}
              className="w-full h-13 rounded-xl font-mono text-sm font-black uppercase bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 cursor-pointer transition-transform"
            >
              <Flame className="h-5 w-5" />
              START COOKING
            </button>
          ) : (
            <button
              disabled={isProcessing}
              onClick={() => handleUpdateItem(orderId, item.id, 'done')}
              className="w-full h-13 rounded-xl font-mono text-sm font-black uppercase bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-transform"
            >
              <Check className="h-6 w-6 stroke-[3]" />
              BUMP / MARK DONE
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Bar: Title, Station Workload, Keyboard Tip, Audio Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono">
              Preparation Line KDS
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              TOUCH / GLOVE MODE
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated workstation view optimized with high-contrast font metrics and oversized 50px touch targets.
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
            title="Toggle Acoustic Chimes"
          >
            {isMuted ? <VolumeX className="h-4 w-4 mr-1 text-slate-500" /> : <Volume2 className="h-4 w-4 mr-1 text-amber-400" />}
            {isMuted ? 'MUTED' : 'CHIME ON'}
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
        </div>
      </div>

      {/* Station Selector Bar with Hotkey Hints (1-6) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {stations.map((st, idx) => {
          const isSelected = selectedStation === st.id;
          return (
            <button
              key={st.id}
              onClick={() => handleSelectStation(st.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/50 scale-[1.02]'
                  : 'bg-[#0c1220] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {st.icon}
              <span className="font-sans font-extrabold">{st.name}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-mono font-black ${
                  isSelected
                    ? 'bg-slate-950 text-amber-300'
                    : st.counts.total > 0
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {st.counts.total}
              </span>
              <kbd className="hidden md:inline-block text-[10px] opacity-60 ml-0.5 font-mono">
                [{idx + 1}]
              </kbd>
            </button>
          );
        })}
      </div>

      {/* View Mode Toggle & Fast Keyboard Help */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0a0f1d] p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Keyboard className="h-4 w-4 text-amber-400" />
          <span>Kitchen Hotkeys:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px]">
            Space
          </kbd>
          <span>or</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px]">
            B
          </kbd>
          <span className="text-slate-300 font-semibold">to quick-bump top dish</span>
          <span className="text-slate-600">|</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px]">
            1-6
          </kbd>
          <span>for stations</span>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
              viewMode === 'split'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            SPLIT PREP LANES
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
              viewMode === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            UNIFIED GRID ({stationItems.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-16 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            SYNCHRONIZING STATION PIPELINE...
          </p>
        </div>
      ) : stationItems.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-[#0a0f1d] p-16 text-center shadow-xl">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h4 className="text-base font-black text-white font-mono uppercase tracking-wide">
            Station Queue All Clear!
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            No active dishes are currently queued or cooking for{' '}
            <strong className="text-amber-400">
              {stations.find((s) => s.id === selectedStation)?.name || selectedStation}
            </strong>
            .
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSelectStation('all')}
            className="font-mono text-xs"
          >
            View All Stations
          </Button>
        </div>
      ) : viewMode === 'split' ? (
        /* Split Two-Lane Prep Kanban Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lane 1: PENDING QUEUE (AWAITING COOKING) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#0b172a] border border-sky-500/50 p-3.5 rounded-xl shadow-md">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-400 animate-pulse" />
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  QUEUED / WAITING TO FIRE
                </h3>
              </div>
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950">
                {pendingItems.length} DISH{pendingItems.length === 1 ? '' : 'ES'}
              </span>
            </div>

            {pendingItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-[#090e1c] p-10 text-center text-slate-500 text-xs font-mono">
                No dishes currently waiting to be started.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                {pendingItems.map(renderItemCard)}
              </div>
            )}
          </div>

          {/* Lane 2: ACTIVE ON THE LINE / COOKING */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#1f1406] border border-amber-500/60 p-3.5 rounded-xl shadow-md">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400 animate-bounce" />
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  ON THE LINE / COOKING
                </h3>
              </div>
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                {cookingItems.length} DISH{cookingItems.length === 1 ? '' : 'ES'}
              </span>
            </div>

            {cookingItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-[#090e1c] p-10 text-center text-slate-500 text-xs font-mono">
                No dishes currently on the heat. Tap 'START COOKING' on queued dishes to begin.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                {cookingItems.map(renderItemCard)}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Unified Grid Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stationItems.map(renderItemCard)}
        </div>
      )}
    </div>
  );
};
