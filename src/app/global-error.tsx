"use client";

// Última rede de proteção: erro que acontece no próprio layout raiz, antes de
// qualquer tela existir. O error.tsx não alcança esse caso, e sem este arquivo
// a pessoa veria a tela de erro crua do navegador.
//
// Aqui não dá para usar AppShell nem os tokens de cor: quando este arquivo
// aparece, o layout que carrega o CSS é justamente o que falhou. Por isso o
// estilo vai escrito à mão, e só com o essencial.

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          background: "#f4f6f5",
          color: "#1c2420",
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>O sistema não conseguiu abrir</h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#63736b", marginTop: "8px" }}>
            A falha já foi registrada e vamos olhar. Recarregue a página para tentar de novo.
          </p>
          {/* <a> e não <Link>, de propósito: o Link navega por dentro do app,
              e o app é justamente o que acabou de falhar. Aqui a recuperação
              precisa ser um carregamento novo da página, do zero. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: "20px",
              padding: "12px 20px",
              borderRadius: "8px",
              background: "#087f7d",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Recarregar
          </a>
        </div>
      </body>
    </html>
  );
}
