import React, { useState } from 'react';
import {
  Volume2,
  Printer,
  Server,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoPrintKOT, setAutoPrintKOT] = useState<boolean>(false);
  const [ticketWidth, setTicketWidth] = useState<'80mm' | '58mm'>('80mm');
  const [pollingInterval, setPollingInterval] = useState<number>(5);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          KDS Settings & Station Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure display density, acoustic alerts, thermal printing, and backend polling.
        </p>
      </div>

      {savedNotice && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-800 p-3 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          Settings saved to local station profile successfully.
        </div>
      )}

      {/* Acoustic / Audio Alert Settings */}
      <Card className="p-5 space-y-4 bg-[#111726]">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Audio & Kitchen Alerts</h3>
            <p className="text-xs text-slate-400">
              Chimes and notification sounds for incoming orders and delayed items
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Play alert sound for new incoming orders</span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="h-4 w-4 rounded accent-amber-500"
            />
          </label>
        </div>
      </Card>

      {/* Printer Configuration */}
      <Card className="p-5 space-y-4 bg-[#111726]">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Thermal KOT Printer</h3>
            <p className="text-xs text-slate-400">
              Kitchen ticket layout and hardware integration
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-slate-300 block">Automatic KOT printing on accept</span>
              <span className="text-[11px] text-slate-500">
                Instantly trigger print dialog when kitchen confirms an order
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoPrintKOT}
              onChange={(e) => setAutoPrintKOT(e.target.checked)}
              className="h-4 w-4 rounded accent-amber-500"
            />
          </label>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-slate-300">Ticket Paper Width</span>
            <select
              value={ticketWidth}
              onChange={(e) => setTicketWidth(e.target.value as any)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="80mm">80mm (Standard POS / Thermal)</option>
              <option value="58mm">58mm (Compact)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Live Polling & Network */}
      <Card className="p-5 space-y-4 bg-[#111726]">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Backend Connection & Sync</h3>
            <p className="text-xs text-slate-400">
              Connection configuration with the Spring Boot server
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">REST API Target</span>
            <span className="font-mono text-xs text-amber-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              http://localhost:8080/api
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-300 block">Poll Refresh Frequency</span>
              <span className="text-[11px] text-slate-500">
                Frequency in seconds to sync new tickets
              </span>
            </div>
            <select
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value={3}>3 seconds (Fastest)</option>
              <option value={5}>5 seconds (Recommended)</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Security & System Info */}
      <Card className="p-5 space-y-3 bg-[#111726]">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">System Information</h3>
            <p className="text-xs text-slate-400">Environment and build verification</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block">Frontend Version</span>
            <span className="text-slate-200 font-mono font-semibold">
              KDS v2.0 (React 18 + Vite)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block">Backend Framework</span>
            <span className="text-emerald-400 font-mono font-semibold">
              Spring Boot 4.1.1 (Java 21)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block">Database Storage</span>
            <span className="text-amber-300 font-mono font-semibold">
              Supabase PostgreSQL 16
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block">Catalog Dishes</span>
            <span className="text-sky-300 font-mono font-semibold">
              174 Live Menu Items
            </span>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="primary" size="md" onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
};
