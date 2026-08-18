// O que pode entrar como anexo. Sem banco e sem Next, para permitir teste.
//
// Antes o sistema aceitava qualquer arquivo e confiava no `type` que o
// navegador informava — e esse campo é escrito pelo cliente, então mandar um
// .html dizendo "image/jpeg" era trivial. Num bucket público, isso vira página
// hospedada no domínio do Storage, servida a quem tiver o link.
//
// Aqui a checagem é tripla e independente: a extensão, o tipo declarado e o
// conteúdo de verdade. Os três precisam concordar.

/** Teto por arquivo. Foto de celular moderna passa de 5 MB, então 8 é folgado. */
export const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024;

/**
 * O que a confecção realmente envia: foto do modelo, arte do cliente, PDF.
 *
 * Lista de PERMITIDOS, e não de proibidos: proibir é uma corrida perdida, e um
 * formato esquecido na lista de proibidos entra. Os arquivos de vetor (.cdr,
 * .ai) ficam de fora porque não são exibíveis nem verificáveis por assinatura
 * confiável; quem precisa deles envia o PDF de visualização.
 */
export const TIPOS_PERMITIDOS: { mime: string; extensoes: string[] }[] = [
  { mime: "image/jpeg", extensoes: ["jpg", "jpeg"] },
  { mime: "image/png", extensoes: ["png"] },
  { mime: "image/webp", extensoes: ["webp"] },
  { mime: "image/gif", extensoes: ["gif"] },
  { mime: "application/pdf", extensoes: ["pdf"] },
];

/** Para o atributo accept do <input type="file">. */
export const ACCEPT_DO_FORMULARIO = TIPOS_PERMITIDOS.flatMap((t) => [
  t.mime,
  ...t.extensoes.map((e) => `.${e}`),
]).join(",");

/** A extensão, em minúsculas e sem ponto. Vazia quando não há. */
export function extensaoDe(nome: string): string {
  const limpo = String(nome ?? "").trim();
  const ponto = limpo.lastIndexOf(".");
  if (ponto < 0 || ponto === limpo.length - 1) return "";
  return limpo.slice(ponto + 1).toLowerCase();
}

/**
 * O tipo real, lido dos primeiros bytes.
 *
 * É o único dos três que o remetente não escolhe. Um .html renomeado para .jpg
 * e declarado como image/jpeg morre exatamente aqui.
 */
export function tipoRealDoConteudo(bytes: Uint8Array): string | null {
  const comeca = (assinatura: number[], offset = 0) =>
    assinatura.every((b, i) => bytes[offset + i] === b);

  if (comeca([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (comeca([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (comeca([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  // WEBP: "RIFF" .... "WEBP"
  if (comeca([0x52, 0x49, 0x46, 0x46]) && comeca([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (comeca([0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  return null;
}

export type ResultadoDaValidacao = { ok: true; mime: string; extensao: string } | { ok: false; erro: string };

/**
 * Decide se o arquivo entra.
 *
 * `declarado` é o que o navegador informou e NÃO é confiável: entra na conta
 * só para recusar contradição óbvia. Quem manda é o conteúdo.
 */
export function validarArquivo(params: {
  nome: string;
  tamanho: number;
  declarado: string | null;
  bytesIniciais: Uint8Array;
}): ResultadoDaValidacao {
  const { nome, tamanho, declarado, bytesIniciais } = params;

  if (tamanho <= 0) return { ok: false, erro: "Arquivo vazio." };
  if (tamanho > TAMANHO_MAXIMO_BYTES) {
    return { ok: false, erro: "Arquivo acima de 8 MB. Envie um arquivo menor." };
  }

  const extensao = extensaoDe(nome);
  const permitido = TIPOS_PERMITIDOS.find((t) => t.extensoes.includes(extensao));
  if (!permitido) {
    const lista = TIPOS_PERMITIDOS.flatMap((t) => t.extensoes).join(", ");
    return { ok: false, erro: `Tipo de arquivo não aceito. Envie: ${lista}.` };
  }

  const real = tipoRealDoConteudo(bytesIniciais);
  if (!real) {
    return { ok: false, erro: "Não foi possível reconhecer o arquivo. Envie uma foto ou um PDF." };
  }

  // O conteúdo tem que bater com a extensão. É aqui que o .html renomeado morre.
  if (real !== permitido.mime) {
    return { ok: false, erro: "O conteúdo do arquivo não corresponde à extensão." };
  }

  // O declarado só é checado quando existe; navegador antigo manda vazio.
  if (declarado && declarado !== real) {
    return { ok: false, erro: "O tipo informado não corresponde ao conteúdo do arquivo." };
  }

  return { ok: true, mime: real, extensao };
}

/**
 * Nome seguro para guardar no bucket.
 *
 * Tira acento, espaço e qualquer coisa que possa virar travessia de diretório
 * ("../"). O nome original continua no banco, para a pessoa reconhecer o
 * arquivo; o do bucket existe só para ser inofensivo.
 */
export function normalizarNome(nome: string, extensao: string): string {
  const base = String(nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  const seguro = base || "arquivo";
  return extensao ? `${seguro}.${extensao}` : seguro;
}

/**
 * Onde o arquivo mora no bucket.
 *
 * A empresa entra no começo do caminho: além de organizar, é o que permite
 * conferir, na hora de assinar a URL, que o anexo pedido pertence mesmo a quem
 * está pedindo.
 */
export function caminhoNoBucket(params: {
  companyId: string;
  orderId: string;
  nomeArquivo: string;
  sufixoUnico: string;
}): string {
  const { companyId, orderId, nomeArquivo, sufixoUnico } = params;
  return `${companyId}/${orderId}/${sufixoUnico}-${nomeArquivo}`;
}

/** O anexo pertence a esta empresa? Confere pelo caminho gravado. */
export function caminhoPertenceAEmpresa(caminho: string, companyId: string): boolean {
  const limpo = String(caminho ?? "");
  if (!limpo || limpo.includes("..")) return false;
  return limpo.startsWith(`${companyId}/`);
}
