import { useCallback, useState } from 'react';
import type { BannerKind } from './components/ui';

export interface Toast {
  id: string;
  kind: BannerKind;
  icon?: string;
  title?: string;
  message?: string;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>, ttl = 3500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    if (ttl > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), ttl);
    }
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { toasts, push, dismiss };
}
