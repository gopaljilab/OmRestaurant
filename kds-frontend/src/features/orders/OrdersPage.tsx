import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ordersApi } from '../../services/orders';
import { usePolling } from '../../hooks/usePolling';
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedKOT, setSelectedKOT] = useState<KitchenOrderTicket | null>(null);

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

  usePolling(() => fetchOrders(false), 5000);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // Open KOT modal if order ID is specified in query params
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId) {
      handleViewKOT(Number(selectedId));
    }
  }, [searchParams]);

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    try {
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.table_number && order.table_number.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const statusTabs = [
    { id: 'all', label: 'All Orders' },
    { id: 'incoming', label: 'Incoming' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
    { id: 'served', label: 'Served' },
    { id: 'completed', label: 'Completed' },
  ];

  const formatElapsed = (createdAt: string) => {
    try {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      const diffMinutes = Math.max(0, Math.floor((now - created) / 60000));
      if (diffMinutes === 0) return { label: 'Just now', isUrgent: false };
      if (diffMinutes === 1) return { label: '1m ago', isUrgent: false };
      if (diffMinutes < 60) return { label: `${diffMinutes}m ago`, isUrgent: diffMinutes >= 15 };
      return {
        label: `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`,
        isUrgent: true,
      };
    } catch {
      return { label: '—', isUrgent: false };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Kitchen Orders Board
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full ticket lifecycle, touchscreen item cooking advancement, and physical KOT thermal printing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search #order, customer, table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-64 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
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
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedStatus === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40 font-bold'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-800 bg-[#131b2e] p-12 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-slate-300">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0f172a]/60 p-16 text-center">
          <FileText className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white">No Orders Found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No orders match the current filter criteria ({selectedStatus}). Switch status tabs or create a new order.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const totalItemsCount = order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0;
            const doneItemsCount = order.items?.filter((i) => i.item_status === 'done').length || 0;
            const totalItemsKinds = order.items?.length || 0;
            const allItemsDone = totalItemsKinds > 0 && doneItemsCount === totalItemsKinds;
            const elapsed = formatElapsed(order.created_at);

            // Card border styling based on status
            const statusCardBorder =
              order.status === 'incoming'
                ? 'border-sky-500/70 shadow-sky-950/30'
                : order.status === 'preparing'
                ? 'border-amber-500/70 shadow-amber-950/30'
                : order.status === 'ready'
                ? 'border-emerald-500/70 shadow-emerald-950/30'
                : 'border-slate-800';

            return (
              <Card
                key={order.id}
                className={`flex flex-col justify-between border-2 bg-[#111726] transition-all shadow-xl hover:border-slate-600 ${statusCardBorder}`}
              >
                <div>
                  {/* Card Header: Order #, Status, Timer */}
                  <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-black text-amber-400 tracking-wide whitespace-nowrap">
                          {order.order_number}
                        </span>
                        <Badge variant={order.order_type} size="sm">
                          {order.order_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-200 font-semibold mt-1">
                        {order.customer_name}
                        {order.customer_phone ? ` • ${order.customer_phone}` : ''}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <Badge variant={order.status} size="sm" dot>
                        {order.status.toUpperCase()}
                      </Badge>
                      <div
                        className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          elapsed.isUrgent
                            ? 'bg-rose-950 border-rose-700 text-rose-300 animate-pulse'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        <span>{elapsed.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Table & Guests Bar */}
                  <div className="flex items-center justify-between text-xs py-2.5 px-1 border-b border-slate-800/60 text-slate-300">
                    <div>
                      {order.table_number ? (
                        <span className="font-bold text-white">
                          Table {order.table_number}{' '}
                          {order.zone && (
                            <span className="text-slate-400 font-normal">({order.zone})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400">Counter / Takeaway</span>
                      )}
                    </div>
                    <div className="font-mono text-slate-400">
                      Guests: <strong className="text-slate-200">{order.guest_count}</strong>
                    </div>
                  </div>

                  {/* Special Chef Instructions Note (if present) */}
                  {order.special_notes && (
                    <div className="my-3 rounded-xl bg-amber-950/40 border border-amber-600/50 p-2.5 text-xs text-amber-200 flex items-start gap-2 shadow-sm">
                      <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[10px] uppercase tracking-wider text-amber-400 block">
                          CHEF NOTE / DIETARY
                        </span>
                        <p className="italic font-medium">{order.special_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Order Line Items */}
                  <div className="py-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Line Items ({totalItemsCount} total)</span>
                      {order.status === 'preparing' && (
                        <span className="font-mono text-amber-400">
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
                            className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-all ${
                              isDone
                                ? 'bg-emerald-950/20 border-emerald-800/50 opacity-80'
                                : isCooking
                                ? 'bg-amber-950/30 border-amber-600/60 shadow-sm'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 flex-1 mr-2">
                              <span
                                className={`font-mono text-base font-black ${
                                  isDone ? 'text-emerald-400 line-through' : 'text-amber-400'
                                }`}
                              >
                                {item.quantity}x
                              </span>
                              <div>
                                <p
                                  className={`font-bold leading-tight ${
                                    isDone ? 'text-slate-400 line-through' : 'text-white'
                                  }`}
                                >
                                  {item.dish_name}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                                  <span className="uppercase font-semibold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                    {item.station}
                                  </span>
                                  {item.spice_level && (
                                    <span className="text-rose-400 font-medium">
                                      • {item.spice_level}
                                    </span>
                                  )}
                                  {item.notes && (
                                    <span className="italic text-amber-300/80">
                                      • {item.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Touchscreen-friendly advancement button */}
                            <button
                              onClick={() =>
                                handleItemStatusToggle(
                                  order.id,
                                  item.id,
                                  item.item_status
                                )
                              }
                              title="Tap to toggle cooking state (Pending -> Cooking -> Done)"
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-sm ${
                                isDone
                                  ? 'bg-emerald-600 text-white border border-emerald-500'
                                  : isCooking
                                  ? 'bg-amber-500 text-slate-950 border border-amber-400 animate-pulse'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  DONE
                                </>
                              ) : isCooking ? (
                                <>
                                  <ChefHat className="h-3.5 w-3.5" />
                                  COOKING
                                </>
                              ) : (
                                'PENDING'
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewKOT(order.id)}
                    className="text-xs"
                    title="View & Print KOT Thermal Receipt"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    KOT
                  </Button>

                  <div className="flex items-center gap-2">
                    {order.status === 'incoming' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                        className="font-bold"
                      >
                        Accept & Fire
                      </Button>
                    )}

                    {order.status === 'preparing' && (
                      <Button
                        size="sm"
                        variant={allItemsDone ? 'primary' : 'outline'}
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        disabled={!allItemsDone}
                        title={
                          allItemsDone
                            ? 'Mark order ready for pickup/delivery'
                            : 'All individual items must be marked DONE before marking ready'
                        }
                        className={allItemsDone ? 'font-bold' : ''}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        {allItemsDone ? 'Mark Ready' : `In Prep (${doneItemsCount}/${totalItemsKinds})`}
                      </Button>
                    )}

                    {order.status === 'ready' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatusChange(order.id, 'served')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-emerald-500"
                      >
                        Mark Served
                      </Button>
                    )}

                    {order.status === 'served' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleStatusChange(order.id, 'completed')}
                      >
                        Complete Order
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* KOT Modal Thermal Receipt Viewer */}
      {selectedKOT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0f172a] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Kitchen Order Ticket (KOT)
                </h3>
                <p className="text-xs font-mono text-amber-400 font-bold">
                  {selectedKOT.order_number}
                </p>
              </div>
              <button
                onClick={() => setSelectedKOT(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal Receipt ASCII Display */}
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-900 font-mono text-xs text-emerald-400 whitespace-pre overflow-x-auto max-h-96 shadow-inner selection:bg-emerald-500 selection:text-black">
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
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="h-4 w-4 mr-1" />
                Print Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
