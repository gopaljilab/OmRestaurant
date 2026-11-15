import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  Printer,
  CheckCircle,
  RefreshCw,
  Search,
  AlertCircle,
  FileText,
  X,
  ChefHat,
  Check,
  ArrowRight,
  Filter,
  Keyboard,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ordersApi } from '../../services/orders';
import { usePolling } from '../../hooks/usePolling';
import { kdsAudio } from '../../services/sound';
import type {
  Order,
  OrderStatus,
  OrderItemStatus,
  KitchenOrderTicket,
} from '../../types';

export const OrdersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedKOT, setSelectedKOT] = useState<KitchenOrderTicket | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);

  // Live timer tick every 1000ms for accurate elapsed time display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const data = await ordersApi.getOrders(
        selectedStatus === 'all' ? undefined : selectedStatus
      );
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, [selectedStatus]);

  usePolling(() => fetchOrders(false), 4000);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId) {
      handleViewKOT(Number(selectedId));
    }
  }, [searchParams]);

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    try {
      kdsAudio.playBumpFeedback();
      await ordersApi.updateOrderStatus(orderId, newStatus);
      await fetchOrders(false);
    } catch (err) {
      alert(`Status transition failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleItemStatusToggle = async (
    orderId: number,
    itemId: number,
    currentStatus: OrderItemStatus
  ) => {
    const nextStatus: OrderItemStatus =
      currentStatus === 'pending'
        ? 'cooking'
        : currentStatus === 'cooking'
        ? 'done'
        : 'cooking';

    try {
      kdsAudio.playBumpFeedback();
      await ordersApi.updateOrderItemStatus(orderId, itemId, nextStatus);
      await fetchOrders(false);
    } catch (err) {
      alert(`Item update failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleViewKOT = async (orderId: number) => {
    try {
      const kot = await ordersApi.getKOT(orderId);
      setSelectedKOT(kot);
    } catch (err) {
      alert(`Failed to load KOT: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Keyboard shortcut: Space or 'b' to bump the oldest active ticket
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        // Find oldest active ticket that can be bumped
        const actionable = orders.find(
          (o) => o.status === 'incoming' || o.status === 'preparing' || o.status === 'ready'
        );
        if (actionable) {
          if (actionable.status === 'incoming') {
            handleStatusChange(actionable.id, 'preparing');
          } else if (actionable.status === 'preparing') {
            // Check if all items are done
            const allDone = actionable.items?.every((i) => i.item_status === 'done');
            if (allDone) {
              handleStatusChange(actionable.id, 'ready');
            } else {
              // Mark all items done and advance
              actionable.items?.forEach((i) => {
                if (i.item_status !== 'done') {
                  ordersApi.updateOrderItemStatus(actionable.id, i.id, 'done');
                }
              });
              handleStatusChange(actionable.id, 'ready');
            }
          } else if (actionable.status === 'ready') {
            handleStatusChange(actionable.id, 'served');
          }
        }
      } else if (e.key === '?') {
        setShowKeyboardHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orders]);

  // Filter orders by status, station, order type, and search term
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Station filter
      if (selectedStation !== 'all') {
        const hasStation = order.items?.some(
          (i) => (i.station || '').toLowerCase() === selectedStation.toLowerCase()
        );
        if (!hasStation) return false;
      }

      // Order type filter
      if (selectedOrderType !== 'all') {
        if (order.order_type !== selectedOrderType) return false;
      }

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          order.order_number.toLowerCase().includes(q) ||
          order.customer_name.toLowerCase().includes(q) ||
          (order.table_number && order.table_number.toLowerCase().includes(q)) ||
          order.items?.some((i) => i.dish_name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [orders, selectedStation, selectedOrderType, searchTerm]);

  // Compute live elapsed time with seconds and delay flag
  const computeElapsedDetails = (createdAt: string) => {
    try {
      const created = new Date(createdAt).getTime();
      const diffMs = Math.max(0, currentTimeMs - created);
      const totalSecs = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;

      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const isDelayed = mins >= 15;

      return {
        formatted,
        minutes: mins,
        isDelayed,
      };
    } catch {
      return { formatted: '00:00', minutes: 0, isDelayed: false };
    }
  };

  const statusTabs = [
    { id: 'all', label: 'All Orders', count: orders.length },
    {
      id: 'incoming',
      label: 'Incoming',
      count: orders.filter((o) => o.status === 'incoming').length,
      color: 'text-sky-400',
    },
    {
      id: 'preparing',
      label: 'Cooking',
      count: orders.filter((o) => o.status === 'preparing').length,
      color: 'text-amber-400',
    },
    {
      id: 'ready',
      label: 'Ready',
      count: orders.filter((o) => o.status === 'ready').length,
      color: 'text-emerald-400',
    },
    {
      id: 'served',
      label: 'Served',
      count: orders.filter((o) => o.status === 'served').length,
      color: 'text-indigo-400',
    },
    {
      id: 'completed',
      label: 'Completed',
      count: orders.filter((o) => o.status === 'completed').length,
      color: 'text-slate-400',
    },
  ];

  const stationFilterPills = [
    { id: 'all', label: 'All Stations' },
    { id: 'tandoor', label: 'Tandoor' },
    { id: 'curry', label: 'Curry' },
    { id: 'south_indian', label: 'South Indian' },
    { id: 'chinese', label: 'Chinese' },
    { id: 'beverage', label: 'Beverage' },
  ];

  const orderTypeFilterPills = [
    { id: 'all', label: 'All Types' },
    { id: 'dine_in', label: 'Dine-In' },
    { id: 'takeaway', label: 'Takeaway' },
    { id: 'pre_order', label: 'Pre-Order' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Sticky Persistent Top Action & Filter Bar */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-5 lg:-mx-6 -mt-3 sm:-mt-5 lg:-mt-6 px-3 sm:px-5 lg:px-6 py-3 bg-[#080c14]/95 backdrop-blur-md border-b border-slate-800 space-y-3">
        {/* Top row: Title, Search, Shortcuts Hint & Manual Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Kitchen Orders Board</span>
              <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-400">
                {filteredOrders.length}
              </span>
            </h2>

            <button
              onClick={() => setShowKeyboardHelp((prev) => !prev)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="View KDS keyboard shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5 text-amber-400" />
              <span>SPACE / B to Bump</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search ticket #, table, dish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-inner font-mono"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrders(true)}
              isLoading={isRefreshing}
              className="h-9 px-3 rounded-xl border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Second row: Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStatus === tab.id
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Third row: Secondary Quick Filters (Station & Order Type) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" />
              Station:
            </span>
            {stationFilterPills.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStation(st.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedStation === st.id
                    ? 'bg-slate-800 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/60'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Type:</span>
            {orderTypeFilterPills.map((tp) => (
              <button
                key={tp.id}
                onClick={() => setSelectedOrderType(tp.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedOrderType === tp.id
                    ? 'bg-slate-800 text-amber-300 border border-amber-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/60'
                }`}
              >
                {tp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {showKeyboardHelp && (
        <div className="rounded-2xl border border-amber-500/40 bg-slate-900/95 p-4 text-xs text-slate-200 shadow-xl space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <strong className="text-amber-400 font-bold flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Kitchen Keyboard Shortcuts
            </strong>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px] pt-1">
            <div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                SPACE
              </span>{' '}
              / <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">B</span>: Quick Bump
            </div>
            <div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                1 - 6
              </span>: Switch Views
            </div>
            <div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                M
              </span>: Mute/Unmute Chime
            </div>
            <div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                [ or ]
              </span>: Toggle Rail
            </div>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-16 text-center shadow-xl">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">Syncing with kitchen queue...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0c1220] p-16 text-center space-y-3">
          <FileText className="h-12 w-12 text-slate-600 mx-auto" />
          <h4 className="text-lg font-bold text-white">No Tickets in this Queue</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No orders match the selected filters ({selectedStatus} / {selectedStation} / {selectedOrderType}).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStatus('all');
              setSelectedStation('all');
              setSelectedOrderType('all');
              setSearchTerm('');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredOrders.map((order) => {
            const totalItemsCount = order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0;
            const doneItemsCount = order.items?.filter((i) => i.item_status === 'done').length || 0;
            const totalItemsKinds = order.items?.length || 0;
            const allItemsDone = totalItemsKinds > 0 && doneItemsCount === totalItemsKinds;
            const elapsed = computeElapsedDetails(order.created_at);

            // Container visual styling: Solid high-contrast operational colors
            let cardBg = 'bg-[#0e1626] border-slate-800';
            let topAccent = 'border-t-4 border-t-slate-700';

            if (elapsed.isDelayed && order.status !== 'completed' && order.status !== 'cancelled') {
              cardBg = 'bg-[#260a0f] border-rose-500 shadow-[0_8px_30px_rgba(244,63,94,0.22)]';
              topAccent = 'border-t-4 border-t-rose-500';
            } else if (order.status === 'incoming') {
              cardBg = 'bg-[#0b1a2f] border-sky-500/70 shadow-[0_8px_30px_rgba(56,189,248,0.12)]';
              topAccent = 'border-t-4 border-t-sky-400';
            } else if (order.status === 'preparing') {
              cardBg = 'bg-[#1e1305] border-amber-500/70 shadow-[0_8px_30px_rgba(245,158,11,0.12)]';
              topAccent = 'border-t-4 border-t-amber-400';
            } else if (order.status === 'ready') {
              cardBg = 'bg-[#071f14] border-emerald-500/70 shadow-[0_8px_30px_rgba(16,185,129,0.14)]';
              topAccent = 'border-t-4 border-t-emerald-400';
            }

            return (
              <div
                key={order.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-150 ${cardBg} ${topAccent}`}
              >
                <div>
                  {/* Top Header: Order #, Type Badge, and Live Monospace Timer */}
                  <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xl font-black text-amber-300 tracking-wider">
                          {order.order_number}
                        </span>
                        <Badge variant={order.order_type} size="sm">
                          {order.order_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-300 font-bold mt-1">
                        {order.customer_name}
                        {order.customer_phone ? ` • ${order.customer_phone}` : ''}
                      </p>
                    </div>

                    {/* Timer & Pulsing Delay Badge */}
                    <div className="text-right space-y-1">
                      <div
                        className={`inline-flex items-center gap-1.5 font-mono font-black text-xs px-2.5 py-1 rounded-xl border ${
                          elapsed.isDelayed
                            ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                            : order.status === 'preparing'
                            ? 'bg-amber-950/80 border-amber-600/60 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>{elapsed.formatted}</span>
                      </div>

                      {elapsed.isDelayed && order.status !== 'completed' && (
                        <div className="flex items-center justify-end">
                          <span className="rounded bg-rose-500 text-slate-950 px-1.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider animate-bounce">
                            DELAYED &gt;15M
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Table & Guest Counts */}
                  <div className="flex items-center justify-between text-xs py-2 px-1 border-b border-slate-800/60 text-slate-300">
                    <div>
                      {order.table_number ? (
                        <span className="font-extrabold text-white text-sm">
                          TABLE {order.table_number}{' '}
                          {order.zone && (
                            <span className="text-xs text-slate-400 font-normal">({order.zone})</span>
                          )}
                        </span>
                      ) : (
                        <span className="font-bold text-amber-400 text-xs uppercase">Takeaway / Counter</span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-slate-400">
                      Covers: <strong className="text-white font-bold">{order.guest_count}</strong>
                    </div>
                  </div>

                  {/* Special Chef Instructions / Allergies - High Contrast Warning Box */}
                  {order.special_notes && (
                    <div className="my-2.5 rounded-xl bg-amber-500/15 border border-amber-500/50 p-2.5 text-xs text-amber-200 flex items-start gap-2 shadow-inner">
                      <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[10px] uppercase tracking-wider text-amber-400 block font-mono font-black">
                          SPECIAL INSTRUCTION / ALLERGY:
                        </strong>
                        <p className="font-bold italic mt-0.5">{order.special_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Line Items List */}
                  <div className="py-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Items ({totalItemsCount} total)</span>
                      {order.status === 'preparing' && (
                        <span className="font-mono text-amber-400 font-bold">
                          {doneItemsCount}/{totalItemsKinds} Cooked
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {order.items?.map((item) => {
                        const isDone = item.item_status === 'done';
                        const isCooking = item.item_status === 'cooking';

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                              isDone
                                ? 'bg-emerald-950/25 border-emerald-600/40 opacity-80'
                                : isCooking
                                ? 'bg-amber-950/40 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30'
                                : 'bg-slate-900/90 border-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 flex-1 mr-2 min-w-0">
                              {/* Quantity Badge in JetBrains Mono */}
                              <span
                                className={`font-mono text-base font-black px-2 py-0.5 rounded-lg flex-shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-900/40 text-emerald-300'
                                    : 'bg-amber-400 text-slate-950 shadow-sm'
                                }`}
                              >
                                {item.quantity}x
                              </span>

                              <div className="min-w-0">
                                <p
                                  className={`font-black text-sm leading-tight truncate ${
                                    isDone ? 'text-slate-400 line-through' : 'text-white'
                                  }`}
                                >
                                  {item.dish_name}
                                </p>

                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1">
                                  <span className="uppercase font-mono font-bold text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                    {item.station}
                                  </span>
                                  {item.spice_level && (
                                    <span className="font-bold text-rose-300 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-800/40">
                                      {item.spice_level}
                                    </span>
                                  )}
                                  {item.notes && (
                                    <span className="font-bold text-amber-200 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/50 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3 text-amber-400" />
                                      {item.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Touch target for line cooks */}
                            <button
                              onClick={() =>
                                handleItemStatusToggle(
                                  order.id,
                                  item.id,
                                  item.item_status
                                )
                              }
                              title="Advance item: Pending -> Cooking -> Done"
                              className={`h-10 px-3.5 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer flex-shrink-0 ${
                                isDone
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : isCooking
                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50 animate-pulse'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  DONE
                                </>
                              ) : isCooking ? (
                                <>
                                  <ChefHat className="h-4 w-4" />
                                  COOK
                                </>
                              ) : (
                                'HOLD'
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Touch Bump Bar */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewKOT(order.id)}
                    className="h-11 px-3 text-xs font-mono font-bold border-slate-700 bg-slate-900"
                    title="Print ASCII KOT Thermal Slip"
                  >
                    <Printer className="h-4 w-4 mr-1 text-slate-400" />
                    KOT
                  </Button>

                  {/* High-visibility Action Bump Button */}
                  <div className="flex-1">
                    {order.status === 'incoming' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                        className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-98 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <ChefHat className="h-4 w-4" />
                        <span>FIRE TO KITCHEN</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        disabled={!allItemsDone}
                        className={`w-full h-11 rounded-xl font-black text-xs sm:text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all ${
                          allItemsDone
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50 cursor-pointer active:scale-98'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-90'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>{allItemsDone ? 'MARK TICKET READY' : `COOKING (${doneItemsCount}/${totalItemsKinds})`}</span>
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'served')}
                        className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:scale-98 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Check className="h-4 w-4" />
                        <span>EXPEDITE &amp; SERVE</span>
                      </button>
                    )}

                    {order.status === 'served' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'completed')}
                        className="w-full h-11 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>COMPLETE TICKET</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ASCII KOT Thermal Receipt Viewer Modal */}
      {selectedKOT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0b121e] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">
                  Kitchen Order Ticket (KOT)
                </h3>
                <p className="text-xs font-mono text-amber-400 font-bold">
                  {selectedKOT.order_number}
                </p>
              </div>
              <button
                onClick={() => setSelectedKOT(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal Slip */}
            <div className="rounded-xl bg-black p-4 border border-slate-900 font-mono text-xs text-emerald-400 whitespace-pre overflow-x-auto max-h-96 shadow-inner selection:bg-emerald-500 selection:text-black leading-relaxed">
              {selectedKOT.formatted_ticket}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedKOT(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-1" />
                Print Slip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
