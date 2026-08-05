// Como mostrar cada anexo do pedido. Sem React e sem banco, para permitir teste.
//
// O funcionário da bancada precisa VER o modelo antes de produzir. Mas o
// arquivo chega de todo jeito: foto do celular, PDF da arte, .cdr do CorelDRAW,
// .ai do Illustrator. Antes o sistema pegava o primeiro anexo e jogava dentro
// de uma <img> — se fosse um PDF, aparecia imagem quebrada, e a pessoa ia
// produzir sem ver o modelo.
//
// Aqui cada arquivo é classificado: o que dá para mostrar na tela aparece
// direto; o que não dá vira um cartão dizendo o que é e como abrir.

export type Anexo = {
  id: string;
  name: string;
  url: string;
  type: string | null;
};

export type TipoAnexo = "imagem" | "pdf" | "arte" | "outro";

/** Extensões de arquivo de arte que o navegador não abre, mas a oficina usa. */
const EXTENSOES_ARTE = new Set(["cdr", "ai", "eps", "psd", "svg", "dxf", "plt"]);

function extensao(nome: string): string {
  const partes = nome.toLowerCase().split(".");
  return partes.length > 1 ? partes[partes.length - 1] : "";
}

/**
 * O que é este arquivo, para a tela saber como mostrar.
 *
 * Olha o tipo declarado no envio e, se não der, a extensão do nome — muito
 * upload chega com tipo genérico (application/octet-stream), principalmente
 * .cdr, que o navegador não reconhece.
 */
export function classificarAnexo(anexo: Anexo): TipoAnexo {
  const tipo = (anexo.type ?? "").toLowerCase();
  const ext = extensao(anexo.name);

  // SVG é imagem para o navegador, mas na oficina é arquivo de arte: quem
  // abre é o Corel, não a tela. Por isso vem antes da checagem de imagem.
  if (EXTENSOES_ARTE.has(ext)) return "arte";
  if (tipo.startsWith("image/")) return "imagem";
  if (tipo === "application/pdf" || ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "avif"].includes(ext)) return "imagem";
  return "outro";
}

/** Só o que dá para desenhar na tela como miniatura. */
export function ehVisualizavel(anexo: Anexo): boolean {
  return classificarAnexo(anexo) === "imagem";
}

/**
 * A imagem que representa o pedido na bancada.
 *
 * Antes caía no primeiro anexo qualquer, virando imagem quebrada quando o
 * primeiro arquivo era um PDF. Agora, sem nenhuma imagem, devolve null e a
 * tela mostra o desenho de camiseta em vez de um quadrado quebrado.
 */
export function primeiraImagem(anexos: Anexo[]): Anexo | null {
  return anexos.find(ehVisualizavel) ?? null;
}

const ROTULOS: Record<TipoAnexo, string> = {
  imagem: "Foto",
  pdf: "PDF",
  arte: "Arquivo de arte",
  outro: "Arquivo",
};

/** Etiqueta curta do arquivo: "PDF", "Arquivo de arte (.cdr)". */
export function rotuloAnexo(anexo: Anexo): string {
  const tipo = classificarAnexo(anexo);
  const ext = extensao(anexo.name);
  if (tipo === "arte" && ext) return `${ROTULOS.arte} (.${ext})`;
  if (tipo === "outro" && ext) return `${ROTULOS.outro} .${ext}`;
  return ROTULOS[tipo];
}

/**
 * O que acontece ao tocar no arquivo.
 *
 * O PDF é desenhado pelo próprio navegador dentro do visualizador. Já o
 * arquivo de arte nenhum navegador abre: ali o visualizador oferece o download,
 * e o texto avisa isso antes, para a pessoa não tocar esperando ver a arte.
 */
export function comoAbrir(anexo: Anexo): string {
  const tipo = classificarAnexo(anexo);
  if (tipo === "pdf") return "Toque para ver o PDF aqui.";
  if (tipo === "arte") return "Não abre no navegador. Toque para baixar e abrir no programa de arte.";
  return "Toque para baixar.";
}

/** Separa o que aparece na tela do que só dá para baixar. */
export function separarAnexos(anexos: Anexo[]): { imagens: Anexo[]; arquivos: Anexo[] } {
  const imagens: Anexo[] = [];
  const arquivos: Anexo[] = [];
  for (const anexo of anexos) {
    if (ehVisualizavel(anexo)) imagens.push(anexo);
    else arquivos.push(anexo);
  }
  return { imagens, arquivos };
}
