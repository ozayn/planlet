"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastMessage = {
  id: number;
  message: string;
  action?: ToastAction;
};

type ToastContextValue = {
  showToast: (message: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useLifeLabToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useLifeLabToast must be used within LifeLabToastProvider");
  }
  return context;
}

export function LifeLabToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const idRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, action?: ToastAction) => {
      clearTimer();
      idRef.current += 1;
      setToast({ id: idRef.current, message, action });
      timeoutRef.current = window.setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, 5000);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] flex justify-center px-3"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-border/70 bg-foreground px-4 py-2 text-sm text-background shadow-lg">
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="rounded-full bg-background/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-background transition-colors hover:bg-background/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                  clearTimer();
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
