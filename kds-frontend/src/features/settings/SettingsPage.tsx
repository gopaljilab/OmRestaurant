import React, { useState } from 'react';
import {
  Volume2,
  Printer,
  Server,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Play,
  RotateCcw,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getApiBaseUrl, setApiBaseUrl } from '../../services/api';
import { isDemoModeActive, setDemoModeActive, resetDemoData } from '../../services/demoMode';
import { pingBackendHealth } from '../../services/health';

export const SettingsPage: React.FC = () => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoPrintKOT, setAutoPrintKOT] = useState<boolean>(false);
  const [ticketWidth, setTicketWidth] = useState<'80mm' | '58mm'>('80mm');
  const [pollingInterval, setPollingInterval] = useState<number>(5);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // API & Demo Settings
  const [apiUrl, setApiUrl] = useState<string>(getApiBaseUrl());
  const [isDemo, setIsDemo] = useState<boolean>(isDemoModeActive());
  const [testResult, setTestResult] = useState<{ isOnline: boolean; latencyMs?: number; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Temporarily set URL to test
      setApiBaseUrl(apiUrl);
      const res = await pingBackendHealth();
      setTestResult(res);
    } catch (err) {
      setTestResult({
        isOnline: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setApiBaseUrl(apiUrl);
    setDemoModeActive(isDemo);
    setSavedNotice('Settings saved to local station profile successfully.');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleResetDemo = () => {
    resetDemoData();
    setSavedNotice('Kitchen simulator orders reset to initial default state.');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          KDS Settings & Station Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure display density, acoustic alerts, thermal printing, and backend connection targets.
        </p>
      </div>

      {savedNotice && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-800 p-3 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {savedNotice}
        </div>
      )}

      {/* Backend Connection & Cloud Target */}
      <Card className="p-5 space-y-4 bg-[#111726] border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">REST API Backend Target</h3>
            <p className="text-xs text-slate-400">
              Configure the public Spring Boot host URL or switch to standalone simulator mode
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Live Backend URL Target:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="e.g. https://om-restaurant-backend.onrender.com or http://localhost:8080"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Activity className={`h-3.5 w-3.5 text-sky-400 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Testing...' : 'Test Ping'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank for relative <code className="text-amber-400">/api</code> on local dev. When running on Vercel, enter your deployed Spring Boot domain.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.isOnline
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-700 text-rose-300'
              }`}
            >
              {testResult.isOnline ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Connection successful! Latency: <strong>{testResult.latencyMs}ms</strong></span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span>Unreachable: {testResult.error || 'Server did not respond'}</span>
                </>
              )}
            </div>
          )}

          {/* Kitchen Simulator / Demo Mode Toggle */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-white font-bold block flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 text-amber-400" />
                Kitchen Simulator / Demo Mode
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Enable interactive realistic orders across all 5 stations without requiring an active backend server
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isDemo && (
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Orders
                </button>
              )}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDemo}
                  onChange={(e) => setIsDemo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Acoustic / Audio Alert Settings */}
      <Card className="p-5 space-y-4 bg-[#111726]">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Audio & Kitchen Alerts</h3>
            <p className="text-xs text-slate-400">
              Web Audio harmonic chimes and acoustic alerts for incoming and delayed tickets
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
            <h3 className="text-sm font-bold text-white">Sync & Refresh Intervals</h3>
            <p className="text-xs text-slate-400">
              Polling frequency for real-time ticket synchronization
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
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
            <p className="text-xs text-slate-400">Environment and deployment status</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
            <span className="text-slate-500 block">Operating Mode</span>
            <span className={`font-mono font-semibold ${isDemo ? 'text-amber-400' : 'text-sky-400'}`}>
              {isDemo ? 'Demo Simulator' : 'Live REST API'}
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
