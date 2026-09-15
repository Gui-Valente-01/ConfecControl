"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { OrderPriority, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dateInputToDate, moneyToCents } from "@/lib/format";
import { companyIdWithCapability, requireUser } from "@/lib/auth";
import { canManageOrders } from "@/lib/roles";
import type { FormState } from "@/lib/form-state";
import { parseItems, parseServices, resolvePaymentStatus } from "@/lib/order-items";
import { planejarEdicaoDaEntrada, resolveStatusFromReceipts, sumReceipts } from "@/lib/payments";
import { sincronizarPrateleira } from "@/lib/prateleira-db";
import { registrarAviso } from "@/app/avisos/actions";
import { prisma } from "@/lib/prisma";
import { stageNameToOrderStatus } from "@/lib/status";
import { removeAttachmentByPath, removeAttachmentFromStorage, storageConfigured, uploadAttachmentToStorage } from "@/lib/storage";
import { caminhoNoBucket, normalizarNome, validarArquivo } from "@/lib/upload-validation";


const orderPriorities: OrderPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

// Recusa de dentro da transação: desfaz tudo e vira mensagem para quem editou.
class ErroDeEdicao extends Error {}

// Bloqueia cargos sem permissão de gerir pedidos (ex.: Produção é só leitura).
async function ensureCanManageOrders(): Promise<FormState | null> {
  const user = await requireUser();
  return canManageOrders(user.role) ? null : { error: "Você não tem permissão para esta ação." };
}

// Prioridade (preferência) do pedido: só o Dono (ADMIN) ou o Gerente (MANAGER) altera.
export async function setOrderPriorityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return { error: "Apenas o dono ou o gerente altera a prioridade." };
  }
  const id = String(formData.get("id") ?? "");
  const priorityRaw = String(formData.get("priority") ?? "");
  if (!id || !orderPriorities.includes(priorityRaw as OrderPriority)) return { error: "Prioridade inválida." };

  const updated = await prisma.order.updateMany({
    where: { id, companyId: user.companyId },
    data: { priority: priorityRaw as OrderPriority },
  });
  if (updated.count === 0) return { error: "Pedido não encontrado." };

  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/bancada");
  return { success: "Prioridade atualizada." };
}

export async function uploadAttachmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const orderId = String(formData.get("orderId") ?? "");
  const file = formData.get("file");
  if (!orderId || !(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo para enviar." };
  if (!storageConfigured()) {
    return { error: "Armazenamento de anexos não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." };
  }

  // Isolamento por empresa NAO e autorizacao: dizia de quem era o dado,
  // mas nao se esta pessoa podia mexer nele.
  const autor = await requireUser();
  const companyId = await companyIdWithCapability("orders.write");
  if (!companyId) return { error: "Voce nao tem permissao para alterar pedidos." };
  const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { id: true } });
  if (!order) return { error: "Pedido não encontrado." };

  // O tipo informado pelo navegador e escrito pelo cliente, entao nao vale como
  // prova: a checagem que decide e a assinatura dos primeiros bytes. Um .html
  // renomeado para .jpg morre aqui -- e num bucket publico ele viraria pagina
  // hospedada no dominio do Storage.
  const conteudo = await file.arrayBuffer();
  const validacao = validarArquivo({
    nome: file.name,
    tamanho: file.size,
    declarado: file.type || null,
    bytesIniciais: new Uint8Array(conteudo.slice(0, 16)),
  });
  if (!validacao.ok) return { error: validacao.erro };

  const path = caminhoNoBucket({
    companyId,
    orderId,
    nomeArquivo: normalizarNome(file.name, validacao.extensao),
    sufixoUnico: randomUUID(),
  });

  // Sobe com o tipo REAL, e nao com o declarado: o navegador respeita o
  // content-type devolvido pelo Storage.
  const storagePath = await uploadAttachmentToStorage(path, conteudo, validacao.mime);
  if (!storagePath) return { error: "Falha ao enviar o arquivo. Tente novamente." };

  await prisma.attachment.create({
    // url fica vazia: o endereco agora e assinado na hora de exibir, e guardar
    // URL permanente no banco foi exatamente o problema anterior.
    data: { orderId, name: file.name, url: "", storagePath, type: validacao.mime, sentBy: autor.name },
  });

  revalidatePath(`/pedidos/${orderId}`);
  return { success: "Anexo enviado." };
}

