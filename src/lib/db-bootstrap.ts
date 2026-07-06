import { prisma } from "@/lib/prisma";

type StageClient = Pick<typeof prisma, "productionStage">;

// Cria as etapas de produção padrão para uma empresa nova.
export async function seedCompanyStages(companyId: string, db: StageClient = prisma) {
  await db.productionStage.createMany({
    data: [
      { companyId, name: "Recebido", position: 1, color: "#5b68d8" },
      { companyId, name: "Aguardando material", position: 2, color: "#8a6fdb" },
      { companyId, name: "Corte", position: 3, color: "#087f7d" },
      { companyId, name: "Costura", position: 4, color: "#c88a2b" },
      { companyId, name: "Bordado/estampa", position: 5, color: "#c87941" },
      { companyId, name: "Acabamento", position: 6, color: "#c43f54" },
      { companyId, name: "Pronto", position: 7, color: "#111a16" },
      { companyId, name: "Entregue", position: 8, color: "#66756d" },
    ],
  });
}
