"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Sino de avisos, com o número de não lidos.
//
// Busca a própria contagem em vez de receber por prop: assim funciona em
// qualquer tela sem precisar mexer nas vinte páginas que montam o menu.
//
// Confere a cada minuto e sempre que a pessoa volta para a aba — que é o
// momento em que ela mais quer saber se apareceu algo. Não é notificação de
// celular ainda; é o aviso dentro do sistema, que funciona em todo aparelho.

const INTERVALO_MS = 60_000;

export function SinoAvisos() {
  const [contagem, setContagem] = useState({ total: 0, urgentes: 0 });
  const caminho = usePathname();

  useEffect(() => {
    let vivo = true;

    const buscar = async () => {
      try {
        const res = await fetch("/api/avisos/contagem", { cache: "no-store" });
        if (!res.ok) return;
        const dados = await res.json();
        if (vivo) setContagem({ total: dados.total ?? 0, urgentes: dados.urgentes ?? 0 });
      } catch {
        // Sem internet o sino apenas não atualiza. Não vale um erro na tela.
      }
    };

    buscar();
    const timer = setInterval(buscar, INTERVALO_MS);
    // Voltar para a aba é quando a pessoa mais quer saber se chegou algo.
    const aoVoltar = () => { if (document.visibilityState === "visible") buscar(); };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      vivo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
    // O caminho entra na lista para a contagem se refazer ao navegar: quem
    // acabou de abrir a lista de avisos deve ver o sino zerar.
  }, [caminho]);

  const temUrgente = contagem.urgentes > 0;
  const rotulo =
    contagem.total === 0
      ? "Avisos da equipe"
      : `${contagem.total} aviso${contagem.total === 1 ? "" : "s"} não lido${contagem.total === 1 ? "" : "s"}${
          temUrgente ? `, ${contagem.urgentes} urgente${contagem.urgentes === 1 ? "" : "s"}` : ""
        }`;

  return (
    <Link
      href="/avisos"
      aria-label={rotulo}
      title={rotulo}
      className={`relative flex size-10 items-center justify-center rounded-lg border bg-white shadow-sm transition ${
        temUrgente
          ? "border-[#f1c0c9] text-[#9f2f42] hover:bg-[#fff0f2]"
          : "border-[#d9e1dd] text-[#1c2420] hover:border-[#c7d3ce] hover:bg-[#f8faf9]"
      }`}
    >
      <Bell size={18} aria-hidden="true" />
      {contagem.total > 0 ? (
        <span
          aria-hidden="true"
          className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ${
            temUrgente ? "bg-[#9f2f42]" : "bg-[#087f7d]"
          }`}
        >
          {contagem.total > 9 ? "9+" : contagem.total}
        </span>
      ) : null}
    </Link>
  );
}