export async function deleteAttachmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Anexo não encontrado." };

  // Isolamento por empresa NAO e autorizacao: dizia de quem era o dado,
  // mas nao se esta pessoa podia mexer nele.
  const companyId = await companyIdWithCapability("orders.write");
  if (!companyId) return { error: "Voce nao tem permissao para alterar pedidos." };
  const attachment = await prisma.attachment.findFirst({
    where: { id, order: { companyId } },
    select: { id: true, url: true, storagePath: true, orderId: true },
  });
  if (!attachment) return { error: "Anexo não encontrado." };

  await prisma.attachment.delete({ where: { id: attachment.id } });

  if (attachment.url.startsWith("/uploads/")) {
    // Anexo antigo salvo no filesystem local, antes da migração para o Storage.
    try {
      await unlink(join(process.cwd(), "public", attachment.url));
    } catch {
      // arquivo já removido
    }
  } else {
    // Anexo novo guarda o caminho; o antigo, a URL publica. Enquanto os dois
    // formatos convivem, os dois precisam saber ser apagados.
    if (attachment.storagePath) {
      await removeAttachmentByPath(attachment.storagePath);
    } else if (attachment.url) {
      await removeAttachmentFromStorage(attachment.url);
    }
  }

  revalidatePath(`/pedidos/${attachment.orderId}`);
  return { success: "Anexo removido." };
}

export async function createOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const clientId = String(formData.get("clientId") ?? "");
  const deliveryDate = dateInputToDate(String(formData.get("deliveryDate") ?? ""));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const entradaInformada = moneyToCents(String(formData.get("paid") ?? ""));
  const internalNotes = String(formData.get("notes") ?? "").trim();
  const items = parseItems(String(formData.get("items") ?? "[]"));
  const services = parseServices(String(formData.get("services") ?? "[]"));

  if (!clientId || items.length === 0) return { error: "Informe o cliente e ao menos um item do pedido." };

  // Isolamento por empresa NAO e autorizacao: dizia de quem era o dado,
  // mas nao se esta pessoa podia mexer nele.
  const companyId = await companyIdWithCapability("orders.write");
  if (!companyId) return { error: "Voce nao tem permissao para alterar pedidos." };

  // Confirma que o cliente pertence a empresa do usuário.
  const client = await prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true, name: true } });
  if (!client) return { error: "Cliente inválido." };

  // Completa descrição de itens que vieram so com produto selecionado (apenas produtos da empresa).
  const productIds = items.map((item) => item.productId).filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, companyId }, select: { id: true, name: true } })
    : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const normalizedItems = items.map((item) => ({
    ...item,
    description: item.description || (item.productId ? productName.get(item.productId) ?? "Item do pedido" : "Item do pedido"),
  }));

  // Serviço é receita: entra no total que o cliente paga.
  const servicesTotalInCents = services.reduce((sum, service) => sum + service.priceInCents, 0);
  const totalAmountInCents =
    normalizedItems.reduce((sum, item) => sum + item.totalPriceInCents, 0) + servicesTotalInCents;
  // A entrada nunca passa do total, como no "Recebi". Cliente que paga R$ 200
  // num pedido de R$ 150 leva R$ 50 de troco: entraram R$ 150, e gravar R$ 200
  // inflava o caixa do relatório.
  const paidAmountInCents = Math.min(entradaInformada, totalAmountInCents);
  const paymentStatus = resolvePaymentStatus(paidAmountInCents, totalAmountInCents);

  const firstStage = await prisma.productionStage.findFirst({
    where: { companyId, active: true },
    orderBy: { position: "asc" },
  });

  // Cria pedido, itens e pagamento numa única transação. Criar NÃO mexe no
  // estoque: as peças só entram na prateleira quando o pedido fica pronto.
  // O número é gerado dentro da transação; se houver corrida (P2002 no
  // @@unique [companyId, number]), tenta de novo com o próximo número.
  let criado: { id: string; number: number } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      criado = await prisma.$transaction(async (tx) => {
        const last = await tx.order.findFirst({
          where: { companyId },
          orderBy: { number: "desc" },
          select: { number: true },
        });
        const number = (last?.number ?? 1000) + 1;

        const created = await tx.order.create({
          data: {
            companyId,
            clientId,
            number,
            deliveryDate,
            status: firstStage ? stageNameToOrderStatus(firstStage.name) : "RECEIVED",
            paymentStatus,
            totalAmountInCents,
            paidAmountInCents,
            paymentMethod: paymentMethod || null,
            internalNotes: internalNotes || null,
            currentStageId: firstStage?.id,
            items: {
              create: normalizedItems.map((item) => ({
                productId: item.productId,
                description: item.description,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPriceInCents: item.unitPriceInCents,
                totalPriceInCents: item.totalPriceInCents,
              })),
            },
            services: {
              create: services.map((service) => ({
                name: service.name,
                priceInCents: service.priceInCents,
              })),
            },
            // Só há pagamento se entrou dinheiro. A entrada é um recebimento
            // com data própria, e não a cobrança do total do pedido.
            payments:
              paidAmountInCents > 0
                ? {
                    create: {
                      amountInCents: paidAmountInCents,
                      status: "PAID",
                      method: paymentMethod || null,
                      note: "Entrada do pedido",
                      paidAt: new Date(),
                    },
                  }
                : undefined,
          },
          select: { id: true },
        });

        // Não faz nada no caso comum. Só age se a primeira etapa da empresa já
        // for "Pronto" — aí o pedido nasce na prateleira.
        await sincronizarPrateleira(tx, created.id, "etapa");
        return { id: created.id, number };
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        continue; // numero duplicado por corrida: recalcula e tenta de novo
      }
      throw e;
    }
  }

  if (criado === null) {
    return { error: "Não foi possível gerar o número do pedido. Tente novamente." };
  }

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  revalidatePath("/estoque");
  const pedidoCriado: { id: string; number: number } = criado;
  await registrarAviso({
    companyId,
    orderId: pedidoCriado.id,
    tipo: "PEDIDO_CRIADO",
    titulo: `Pedido #${pedidoCriado.number} entrou`,
    mensagem: `${client.name} — ${items.length === 1 ? "1 item" : `${items.length} itens`}.`,
  });

  return { success: `Pedido #${pedidoCriado.number} criado.` };
}

