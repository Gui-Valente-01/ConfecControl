import { PrismaClient } from "@prisma/client";
import { aplicarFiltro, eLeitura, temLixeira } from "@/lib/soft-delete";

// Cliente do banco com o filtro da lixeira embutido.
//
// Consulta a cliente, peça, material, terceirizada e serviço passa a enxergar
// só o que não foi apagado. É aqui e em nenhum outro lugar: são 37 leituras no
// sistema, e filtrar uma a uma deixaria escapar alguma — com um erro silencioso,
// do tipo que só aparece quando o cadastro apagado reaparece numa tela só.
//
// Para ver o que está na lixeira, basta a consulta falar de deletedAt: aí ela
// manda, e o filtro sai da frente.
function criarCliente() {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (temLixeira(model) && eLeitura(operation)) {
            return query(aplicarFiltro(args as { where?: Record<string, unknown> }));
          }
          return query(args);
        },
      },
    },
  });
}

type ClientePrisma = ReturnType<typeof criarCliente>;

/**
 * O `tx` de dentro de um $transaction.
 *
 * Vem daqui e não de `Prisma.TransactionClient`: com a extensão da lixeira, o
 * cliente tem um tipo próprio, e o do Prisma não bate mais. Tipar pelo cliente
 * de verdade garante que a transação também enxerga o filtro dos apagados —
 * uma transação que enxergasse cadastro na lixeira seria pior do que não ter
 * filtro nenhum, porque erraria só às vezes.
 */
export type TransactionClient = Omit<
  ClientePrisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ClientePrisma;
};

export const prisma = globalForPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
