"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Em PRODUCAO registra o service worker (PWA + push).
    //
    // Em DESENVOLVIMENTO NAO registra — e ainda desfaz qualquer registro antigo
    // e limpa o cache. Motivo: o SW faz cache-first dos chunks /_next/static/,
    // e no dev os nomes desses arquivos sao estaveis entre reinicios. Depois de
    // reiniciar o servidor, ele passaria a servir JS velho do cache, com IDs de
    // Server Action que nao existem mais no servidor ("Server Action not found")
    // — alem de atrapalhar o Fast Refresh.
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registro do service worker e opcional; ignora falhas silenciosamente
      });
      return;
    }

    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }, []);

  return null;
}