export async function updateOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const deliveryDate = dateInputToDate(String(formData.get("deliveryDate") ?? ""));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paidAmountInCents = moneyToCents(String(formData.get("paid") ?? ""));
  // O "pago" que a tela mostrava ao abrir. Ausente = formulário antigo.
  const paidOriginalRaw = formData.get("paidOriginal");
  const pagoMostrado = paidOriginalRaw === null ? null : moneyToCents(String(paidOriginalRaw));
  const internalNotes = String(formData.get("notes") ?? "").trim();
  const items = parseItems(String(formData.get("items") ?? "[]"));
  const services = parseServices(String(formData.get("services") ?? "[]"));

  if (!id || !clientId || items.length === 0) return { error: "Informe o cliente e ao menos um item do pedido." };

  // Isolamento por empresa NAO e autorizacao: dizia de quem era o dado,
  // mas nao se esta pessoa podia mexer nele.
  const companyId = await companyIdWithCapability("orders.write");
  if (!companyId) return { error: "Voce nao tem permissao para alterar pedidos." };

  const order = await prisma.order.findFirst({
    where: { id, companyId },
    include: { payments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  if (!order) return { error: "Pedido não encontrado." };

  // Confere antes de abrir a transação, para responder rápido no caso comum.
  // A mesma conta é refeita lá dentro, com o que existir no banco na hora.
  const previa = planejarEdicaoDaEntrada(order.payments, paidAmountInCents, pagoMostrado);
  if ("erro" in previa) return { error: previa.erro };

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true } });
  if (!client) return { error: "Cliente inválido." };

  const productIds = items.map((item) => item.productId).filter((p): p is string => Boolean(p));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, companyId }, select: { id: true, name: true } })
    : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const normalizedItems = items.map((item) => ({
    ...item,
    description: item.description || (item.productId ? productName.get(item.productId) ?? "Item do pedido" : "Item do pedido"),
  }));

  // Serviço é receita: entra no total que o cliente paga.
  const servicesTotalInCents = services.reduce((sum, service) => sum + service.priceInCents, 0);
  const totalAmountInCents =
    normalizedItems.reduce((sum, item) => sum + item.totalPriceInCents, 0) + servicesTotalInCents;

  try {
    await prisma.$transaction(
      async (tx) => {
        // O campo "pago" da edição mexe só no PRIMEIRO recebimento — o da entrada.
        // Recebimentos posteriores são histórico de caixa e não podem ser reescritos
        // por quem só voltou ao pedido para ajustar um prazo. Lido AQUI DENTRO:
        // um "Recebi" lançado enquanto a tela de edição estava aberta conta.
        const recebimentos = await tx.payment.findMany({
          where: { orderId: id },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, amountInCents: true, method: true },
        });
        const plano = planejarEdicaoDaEntrada(recebimentos, paidAmountInCents, pagoMostrado);
        if ("erro" in plano) throw new ErroDeEdicao(plano.erro);

        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderService.deleteMany({ where: { orderId: id } });
        await tx.order.update({
          where: { id },
          data: {
            clientId,
            deliveryDate,
            totalAmountInCents,
            paymentMethod: paymentMethod || null,
            internalNotes: internalNotes || null,
            items: {
              create: normalizedItems.map((item) => ({
                productId: item.productId,
                description: item.description,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPriceInCents: item.unitPriceInCents,
                totalPriceInCents: item.totalPriceInCents,
              })),
            },
            services: {
              create: services.map((service) => ({
                name: service.name,
                priceInCents: service.priceInCents,
              })),
            },
          },
        });

        const [entrada] = recebimentos;
        if (plano.acao === "atualizar" && entrada) {
          await tx.payment.update({
            where: { id: entrada.id },
            data: { amountInCents: plano.valor, method: paymentMethod || entrada.method },
          });
        } else if (plano.acao === "apagar" && entrada) {
          // Entrada zerada na edição: some do histórico, porque aquele dinheiro não entrou.
          await tx.payment.delete({ where: { id: entrada.id } });
        } else if (plano.acao === "criar") {
          await tx.payment.create({
            data: {
              orderId: id,
              amountInCents: plano.valor,
              status: "PAID",
              method: paymentMethod || null,
              note: "Entrada do pedido",
              paidAt: new Date(),
            },
          });
        }

        // O "pago" do pedido é a soma do que existe DE FATO em recebimentos,
        // e não o número digitado. Gravar o digitado deixava o relatório e o
        // financeiro com valores diferentes para o mesmo pedido.
        const depois = await tx.payment.findMany({ where: { orderId: id }, select: { amountInCents: true } });
        await tx.order.update({
          where: { id },
          data: {
            paidAmountInCents: sumReceipts(depois),
            paymentStatus: resolveStatusFromReceipts(totalAmountInCents, depois),
          },
        });

        // Pedido pronto que teve item alterado: a prateleira acompanha.
        await sincronizarPrateleira(tx, id, "edicao");
      },
      { isolationLevel: "Serializable" },
    );
  } catch (erro) {
    if (erro instanceof ErroDeEdicao) return { error: erro.message };
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2034") {
      return { error: "Outra pessoa mexeu neste pedido ao mesmo tempo. Confira e salve de novo." };
    }
    throw erro;
  }

  revalidatePath("/");
  revalidatePath("/estoque");
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  redirect(`/pedidos/${id}`);
}

