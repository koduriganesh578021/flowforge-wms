/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" aria-hidden="true" />,
    info: <AlertCircle className="w-5 h-5 text-[#f9b17a] shrink-0" aria-hidden="true" />,
  };

  const colors = {
    success: 'border-emerald-500/40 bg-[#16192b] text-white',
    error: 'border-rose-500/40 bg-[#16192b] text-white',
    info: 'border-[#f9b17a]/40 bg-[#16192b] text-white',
  };

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 max-w-md',
        colors[type],
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      {icons[type]}
      <p className="text-xs font-semibold text-white leading-snug flex-1">{message}</p>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        aria-label="Dismiss notification"
        className="ml-2 text-[#9ba3c9] hover:text-white p-1 rounded-lg hover:bg-[#2d3250] focus:outline-none focus:ring-2 focus:ring-[#f9b17a]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType }>>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
  };
}

