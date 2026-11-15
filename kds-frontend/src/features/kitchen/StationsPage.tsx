import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ordersApi } from '../../services/orders';
import { usePolling } from '../../hooks/usePolling';
import type { Order, OrderItem, OrderItemStatus } from '../../types';

interface StationItemView {
  orderId: number;
  orderNumber: string;
  orderType: string;
  tableNumber: string | null;
  createdAt: string;
  item: OrderItem;
}

export const StationsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrders = useCallback(async () => {
    try {
      const preparing = await ordersApi.getOrders('preparing');
      const incoming = await ordersApi.getOrders('incoming');
      setOrders([...incoming, ...preparing]);
    } catch (err) {
      console.error('Failed to fetch orders for stations', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  usePolling(fetchOrders, 4000);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateItem = async (
    orderId: number,
    itemId: number,
    newStatus: OrderItemStatus
  ) => {
    try {
      await ordersApi.updateOrderItemStatus(orderId, itemId, newStatus);
      await fetchOrders();
    } catch (err) {
      alert(`Failed to update item: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Compute active item counts per station
  const stationCounts: Record<string, number> = {
    all: 0,
    tandoor: 0,
    curry: 0,
    south_indian: 0,
    chinese: 0,
    beverage: 0,
  };

  orders.forEach((o) => {
    o.items?.forEach((itm) => {
      if (itm.item_status !== 'done') {
        const st = (itm.station || '').toLowerCase();
        stationCounts.all += itm.quantity || 1;
        if (stationCounts[st] !== undefined) {
          stationCounts[st] += itm.quantity || 1;
        }
      }
    });
  });

  const stations = [
    {
      id: 'all',
      name: 'All Stations',
      icon: <Layers className="h-4 w-4" />,
      count: stationCounts.all,
    },
    {
      id: 'tandoor',
      name: 'Tandoor & Chaap',
      icon: <Flame className="h-4 w-4 text-rose-400" />,
      count: stationCounts.tandoor,
    },
    {
      id: 'curry',
      name: 'Mughlai Curries',
      icon: <Soup className="h-4 w-4 text-amber-400" />,
      count: stationCounts.curry,
    },
    {
      id: 'south_indian',
      name: 'South Indian / Dosas',
      icon: <ChefHat className="h-4 w-4 text-emerald-400" />,
      count: stationCounts.south_indian,
    },
    {
      id: 'chinese',
      name: 'Indo-Chinese',
      icon: <Sparkles className="h-4 w-4 text-violet-400" />,
      count: stationCounts.chinese,
    },
    {
      id: 'beverage',
      name: 'Beverages & Shakes',
      icon: <Coffee className="h-4 w-4 text-sky-400" />,
      count: stationCounts.beverage,
    },
  ];

  // Flatten active orders into station line items
  const stationItems: StationItemView[] = [];
  orders.forEach((order) => {
    if (order.items) {
      order.items.forEach((item) => {
        const itemStation = (item.station || '').toLowerCase();
        if (
          (selectedStation === 'all' || itemStation === selectedStation) &&
          item.item_status !== 'done'
        ) {
          stationItems.push({
            orderId: order.id,
            orderNumber: order.order_number,
            orderType: order.order_type,
            tableNumber: order.table_number,
            createdAt: order.created_at,
            item,
          });
        }
      });
    }
  });

  const formatElapsed = (createdAt: string) => {
    try {
      const created = new Date(createdAt).getTime();
      const diffMinutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
      if (diffMinutes === 0) return { label: 'Just now', isUrgent: false };
      if (diffMinutes < 60) return { label: `${diffMinutes}m ago`, isUrgent: diffMinutes >= 15 };
      return { label: `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`, isUrgent: true };
    } catch {
      return { label: '—', isUrgent: false };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Station Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Kitchen Preparation Stations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dedicated workstation view optimized with large touchscreen targets for line cooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 font-mono text-slate-300">
            Queued Workload: <strong className="text-amber-400">{stationItems.length}</strong> items
          </div>

          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Station Selector Bar with Live Item Counters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {stations.map((st) => (
          <button
            key={st.id}
            onClick={() => setSelectedStation(st.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedStation === st.id
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/50 scale-[1.02]'
                : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            {st.icon}
            <span>{st.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-bold ${
                selectedStation === st.id
                  ? 'bg-slate-950 text-amber-300'
                  : st.count > 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {st.count}
            </span>
          </button>
        ))}
      </div>

      {/* Station Items Queue */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-800 bg-[#131b2e] p-12 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-slate-300">Loading station items...</p>
        </div>
      ) : stationItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0f172a]/60 p-16 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white">
            Station Queue is All Clear!
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            No active dishes are currently waiting on {selectedStation === 'all' ? 'any station' : selectedStation}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stationItems.map(({ orderId, orderNumber, orderType, tableNumber, createdAt, item }) => {
            const isCooking = item.item_status === 'cooking';
            const elapsed = formatElapsed(createdAt);

            return (
              <Card
                key={`${orderId}-${item.id}`}
                className={`p-4 flex flex-col justify-between border-2 rounded-2xl shadow-xl transition-all ${
                  isCooking
                    ? 'border-amber-500 bg-[#161c2c] shadow-amber-950/30'
                    : 'border-sky-500/60 bg-[#101726] shadow-sky-950/20'
                }`}
              >
                <div>
                  {/* Header: Order & Table */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-400 text-base">
                        {orderNumber}
                      </span>
                      <Badge variant={orderType as any} size="sm">
                        {tableNumber ? `T${tableNumber}` : orderType}
                      </Badge>
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                        elapsed.isUrgent
                          ? 'bg-rose-950 border border-rose-700 text-rose-300 animate-pulse'
                          : 'bg-slate-900 border border-slate-800 text-slate-400'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{elapsed.label}</span>
                    </div>
                  </div>

                  {/* Dish Item Details */}
                  <div className="py-3.5 space-y-2">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-3xl font-black text-amber-400 flex-shrink-0">
                        {item.quantity}x
                      </span>
                      <h4 className="text-base font-extrabold text-white leading-tight">
                        {item.dish_name}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                        {item.station}
                      </span>
                      {item.spice_level && (
                        <span className="text-[11px] font-semibold text-rose-300 bg-rose-950/50 border border-rose-800/50 px-2 py-0.5 rounded">
                          {item.spice_level}
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-amber-200 font-medium italic bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Large Accessible Touch Targets for Cooks */}
                <div className="pt-3 border-t border-slate-800/80">
                  {item.item_status === 'pending' ? (
                    <button
                      onClick={() => handleUpdateItem(orderId, item.id, 'cooking')}
                      className="w-full py-3 px-4 rounded-xl font-extrabold text-sm bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 shadow-md shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer transition-transform"
                    >
                      <Flame className="h-4 w-4" />
                      START COOKING
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateItem(orderId, item.id, 'done')}
                      className="w-full py-3 px-4 rounded-xl font-extrabold text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-md shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-transform"
                    >
                      <Check className="h-5 w-5 stroke-[3]" />
                      MARK DONE
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
