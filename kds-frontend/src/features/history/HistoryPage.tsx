import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History as HistoryIcon,
  Search,
  RefreshCw,
  Printer,
  Calendar,
  X,
  FileText,
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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedKOT, setSelectedKOT] = useState<KitchenOrderTicket | null>(null);

  const fetchHistory = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const completed = await ordersApi.getOrders('completed');
      const cancelled = await ordersApi.getOrders('cancelled');
      setOrders([...completed, ...cancelled]);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(false);
  }, [fetchHistory]);

  const handleViewKOT = async (orderId: number) => {
    try {
      const kot = await ordersApi.getKOT(orderId);
      setSelectedKOT(kot);
    } catch (err) {
      alert(`Could not load KOT: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const totalCompletedAmount = useMemo(() => {
    return orders
      .filter((o) => o.status === 'completed')
      .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
  }, [orders]);

  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono">
              Fulfillment History & KOT Archive
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono font-bold">
              {orders.length} ARCHIVED
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical audit logs of fulfilled and cancelled tickets with thermal KOT slip reprints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#090d18] border border-slate-800 px-3.5 py-1.5 text-xs font-mono">
            <span className="text-slate-400">Shift Fulfilled: </span>
            <span className="font-bold text-amber-400 text-sm">
              ₹{totalCompletedAmount.toFixed(2)}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHistory(true)}
            isLoading={isRefreshing}
            className="border-slate-800 text-xs font-mono"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[#0b101d] border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tickets by order number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            ALL ARCHIVE ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            COMPLETED ({completedCount})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
              statusFilter === 'cancelled'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            CANCELLED ({cancelledCount})
          </button>
        </div>
      </Card>

      {/* Orders Table */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-16 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            LOADING FULFILLMENT ARCHIVE...
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0a0f1d] p-12 text-center">
          <HistoryIcon className="h-8 w-8 text-slate-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white font-mono uppercase">No Historical Orders Found</h4>
          <p className="text-xs text-slate-400 mt-1">
            Completed and cancelled kitchen tickets will be archived here.
          </p>
        </div>
      ) : (
        <Card className="bg-[#0b101d] border-slate-800 overflow-hidden shadow-2xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#090d18] text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="px-5 py-3.5">Ticket #</th>
                  <th className="px-5 py-3.5">Channel / Table</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Fulfillment Timestamp</th>
                  <th className="px-5 py-3.5">Total Bill</th>
                  <th className="px-5 py-3.5">Final Status</th>
                  <th className="px-5 py-3.5 text-right">Thermal KOT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Ticket # */}
                    <td className="px-5 py-4 font-mono font-black text-amber-400 text-sm whitespace-nowrap">
                      {order.order_number}
                    </td>

                    {/* Channel & Table */}
                    <td className="px-5 py-4 text-xs text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Badge variant={order.order_type} size="sm">
                          {order.order_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {order.table_number && (
                          <span className="font-bold text-white">T{order.table_number}</span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4 text-xs text-slate-200 font-semibold whitespace-nowrap">
                      {order.customer_name}
                    </td>

                    {/* Timestamp */}
                    <td className="px-5 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>
                          {order.completed_at
                            ? new Date(order.completed_at).toLocaleString()
                            : new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-4 font-mono text-xs font-bold text-white whitespace-nowrap">
                      ₹{Number(order.total_amount).toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap font-mono">
                      <Badge variant={order.status} size="sm" dot>
                        {order.status.toUpperCase()}
                      </Badge>
                    </td>

                    {/* KOT View */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleViewKOT(order.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-mono text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
                        title="View Thermal KOT Receipt"
                      >
                        <Printer className="h-3.5 w-3.5 text-amber-400" />
                        REPRINT KOT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal for KOT archive view */}
      {selectedKOT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0c1220] border-2 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase">
                    Thermal KOT Slip Reprint
                  </h3>
                  <p className="text-xs font-mono text-amber-400">
                    TICKET {selectedKOT.order_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedKOT(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal POS Receipt styling */}
            <div className="rounded-xl bg-[#050914] p-4 border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre overflow-x-auto max-h-96 shadow-inner leading-relaxed">
              {selectedKOT.formatted_ticket}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] font-mono text-slate-500">
                80mm Thermal Receipt Spec
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  PRINT KOT
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedKOT(null)}
                  className="font-mono text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
