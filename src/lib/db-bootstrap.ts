import { prisma } from "@/lib/prisma";
import { etapasParaCriar, modeloDaConta, servicosParaCriar } from "@/lib/modelos-de-conta";

type ContaClient = Pick<typeof prisma, "productionStage" | "service">;

/**
 * Prepara a empresa recém-criada com as etapas e os serviços do ramo dela.
 *
 * Roda dentro da transação do cadastro: se algo aqui falhar, a empresa, o
 * usuário e o uso do convite voltam atrás juntos, em vez de sobrar uma conta
 * sem etapa nenhuma — em que o primeiro pedido não teria onde cair.
 *
 * Segmento nulo ou desconhecido aplica as etapas padrão, que são as mesmas que
 * toda conta recebia antes de existir modelo.
 */
export async function prepararContaNova(companyId: string, segmento: string | null, db: ContaClient = prisma) {
  const modelo = modeloDaConta(segmento);

  await db.productionStage.createMany({ data: etapasParaCriar(modelo, companyId) });

  const servicos = servicosParaCriar(modelo, companyId);
  if (servicos.length > 0) {
    await db.service.createMany({ data: servicos });
  }
}
