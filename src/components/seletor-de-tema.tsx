"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { TEMA_CHAVE, TEMA_EVENTO, temaBarra, temaOpcoes, type Tema } from "@/lib/tema";

const ICONE: Record<Tema, typeof Sun> = {
  auto: Monitor,
  light: Sun,
  dark: Moon,
};

// Escreve o tema já resolvido no <html>. É o mesmo que o script do layout faz
// no carregamento; aqui vale para quando a pessoa troca com a tela aberta.
function aplicar(tema: Tema) {
  const escuro =
    tema === "dark" ||
    (tema === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.setAttribute("data-theme", escuro ? "dark" : "light");

  // A barra do navegador no celular acompanha. Sem isto, escolher escuro com o
  // aparelho no claro deixaria uma faixa acesa no topo da tela.
  const cor = temaBarra[escuro ? "dark" : "light"];
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", cor);
  });
}

/** No menu o seletor fica sobre a barra escura; na tela da conta, sobre um
 *  cartao claro. Sao os mesmos botoes, so muda o par de cores do fundo. */
type Tom = "escuro" | "claro";

const ESTILO: Record<Tom, { rotulo: string; caixa: string; inativo: string }> = {
  escuro: {
    rotulo: "text-[#9eb1a8]",
    caixa: "border-white/10 bg-white/[0.06]",
    inativo: "text-[#c8d6cf] hover:bg-white/10 hover:text-white",
  },
  claro: {
    rotulo: "text-muted",
    caixa: "border-line bg-canvas",
    inativo: "text-body hover:bg-tint",
  },
};

export function SeletorDeTema({ tom = "escuro" }: { tom?: Tom } = {}) {
  const estilo = ESTILO[tom];
  // Começa em null para não desenhar a opção errada: o valor real está no
  // navegador, e o servidor não tem como saber qual é.
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    const salvo = localStorage.getItem(TEMA_CHAVE) as Tema | null;
    setTema(salvo ?? "auto");
  }, []);

  // No automático, seguir o aparelho em tempo real: quem usa o modo noturno
  // por horário veria a tela trocar sozinha ao anoitecer, sem recarregar.
  useEffect(() => {
    if (tema !== "auto") return;
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = () => aplicar("auto");
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, [tema]);

  // Mantem os seletores da tela mostrando a mesma opcao, e acompanha a troca
  // feita em outra aba do sistema.
  useEffect(() => {
    const aoTrocar = (evento: Event) => {
      const novo = (evento as CustomEvent<Tema>).detail;
      if (novo) setTema(novo);
    };
    const aoTrocarEmOutraAba = (evento: StorageEvent) => {
      if (evento.key !== TEMA_CHAVE) return;
      const novo = (evento.newValue as Tema | null) ?? "auto";
      setTema(novo);
      aplicar(novo);
    };
    window.addEventListener(TEMA_EVENTO, aoTrocar);
    window.addEventListener("storage", aoTrocarEmOutraAba);
    return () => {
      window.removeEventListener(TEMA_EVENTO, aoTrocar);
      window.removeEventListener("storage", aoTrocarEmOutraAba);
    };
  }, []);

  const escolher = (novo: Tema) => {
    setTema(novo);
    localStorage.setItem(TEMA_CHAVE, novo);
    aplicar(novo);
    window.dispatchEvent(new CustomEvent<Tema>(TEMA_EVENTO, { detail: novo }));
  };

  const compacto = tom === "escuro";

  return (
    <div className={compacto ? "mt-3" : ""}>
      <p className={`mb-1.5 text-xs font-medium ${estilo.rotulo}`}>Tema</p>
      <div
        role="group"
        aria-label="Tema do sistema"
        className={`flex gap-1 rounded-lg border p-1 ${estilo.caixa}`}
      >
        {temaOpcoes.map((opcao) => {
          const Icone = ICONE[opcao.valor];
          const ativo = tema === opcao.valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => escolher(opcao.valor)}
              aria-pressed={ativo}
              title={opcao.rotulo}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md font-semibold transition ${
                compacto ? "h-8 text-xs" : "h-11 text-sm"
              } ${
                ativo
                  ? compacto
                    ? "bg-white text-ink"
                    : "bg-primary text-white"
                  : estilo.inativo
              }`}
            >
              <Icone size={compacto ? 14 : 16} aria-hidden="true" />
              {opcao.rotulo}
            </button>
          );
        })}
      </div>
      {!compacto ? (
        <p className="mt-2 text-sm text-muted">
          No automático, o sistema acompanha o tema do seu celular ou computador. A escolha vale
          só neste aparelho.
        </p>
      ) : null}
    </div>
  );
}
