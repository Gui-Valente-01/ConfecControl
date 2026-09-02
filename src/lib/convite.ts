// O convite de ativação: prazo, destinatário e a mensagem que o dono envia.
//
// Por que isto existe
// ---------------------------------------------------------------------------
// O código de ativação tem 8 dígitos e mora numa tela. Até aqui, convidar um
// cliente era ler esses dígitos, lembrar o endereço do cadastro e escrever a
// mensagem do zero, toda vez. Um dígito trocado não dá erro visível para quem
// enviou: dá erro para o cliente, no primeiro contato dele com o produto, que é
// o pior momento possível para ele achar que a coisa não funciona.
//
// Aqui a mensagem vira dado, e a regra de quando um convite ainda serve vira
// função. As duas telas que dependem disso — /master, que mostra o estado, e o
// cadastro, que aceita ou recusa — leem a MESMA função. Se cada uma decidisse
// por conta, uma hora a tela diria "disponível" e o cadastro diria "inválido".
//
// Regra de conteúdo: nada aqui pode prometer o que não foi medido. Já houve
// "no ar em uma tarde" e "conta em dois minutos" em material público sem
// nenhuma medição por trás. Convite é a primeira frase do relacionamento; se
// ela promete tempo, o cliente cronometra.

/**
 * Quantos dias um convite novo vale.
 *
 * Duas semanas cobre o intervalo real entre a conversa e a ativação (o cliente
 * costuma esperar virar a semana para mexer em sistema) sem deixar o código
 * vivo por meses. Convite vencido não é perda: o dono gera outro em um clique.
 */
export const DIAS_DE_VALIDADE_DO_CONVITE = 14;

export function calcularExpiracao(criadoEm: Date): Date {
  const prazo = new Date(criadoEm);
  prazo.setDate(prazo.getDate() + DIAS_DE_VALIDADE_DO_CONVITE);
  return prazo;
}

export type EstadoDoConvite = "disponivel" | "usado" | "revogado" | "expirado";

export type SituacaoDoToken = {
  usedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
};

/**
 * O estado do convite, em ordem de precedência.
 *
 * Revogado vem antes de usado porque revogar é ato do dono e deve aparecer
 * mesmo em token já consumido. Expirado vem por último: só interessa em token
 * que ainda estaria de pé.
 *
 * `expiresAt` nulo significa token anterior ao prazo — continua valendo, e a
 * tela mostra isso para o dono poder encerrar à mão.
 */
export function estadoDoConvite(token: SituacaoDoToken, agora: Date): EstadoDoConvite {
  if (token.revokedAt) return "revogado";
  if (token.usedAt) return "usado";
  if (token.expiresAt && token.expiresAt.getTime() <= agora.getTime()) return "expirado";
  return "disponivel";
}

/** Se o cadastro pode aceitar este código agora. */
export function conviteUtilizavel(token: SituacaoDoToken, agora: Date): boolean {
  return estadoDoConvite(token, agora) === "disponivel";
}

/**
 * Se o e-mail informado no cadastro pode usar este convite.
 *
 * Quando o dono anota o e-mail do contato ao criar o token, o convite passa a
 * ser daquela pessoa: código encaminhado para outra não abre empresa. Quando
 * deixa em branco, qualquer e-mail serve — a escolha é dele, e a consequência
 * de errar a digitação fica do lado de quem digitou, não do cliente.
 */
export function emailPodeUsarConvite(contactEmail: string | null, emailInformado: string): boolean {
  if (!contactEmail?.trim()) return true;
  return contactEmail.trim().toLowerCase() === emailInformado.trim().toLowerCase();
}

export type DadosDoConvite = {
  /** Os 8 dígitos gerados em /master. */
  code: string;
  /** Nome do cliente ou da empresa, como foi cadastrado no token. */
  clientName?: string | null;
  /** E-mail combinado. Quando existe, é o único que abre a conta. */
  contactEmail?: string | null;
  /** Prazo do convite. Nulo em token antigo, sem prazo. */
  expiresAt?: Date | null;
  /** Origem absoluta do site, sem barra no fim. */
  origin: string;
};

/** Endereço completo do cadastro, para o cliente abrir direto. */
export function urlDoCadastro(origin: string): string {
  return `${origin.replace(/\/$/, "")}/cadastro`;
}

function dataCurta(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

/**
 * Monta a mensagem pronta para colar no WhatsApp.
 *
 * Texto puro com quebras de linha simples: WhatsApp, e-mail e SMS aceitam
 * todos. Sem markdown, porque asterisco vira negrito em um e lixo em outro.
 */
export function montarConvite({ code, clientName, contactEmail, expiresAt, origin }: DadosDoConvite): string {
  const saudacao = clientName?.trim() ? `Oi, ${clientName.trim()}!` : "Oi!";
  const email = contactEmail?.trim();

  // Os passos são numerados na hora porque o do e-mail só existe quando o
  // convite está preso a um endereço. Numeração fixa deixaria buraco.
  const passos = [
    `Abra ${urlDoCadastro(origin)}`,
    `Digite o código ${code}`,
    ...(email ? [`Cadastre-se com o e-mail ${email} — o convite é só para ele`] : []),
    "Preencha o nome da confecção e o seu nome, e crie uma senha de pelo menos 10 caracteres",
  ].map((passo, i) => `${i + 1}. ${passo}`);

  const validade = expiresAt
    ? `Esse código vale uma vez só, até ${dataCurta(expiresAt)}.`
    : "Esse código vale uma vez só.";

  return [
    `${saudacao} Sua conta do ConfecControl está liberada.`,
    "",
    "Para ativar:",
    ...passos,
    "",
    validade,
    "Assim que entrar, a tela inicial mostra os primeiros passos. Qualquer dúvida, é só me chamar por aqui.",
  ].join("\n");
}
