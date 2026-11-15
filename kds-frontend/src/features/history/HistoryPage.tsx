import React, { useState, useEffect, useCallback } from 'react';
import {
  History as HistoryIcon,
  Search,
  RefreshCw,
  Printer,
  Calendar,
  X,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ordersApi } from '../../services/orders';
import type { Order, KitchenOrderTicket } from '../../types';

export const HistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedKOT, setSelectedKOT] = useState<KitchenOrderTicket | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const completed = await ordersApi.getOrders('completed');
      const cancelled = await ordersApi.getOrders('cancelled');
      setOrders([...completed, ...cancelled]);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleViewKOT = async (orderId: number) => {
    try {
      const kot = await ordersApi.getKOT(orderId);
      setSelectedKOT(kot);
    } catch (err) {
      alert(`Could not load KOT: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCompletedAmount = orders
    .filter((o) => o.status === 'completed')
    .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Order Fulfillment History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Archive of completed and cancelled kitchen tickets and shift totals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs">
            <span className="text-slate-400">Total Fulfilled: </span>
            <span className="font-mono font-bold text-amber-400">
              ₹{totalCompletedAmount.toFixed(2)}
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={fetchHistory}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-[#111726] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search completed orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Archive
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed Only
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              statusFilter === 'cancelled'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cancelled
          </button>
        </div>
      </Card>

      {/* Orders Table */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-800 bg-[#131b2e] p-12 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-slate-300">Loading historical tickets...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0f172a]/60 p-12 text-center">
          <HistoryIcon className="h-8 w-8 text-slate-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">No Historical Orders</h4>
          <p className="text-xs text-slate-400 mt-1">
            Completed and cancelled kitchen tickets will be archived here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-[#131b2e] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0e1524] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Order #</th>
                  <th className="px-5 py-3.5">Type & Table</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Completed Time</th>
                  <th className="px-5 py-3.5">Total Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-850/40">
                    <td className="px-5 py-3.5 font-mono font-bold text-amber-400">
                      {order.order_number}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={order.order_type} size="sm">
                          {order.order_type}
                        </Badge>
                        {order.table_number && <span>Table {order.table_number}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-200 font-medium">
                      {order.customer_name}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        <span>
                          {order.completed_at
                            ? new Date(order.completed_at).toLocaleString()
                            : new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-white">
                      ₹{Number(order.total_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge variant={order.status} size="sm" dot>
                        {order.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewKOT(order.id)}
                      >
                        <Printer className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for KOT archive view */}
      {selectedKOT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0f172a] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Archived KOT Ticket</h3>
                <p className="text-xs font-mono text-amber-400">
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

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-900 font-mono text-xs text-emerald-400 whitespace-pre overflow-x-auto max-h-96">
              {selectedKOT.formatted_ticket}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedKOT(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
