"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";

export function PrintTrigger() {
  // Abre a janela de impressao automaticamente ao carregar.
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="print:hidden">
      <button
        onClick={() => window.print()}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        <Printer size={16} aria-hidden="true" />
        Imprimir / Salvar PDF
      </button>
      <p className="mt-2 text-xs text-soft">
        Dica: na janela de impressão, escolha o destino &quot;Salvar como PDF&quot; para baixar o recibo.
      </p>
    </div>
  );
}
