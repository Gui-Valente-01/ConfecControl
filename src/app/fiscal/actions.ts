"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { FiscalStatus } from "@prisma/client";
import { companyIdWithCapability, requireUser } from "@/lib/auth";
import { ambienteFiscal, provedorFiscal } from "@/lib/fiscal/config";
import { garantirTransicao, podeCancelar } from "@/lib/fiscal/estados";
import {
  conferirDados,
  montarPedidoDeEmissao,
  type DadosDaPeca,
} from "@/lib/fiscal/montar-pedido";
import type { ResultadoFiscal } from "@/lib/fiscal/provider";
import type { FormState } from "@/lib/form-state";
import { prisma, type TransactionClient } from "@/lib/prisma";

function revalidarFiscal(orderId: string | null) {
  revalidatePath("/fiscal");
  if (orderId) revalidatePath(`/pedidos/${orderId}`);
}

/** Grava o que aconteceu. Sem certificado, token ou XML inteiro: log é onde segredo vaza. */
async function registrarEvento(
  tx: TransactionClient,
  params: { documentId: string; tipo: string; status?: FiscalStatus; mensagem?: string | null; detalhe?: string | null; userId?: string | null },
) {
  await tx.fiscalEvent.create({
    data: {
      documentId: params.documentId,
      tipo: params.tipo,
      status: params.status,
      mensagem: params.mensagem ?? null,
      detalhe: params.detalhe ?? null,
      criadoPorUserId: params.userId ?? null,
    },
  });
}

/** Traduz a resposta do provedor para a situação do documento. */
function situacaoDoResultado(resultado: ResultadoFiscal): FiscalStatus {
  switch (resultado.situacao) {
    case "autorizada":
      return "AUTHORIZED";
    case "rejeitada":
      return "REJECTED";
    case "cancelada":
      return "CANCELLED";
    case "processando":
      return "PROCESSING";
    default:
      return "ERROR";
  }
}

/**
 * Emite a nota do pedido, em homologação por padrão.
 *
 * O caminho inteiro é: confere os dados → cria (ou reaproveita) o documento →
 * chama o provedor → grava o resultado com a transição validada. Cada passo
 * vira evento, porque nota fiscal é assunto de fiscalização e "por que esta
 * nota foi rejeitada?" precisa de resposta, não de dedução.
 */
