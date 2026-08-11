// Tema claro/escuro do sistema.
//
// A escolha da pessoa fica no navegador dela (localStorage), e nao no banco:
// e uma preferencia do aparelho, nao da conta. A mesma pessoa pode querer o
// escuro no celular da oficina e o claro no computador do escritorio.

export const TEMA_CHAVE = "confeccontrol-tema";

// O seletor aparece em mais de um lugar ao mesmo tempo (menu lateral e tela da
// conta). Cada um guarda o proprio estado, entao mudar num deixava o outro
// marcando a opcao antiga. Este aviso mantem todos mostrando a mesma coisa.
export const TEMA_EVENTO = "confeccontrol:tema";

export type Tema = "auto" | "light" | "dark";

export const temaOpcoes: { valor: Tema; rotulo: string }[] = [
  { valor: "auto", rotulo: "Automático" },
  { valor: "light", rotulo: "Claro" },
  { valor: "dark", rotulo: "Escuro" },
];

// Cor da barra do navegador no celular, para ela acompanhar o tema escolhido.
export const temaBarra: Record<"light" | "dark", string> = {
  light: "#f4f6f5",
  dark: "#0e1311",
};

/**
 * Script que roda ANTES da primeira pintura da tela (ver layout.tsx).
 *
 * Precisa ser texto, e nao uma funcao importada: qualquer coisa que dependa
 * do JavaScript da pagina so rodaria depois, e a pessoa veria a tela clara
 * piscar antes de virar escura.
 *
 * Deixa o data-theme sempre resolvido ("light" ou "dark"), nunca "auto" — o
 * CSS entao precisa de uma regra so, em vez de repetir a paleta escura para
 * o caso do sistema e para o caso da escolha manual.
 */
export const scriptDoTema = `(function(){try{
var e=localStorage.getItem(${JSON.stringify(TEMA_CHAVE)})||"auto";
var d=e==="dark"||(e!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.setAttribute("data-theme",d?"dark":"light");
}catch(_){document.documentElement.setAttribute("data-theme","light")}})();`;
