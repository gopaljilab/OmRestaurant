import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const typeStyles = {
    success: 'bg-emerald-950/90 border-emerald-600/80 text-emerald-200',
    error: 'bg-rose-950/90 border-rose-600/80 text-rose-200',
    info: 'bg-slate-900/90 border-slate-700 text-slate-200',
  };

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />,
    info: <AlertCircle className="h-4 w-4 text-sky-400 flex-shrink-0" />,
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between rounded-xl border p-3.5 shadow-2xl backdrop-blur-md text-xs font-medium transition-all animate-in fade-in slide-in-from-bottom-2 ${
        typeStyles[toast.type]
      }`}
    >
      <div className="flex items-center gap-2.5">
        {icons[toast.type]}
        <span>{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
        aria-label="Dismiss toast"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