export async function emitirNotaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const orderId = String(formData.get("orderId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();
  if (!orderId) return { error: "Pedido não encontrado." };
  if (!idempotencyKey) return { error: "Requisição inválida. Recarregue a página." };

  const autor = await requireUser();
  const companyId = await companyIdWithCapability("fiscal.issue");
  if (!companyId) return { error: "Você não tem permissão para emitir nota fiscal." };

  const [empresa, pedido] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.order.findFirst({
      where: { id: orderId, companyId },
      include: { client: true, items: true },
    }),
  ]);
  if (!empresa || !pedido) return { error: "Pedido não encontrado." };

  const idsDasPecas = pedido.items.map((i) => i.productId).filter((id): id is string => Boolean(id));
  const pecasCadastradas = await prisma.product.findMany({ where: { id: { in: idsDasPecas }, companyId } });
  const pecas = new Map<string, DadosDaPeca>(pecasCadastradas.map((p) => [p.id, p]));

  // A conferência acontece ANTES de falar com o provedor: rejeição da SEFAZ
  // volta como código numérico, que não diz à dona da confecção o que
  // preencher.
  const pendencias = conferirDados({ empresa, cliente: pedido.client, itens: pedido.items, pecas });
  if (pendencias.length > 0) {
    return { error: `Faltam ${pendencias.length} dado(s) obrigatório(s). Veja a lista no painel da nota.` };
  }

  const ambiente = ambienteFiscal();
  const provedor = provedorFiscal();

  // O documento nasce antes da chamada externa. Se a rede cair no meio, fica o
  // registro de que a emissão foi tentada — em vez de sumir sem rastro.
  let documento;
  try {
    documento = await prisma.fiscalDocument.create({
      data: {
        companyId,
        orderId,
        createdByUserId: autor.id,
        provider: provedor.nome,
        environment: ambiente,
        status: "VALIDATING",
        totalAmountInCents: pedido.totalAmountInCents,
        idempotencyKey,
      },
    });
  } catch (erro) {
    // Chave repetida = o botão foi clicado de novo. A primeira emissão já
    // aconteceu; reclamar faria a pessoa tentar mais uma vez.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      revalidarFiscal(orderId);
      return { success: "Esta emissão já foi enviada." };
    }
    throw erro;
  }

  await prisma.$transaction(async (tx) => {
    await registrarEvento(tx, {
      documentId: documento.id,
      tipo: "EMISSAO_SOLICITADA",
      status: "VALIDATING",
      mensagem: `Emissão solicitada em ${ambiente === "HOMOLOGACAO" ? "homologação" : "produção"}.`,
      userId: autor.id,
    });
  });

  const pedidoDeEmissao = montarPedidoDeEmissao({
    empresa,
    cliente: pedido.client,
    itens: pedido.items,
    pecas,
    ambiente,
    idempotencyKey,
    referenciaInterna: documento.id,
  });

  let resultado: ResultadoFiscal;
  try {
    garantirTransicao("VALIDATING", "PROCESSING");
    await prisma.fiscalDocument.update({ where: { id: documento.id }, data: { status: "PROCESSING", issuedAt: new Date() } });
    resultado = await provedor.emitirNFe(pedidoDeEmissao);
  } catch (erro) {
    await prisma.$transaction(async (tx) => {
      await tx.fiscalDocument.update({ where: { id: documento.id }, data: { status: "ERROR" } });
      await registrarEvento(tx, {
        documentId: documento.id,
        tipo: "FALHA_DE_COMUNICACAO",
        status: "ERROR",
        mensagem: "Não foi possível falar com o provedor fiscal.",
        detalhe: erro instanceof Error ? erro.message.slice(0, 500) : null,
        userId: autor.id,
      });
    });
    revalidarFiscal(orderId);
    return { error: "Não foi possível falar com o provedor fiscal. Tente de novo." };
  }

  const novaSituacao = situacaoDoResultado(resultado);
  garantirTransicao("PROCESSING", novaSituacao);

  await prisma.$transaction(async (tx) => {
    await tx.fiscalDocument.update({
      where: { id: documento.id },
      data: {
        status: novaSituacao,
        providerReference: resultado.providerReference,
        accessKey: resultado.chaveAcesso,
        number: resultado.numero,
        series: resultado.serie,
        protocol: resultado.protocolo,
        rejectionCode: resultado.codigoRejeicao,
        rejectionMessage: resultado.mensagem,
        authorizedAt: novaSituacao === "AUTHORIZED" ? new Date() : null,
      },
    });
    await registrarEvento(tx, {
      documentId: documento.id,
      tipo: novaSituacao === "AUTHORIZED" ? "AUTORIZADA" : "REJEITADA",
      status: novaSituacao,
      mensagem: resultado.mensagem,
      detalhe: resultado.codigoRejeicao ? `Código ${resultado.codigoRejeicao}` : null,
      userId: autor.id,
    });
  });

  revalidarFiscal(orderId);
  return novaSituacao === "AUTHORIZED"
    ? { success: `Nota autorizada. Número ${resultado.numero}, série ${resultado.serie}.` }
    : { error: resultado.mensagem ?? "A nota foi rejeitada." };
}

