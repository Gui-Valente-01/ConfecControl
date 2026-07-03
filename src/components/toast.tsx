"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { FormState } from "@/lib/form-state";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastContextValue = {
  toast: (kind: ToastKind, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((kind: ToastKind, message: string) => {
    seq += 1;
    const id = seq;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((item) => {
          const tone =
            item.kind === "success"
              ? "border-[#bfe3df] bg-[#e8f6f3] text-[#05605e]"
              : item.kind === "error"
                ? "border-[#f1c0c9] bg-[#fff0f2] text-[#9f2f42]"
                : "border-[#d9e1dd] bg-white text-[#405047]";
          const Icon = item.kind === "error" ? XCircle : CheckCircle2;
          return (
            <div key={item.id} className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 shadow-sm ${tone}`}>
              <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm font-medium">{item.message}</p>
              <button onClick={() => remove(item.id)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Fechar aviso">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return ctx;
}

// Dispara um toast quando o estado de uma server action (useActionState) muda.
export function useActionFeedback(state: FormState) {
  const { toast } = useToast();
  const lastRef = useRef<FormState | null>(null);
  useEffect(() => {
    if (lastRef.current === state) return;
    lastRef.current = state;
    if (state.success) toast("success", state.success);
    else if (state.error) toast("error", state.error);
  }, [state, toast]);
}
