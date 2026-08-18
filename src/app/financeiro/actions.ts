"use server";

import { revalidatePath } from "next/cache";
import { companyIdWithCapability } from "@/lib/auth";
import { moneyToCents } from "@/lib/format";
import type { FormState } from "@/lib/form-state";
import { computeBalance, resolveReceiptAmount, resolveStatusFromReceipts, sumReceipts } from "@/lib/payments";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function revalidateFinance(orderId: string) {
  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath("/financeiro");
  revalidatePath("/relatorios");
}

/**
 * Registra dinheiro que entrou.
 *
 * Cada recebimento vira uma linha própria, com data: é o que permite conferir
 * com o extrato e mostrar ao cliente quando ele pagou. Sem valor informado,
 * assume que recebeu o saldo inteiro, que é o caso comum.
 */
export async function registerPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Pedido não encontrado." };

  const informado = String(formData.get("amount") ?? "").trim();
  const informadoEmCentavos = informado ? moneyToCents(informado) : null;
  // Chave gerada pelo formulário, uma por tentativa. É o que distingue "a
  // pessoa quis lançar dois recebimentos iguais" de "o mesmo clique chegou
  // duas vezes". Sem ela, os dois casos são indistinguíveis no servidor.
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;

  // Registrar e apagar recebimento mexe em dinheiro: exige a capacidade, e
  // nao apenas estar logado. Antes, qualquer pessoa da empresa (inclusive a
  // Producao) podia lancar e excluir pagamento chamando a action direto.
  const companyId = await companyIdWithCapability("finance.write");
  if (!companyId) return { error: "Voce nao tem permissao para mexer em recebimentos." };

  // Confere a empresa antes de abrir a transação: é barato e evita segurar
  // conexão do banco para um pedido que nem é desta confecção.
  const pedido = await prisma.order.findFirst({
    where: { id: orderId, companyId },
    select: { id: true, number: true },
  });
  if (!pedido) return { error: "Pedido não encontrado." };

  try {
    const resultado = await prisma.$transaction(
      async (tx) => {
        // A LEITURA ACONTECE AQUI DENTRO, e não antes.
        //
        // Era esse o defeito: o saldo era lido fora da transação e o total pago
        // era gravado como valor absoluto. Dois envios simultâneos liam o mesmo
        // saldo, criavam dois recebimentos e gravavam o espelho de um só — o
        // pedido ficava com duas linhas de dinheiro e um total que ignorava uma
        // delas, e o cliente aparecia devendo o que já tinha pago.
        const atual = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          select: {
            number: true,
            totalAmountInCents: true,
            paymentMethod: true,
            payments: { select: { amountInCents: true } },
          },
        });

        const saldo = computeBalance(atual.totalAmountInCents, atual.payments);
        if (saldo <= 0) return { erro: `O pedido #${atual.number} já está quitado.` } as const;

        const valor = resolveReceiptAmount(saldo, informadoEmCentavos);
        if (valor <= 0) return { erro: "Informe um valor maior que zero." } as const;

        await tx.payment.create({
          data: {
            orderId,
            idempotencyKey,
            amountInCents: valor,
            status: "PAID",
            method: atual.paymentMethod || null,
            note: valor >= saldo ? "Quitação do saldo" : "Recebimento parcial",
            paidAt: new Date(),
          },
        });

        // O espelho é recalculado a partir do que existe DE FATO no banco
        // agora, e não da lista que foi lida lá atrás.
        const recebimentos = await tx.payment.findMany({
          where: { orderId },
          select: { amountInCents: true },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            paidAmountInCents: sumReceipts(recebimentos),
            paymentStatus: resolveStatusFromReceipts(atual.totalAmountInCents, recebimentos),
          },
        });

        return { valor, numero: atual.number } as const;
      },
      // Serializable é o que faz o banco recusar duas transações que leram o
      // mesmo saldo e tentaram gravar em cima uma da outra.
      { isolationLevel: "Serializable" },
    );

    if ("erro" in resultado) return { error: resultado.erro };

    revalidateFinance(orderId);
    return {
      success: `Recebimento de ${(resultado.valor / 100).toFixed(2)} registrado no pedido #${resultado.numero}.`,
    };
  } catch (erro) {
    // Chave repetida = o mesmo clique chegou de novo. O primeiro já gravou,
    // então isto é sucesso, e não falha: reclamar faria a pessoa lançar o
    // recebimento outra vez, na mão, para "consertar".
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      revalidateFinance(orderId);
      return { success: `Recebimento já registrado no pedido #${pedido.number}.` };
    }
    // Conflito de serialização: as duas transações valeram, o banco desfez uma.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2034") {
      return { error: "Duas pessoas registraram ao mesmo tempo. Confira o saldo e tente de novo." };
    }
    throw erro;
  }
}

/** Desfaz um recebimento lançado por engano, devolvendo o saldo. */
export async function deletePaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) return { error: "Recebimento não encontrado." };

  // Registrar e apagar recebimento mexe em dinheiro: exige a capacidade, e
  // nao apenas estar logado. Antes, qualquer pessoa da empresa (inclusive a
  // Producao) podia lancar e excluir pagamento chamando a action direto.
  const companyId = await companyIdWithCapability("finance.write");
  if (!companyId) return { error: "Voce nao tem permissao para mexer em recebimentos." };

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, order: { companyId } },
    select: { id: true, orderId: true, order: { select: { totalAmountInCents: true, number: true } } },
  });
  if (!payment) return { error: "Recebimento não encontrado." };

  // Mesma correcao do registro: apagar tambem lia os restantes FORA da
  // transacao. Excluir dois recebimentos ao mesmo tempo deixava o total pago
  // com o valor calculado por um dos dois, ignorando o outro.
  try {
    await prisma.$transaction(
      async (tx) => {
        // deleteMany em vez de delete: se a linha ja tiver sido apagada por
        // outra requisicao, isto vale zero em vez de estourar erro.
        const apagados = await tx.payment.deleteMany({ where: { id: paymentId } });
        if (apagados.count === 0) return;

        const restantes = await tx.payment.findMany({
          where: { orderId: payment.orderId },
          select: { amountInCents: true },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paidAmountInCents: sumReceipts(restantes),
            paymentStatus: resolveStatusFromReceipts(payment.order.totalAmountInCents, restantes),
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2034") {
      return { error: "Duas pessoas mexeram no mesmo pedido ao mesmo tempo. Confira o saldo e tente de novo." };
    }
    throw erro;
  }

  revalidateFinance(payment.orderId);
  return { success: `Recebimento removido do pedido #${payment.order.number}.` };
}