/** Pergunta ao provedor em que pé está uma nota que ficou processando. */
export async function consultarNotaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return { error: "Nota não encontrada." };

  const autor = await requireUser();
  const companyId = await companyIdWithCapability("fiscal.read");
  if (!companyId) return { error: "Você não tem permissão para ver notas fiscais." };

  const documento = await prisma.fiscalDocument.findFirst({ where: { id: documentId, companyId } });
  if (!documento || !documento.providerReference) return { error: "Nota ainda não enviada ao provedor." };

  const resultado = await provedorFiscal().consultarNFe(documento.providerReference, documento.environment);
  const novaSituacao = situacaoDoResultado(resultado);

  // Situação igual não vira transição: consultar duas vezes não pode gerar
  // dois eventos idênticos poluindo a auditoria.
  if (novaSituacao === documento.status) {
    revalidarFiscal(documento.orderId);
    return { success: "Situação confirmada, sem mudança." };
  }

  garantirTransicao(documento.status, novaSituacao);
  await prisma.$transaction(async (tx) => {
    await tx.fiscalDocument.update({
      where: { id: documento.id },
      data: {
        status: novaSituacao,
        accessKey: resultado.chaveAcesso ?? documento.accessKey,
        protocol: resultado.protocolo ?? documento.protocol,
        rejectionCode: resultado.codigoRejeicao,
        rejectionMessage: resultado.mensagem,
        authorizedAt: novaSituacao === "AUTHORIZED" ? new Date() : documento.authorizedAt,
      },
    });
    await registrarEvento(tx, {
      documentId: documento.id,
      tipo: "CONSULTA",
      status: novaSituacao,
      mensagem: resultado.mensagem,
      userId: autor.id,
    });
  });

  revalidarFiscal(documento.orderId);
  return { success: "Situação atualizada." };
}

/**
 * Cancela uma nota autorizada.
 *
 * A SEFAZ exige justificativa de 15 caracteres e tem prazo legal para o
 * cancelamento — quem confere o prazo é o provedor, porque ele varia por UF.
 */
export async function cancelarNotaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const documentId = String(formData.get("documentId") ?? "");
  const justificativa = String(formData.get("justificativa") ?? "").trim();
  if (!documentId) return { error: "Nota não encontrada." };
  if (justificativa.length < 15) {
    return { error: "A justificativa precisa de ao menos 15 caracteres. É exigência da SEFAZ." };
  }

  const autor = await requireUser();
  const companyId = await companyIdWithCapability("fiscal.cancel");
  if (!companyId) return { error: "Você não tem permissão para cancelar nota fiscal." };

  const documento = await prisma.fiscalDocument.findFirst({ where: { id: documentId, companyId } });
  if (!documento) return { error: "Nota não encontrada." };
  if (!podeCancelar(documento.status)) {
    return { error: "Só é possível cancelar uma nota autorizada." };
  }
  if (!documento.providerReference || !documento.accessKey) {
    return { error: "Esta nota não tem referência no provedor." };
  }

  garantirTransicao(documento.status, "CANCELLATION_PENDING");
  await prisma.$transaction(async (tx) => {
    await tx.fiscalDocument.update({ where: { id: documento.id }, data: { status: "CANCELLATION_PENDING" } });
    await registrarEvento(tx, {
      documentId: documento.id,
      tipo: "CANCELAMENTO_SOLICITADO",
      status: "CANCELLATION_PENDING",
      mensagem: justificativa,
      userId: autor.id,
    });
  });

  const resultado = await provedorFiscal().cancelarNFe({
    ambiente: documento.environment,
    providerReference: documento.providerReference,
    chaveAcesso: documento.accessKey,
    justificativa,
  });

  const novaSituacao = resultado.situacao === "cancelada" ? "CANCELLED" : "AUTHORIZED";
  garantirTransicao("CANCELLATION_PENDING", novaSituacao);

  await prisma.$transaction(async (tx) => {
    await tx.fiscalDocument.update({
      where: { id: documento.id },
      data: {
        status: novaSituacao,
        cancelledAt: novaSituacao === "CANCELLED" ? new Date() : null,
        protocol: resultado.protocolo ?? documento.protocol,
        rejectionMessage: novaSituacao === "CANCELLED" ? null : resultado.mensagem,
      },
    });
    await registrarEvento(tx, {
      documentId: documento.id,
      tipo: novaSituacao === "CANCELLED" ? "CANCELADA" : "CANCELAMENTO_RECUSADO",
      status: novaSituacao,
      mensagem: resultado.mensagem,
      userId: autor.id,
    });
  });

  revalidarFiscal(documento.orderId);
  return novaSituacao === "CANCELLED"
    ? { success: "Nota cancelada." }
    : { error: resultado.mensagem ?? "O cancelamento foi recusado." };
}
