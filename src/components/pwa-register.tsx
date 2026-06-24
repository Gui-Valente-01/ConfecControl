"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registro do service worker e opcional; ignora falhas silenciosamente
      });
    }
  }, []);

  return null;
}
