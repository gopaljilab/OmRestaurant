import { ordersApi } from './orders';

export interface ApiHealthState {
  isOnline: boolean;
  latencyMs: number | null;
  lastChecked: Date | null;
  isChecking: boolean;
  error: string | null;
}

export async function pingBackendHealth(): Promise<{ isOnline: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    // Ping the lightweight orders endpoint
    await ordersApi.getOrders('incoming');
    const latency = Math.round(performance.now() - start);
    return { isOnline: true, latencyMs: latency };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return {
      isOnline: false,
      latencyMs: latency,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
