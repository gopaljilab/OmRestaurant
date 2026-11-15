import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Utensils,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ToastContainer, type ToastMessage } from '../../components/ui/Toast';
import { menuApi } from '../../services/menu';
import type { MenuItemCatalog } from '../../types';

export const MenuAvailabilityPage: React.FC = () => {
  const [items, setItems] = useState<MenuItemCatalog[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await menuApi.getMenuItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load menu items', err);
      addToast('error', 'Failed to load catalog menu items.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggleAvailability = async (item: MenuItemCatalog) => {
    const nextAvailability = !item.is_available;
    setUpdatingSlug(item.dish_slug);

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) =>
        i.dish_slug === item.dish_slug
          ? { ...i, is_available: nextAvailability }
          : i
      )
    );

    try {
      await menuApi.updateAvailability({
        dish_slug: item.dish_slug,
        dish_name: item.dish_name,
        is_available: nextAvailability,
      });

      if (nextAvailability) {
        addToast('success', `${item.dish_name} is now AVAILABLE for orders`);
      } else {
        addToast('info', `86'd: ${item.dish_name} marked OUT OF STOCK`);
      }
    } catch (err) {
      // Revert on error
      setItems((prev) =>
        prev.map((i) =>
          i.dish_slug === item.dish_slug
            ? { ...i, is_available: !nextAvailability }
            : i
        )
      );
      addToast(
        'error',
        `Failed to update ${item.dish_name}: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setUpdatingSlug(null);
    }
  };

  // Derive unique categories and stations from items
  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))];
  const stations = [
    { id: 'all', label: 'All Stations' },
    { id: 'tandoor', label: 'Tandoor & Chaap' },
    { id: 'curry', label: 'Mughlai Curries' },
    { id: 'south_indian', label: 'South Indian' },
    { id: 'chinese', label: 'Indo-Chinese' },
    { id: 'beverage', label: 'Beverages' },
  ];

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStation('all');
    setAvailabilityFilter('all');
  };

  const isFiltered =
    searchTerm !== '' ||
    selectedCategory !== 'all' ||
    selectedStation !== 'all' ||
    availabilityFilter !== 'all';

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.dish_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dish_slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStation =
      selectedStation === 'all' || (item.station || '').toLowerCase() === selectedStation;
    const matchesAvailability =
      availabilityFilter === 'all' ||
      (availabilityFilter === 'available' && item.is_available) ||
      (availabilityFilter === 'unavailable' && !item.is_available);

    return matchesSearch && matchesCategory && matchesStation && matchesAvailability;
  });

  const availableCount = items.filter((i) => i.is_available).length;
  const unavailableCount = items.filter((i) => !i.is_available).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Menu Availability & 86 Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant stock controls across all 174 catalog dishes. 86'd items are immediately blocked from customer ordering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-mono">
            <span className="text-emerald-400 font-bold">{availableCount} Available</span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 font-bold">{unavailableCount} 86'd</span>
          </div>

          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <Card className="p-4 space-y-3.5 bg-[#111726] border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search 174 dishes by name or slug (e.g. Paneer Tikka, Naan, Biryani)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-sm"
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

          {/* Quick Availability Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-3 py-1 font-semibold rounded-lg transition-colors cursor-pointer ${
                availabilityFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-3 py-1 font-semibold rounded-lg transition-colors cursor-pointer ${
                availabilityFilter === 'available'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              onClick={() => setAvailabilityFilter('unavailable')}
              className={`px-3 py-1 font-semibold rounded-lg transition-colors cursor-pointer ${
                availabilityFilter === 'unavailable'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              86'd ({unavailableCount})
            </button>
          </div>
        </div>

        {/* Categories & Station Filter Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-amber-400" /> Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <span className="text-slate-400 font-semibold ml-2">Station:</span>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono text-[11px]">
              Showing {filteredItems.length} of {items.length} items
            </span>
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Dishes Table */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-800 bg-[#131b2e] p-12 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-slate-300">Loading catalog items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0f172a]/60 p-12 text-center">
          <Utensils className="h-8 w-8 text-slate-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">No Dishes Found</h4>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or active filter selections.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-[#111726] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0c1220] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Dish</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Preparation Station</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">86 / Enable Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredItems.map((item) => {
                  const isUpdating = updatingSlug === item.dish_slug;
                  const price = item.unit_price ?? item.price;

                  return (
                    <tr
                      key={item.dish_slug}
                      className={`hover:bg-slate-850/40 transition-colors ${
                        !item.is_available ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Dish Name & Slug */}
                      <td className="px-5 py-3.5">
                        <div className={`font-bold ${item.is_available ? 'text-white' : 'text-slate-400 line-through'}`}>
                          {item.dish_name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {item.dish_slug}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3.5 text-xs text-slate-300">
                        {item.category || 'General'}
                      </td>

                      {/* Kitchen Station */}
                      <td className="px-5 py-3.5">
                        <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-xs font-mono uppercase text-slate-300">
                          {item.station}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-amber-400">
                        ₹{price ? Number(price).toFixed(2) : '—'}
                      </td>

                      {/* Availability Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {item.is_available ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-950/80 border border-emerald-600/70 text-emerald-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            AVAILABLE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-950/90 border border-rose-600/80 text-rose-300 animate-pulse">
                            <AlertTriangle className="h-3 w-3 text-rose-400" />
                            86'D (OUT OF STOCK)
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant={item.is_available ? 'outline' : 'primary'}
                          onClick={() => handleToggleAvailability(item)}
                          isLoading={isUpdating}
                          className={`text-xs font-bold ${
                            item.is_available
                              ? 'hover:border-rose-500 hover:text-rose-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                          }`}
                        >
                          {item.is_available ? (
                            <>
                              <XCircle className="h-3.5 w-3.5 mr-1 text-rose-400" />
                              86 Dish
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Mark Available
                            </>
                          )}
                        </Button>
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
  );
};
