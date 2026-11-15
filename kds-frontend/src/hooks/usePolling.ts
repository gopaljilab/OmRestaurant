import { useEffect, useRef } from 'react';

/**
 * Custom hook to safely poll an async callback at a given interval in milliseconds.
 */
export function usePolling(
  callback: () => Promise<void> | void,
  intervalMs: number = 5000,
  enabled: boolean = true
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    // Execute immediately on mount/enable
    savedCallback.current();

    const id = setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