export async function deleteOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await ensureCanManageOrders();
  if (denied) return denied;
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Pedido não encontrado." };

  // Isolamento por empresa NAO e autorizacao: dizia de quem era o dado,
  // mas nao se esta pessoa podia mexer nele.
  const companyId = await companyIdWithCapability("orders.write");
  if (!companyId) return { error: "Voce nao tem permissao para alterar pedidos." };

  const attachmentUrls = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, companyId },
      select: { id: true, attachments: { select: { url: true } } },
    });
    if (!order) return null;
    // Se o pedido estava pronto, as peças dele saem da prateleira. Não
    // "devolve" nada: criar o pedido não tira peça do estoque, então não há
    // o que devolver — era a devolução que inventava estoque que não existia.
    await sincronizarPrateleira(tx, id, "exclusao", { remover: true });
    await tx.order.delete({ where: { id } });
    return order.attachments.map((a) => a.url);
  });
  if (attachmentUrls === null) return { error: "Pedido não encontrado." };

  // Depois do commit, remove do Storage os arquivos dos anexos (melhor esforço;
  // anexos legados em /uploads/ não existem na Vercel e são ignorados).
  for (const url of attachmentUrls) {
    if (!url.startsWith("/uploads/")) await removeAttachmentFromStorage(url);
  }

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  revalidatePath("/estoque");
  redirect("/pedidos");
}
