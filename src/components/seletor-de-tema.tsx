"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { TEMA_CHAVE, TEMA_EVENTO, temaBarra, temaOpcoes, type Tema } from "@/lib/tema";

const ICONE: Record<Tema, typeof Sun> = {
  auto: Monitor,
  light: Sun,
  dark: Moon,
};

// ---- A escolha de tema como fonte externa ao React --------------------------
// Fora do componente de propósito: as três funções não dependem de nada dele, e
// declará-las aqui garante a mesma referência a cada desenho -- o que o
// useSyncExternalStore exige para não reassinar o evento sem parar.

function assinarTema(aoMudar: () => void) {
  // O evento próprio cobre a troca nesta aba (há mais de um seletor na tela);
  // o "storage" cobre a troca feita em outra aba do sistema.
  window.addEventListener(TEMA_EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(TEMA_EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

function lerTema(): Tema {
  try {
    return (localStorage.getItem(TEMA_CHAVE) as Tema | null) ?? "auto";
  } catch {
    return "auto";
  }
}

// O servidor não tem como saber a escolha de quem vai abrir a página. Devolve o
// padrão; se a pessoa tiver escolhido outra coisa, o React corrige sozinho ao
// hidratar. O tema em si não pisca: quem já resolveu isso é o script do layout.
function lerTemaNoServidor(): Tema {
  return "auto";
}

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
  // A escolha mora no navegador, não no React: é o localStorage quem sabe.
  // useSyncExternalStore é a forma de ler isso sem copiar o valor para dentro
  // de um useState -- cópia que sai de sincronia quando o seletor aparece em
  // dois lugares da tela, ou quando a pessoa troca o tema em outra aba.
  const tema = useSyncExternalStore(assinarTema, lerTema, lerTemaNoServidor);

  // Escreve a escolha no <html>. Roda também quando ela vem de outra aba.
  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  // No automático, seguir o aparelho em tempo real: quem usa o modo noturno
  // por horário veria a tela trocar sozinha ao anoitecer, sem recarregar.
  useEffect(() => {
    if (tema !== "auto") return;
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = () => aplicar("auto");
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, [tema]);

  // Só grava e avisa: quem redesenha a tela é o useSyncExternalStore acima,
  // em todos os seletores de uma vez.
  const escolher = (novo: Tema) => {
    try {
      localStorage.setItem(TEMA_CHAVE, novo);
    } catch {
      // Navegador sem armazenamento (aba anônima com restrição): o tema ainda
      // vale para esta sessão, só não sobrevive ao recarregar.
    }
    window.dispatchEvent(new Event(TEMA_EVENTO));
  };

  // No menu o seletor e so tres icones lado a lado: ali o espaco e do nome da
  // pessoa e do botao de sair. Na tela da conta ele pode se explicar por
  // extenso, que e onde alguem vai procurar a opcao.
  const soIcones = tom === "escuro";

  return (
    <div className={soIcones ? "mt-3 flex justify-center" : ""}>
      {soIcones ? null : <p className={`mb-1.5 text-xs font-medium ${estilo.rotulo}`}>Tema</p>}
      <div
        role="group"
        aria-label="Tema do sistema"
        className={`flex gap-0.5 rounded-lg border p-0.5 ${estilo.caixa} ${soIcones ? "" : "gap-1 p-1"}`}
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
              aria-label={opcao.rotulo}
              title={opcao.rotulo}
              className={`flex items-center justify-center rounded-md font-semibold transition ${
                soIcones ? "size-7" : "h-10 flex-1 gap-1.5 text-sm"
              } ${
                ativo
                  ? soIcones
                    ? "bg-white text-ink"
                    : "bg-primary text-white"
                  : estilo.inativo
              }`}
            >
              <Icone size={soIcones ? 14 : 16} aria-hidden="true" />
              {soIcones ? null : opcao.rotulo}
            </button>
          );
        })}
      </div>
      {soIcones ? null : (
        <p className="mt-2 text-sm text-muted">
          No automático, o sistema acompanha o tema do seu celular ou computador. A escolha vale
          só neste aparelho.
        </p>
      )}
    </div>
  );
}
