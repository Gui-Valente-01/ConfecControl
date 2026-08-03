"use client";

import { useEffect } from "react";

/**
 * Avisa antes de perder um formulário preenchido.
 *
 * Cobre os dois jeitos de sair da página:
 * - fechar a aba ou recarregar, pelo aviso do próprio navegador;
 * - clicar num link do menu, que no Next é navegação sem recarregar e por isso
 *   escaparia do aviso nativo.
 *
 * Só age enquanto `dirty` é true. Enviar o formulário navega por submit, não por
 * link, então salvar não dispara a confirmação.
 */
export function useUnsavedWarning(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // O texto é decidido pelo navegador; o que importa é preventDefault.
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      // Deixa passar clique com modificador (abrir em outra aba) e botão do meio.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      if (link.target && link.target !== "_self") return;

      // Âncora na mesma página e download não perdem nada.
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#") || link.hasAttribute("download")) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    // Fase de captura: chega antes do roteador do Next tratar o clique.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
}
