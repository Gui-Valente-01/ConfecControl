import { prisma } from "@/lib/prisma";

// Cria as etapas de produção padrão para uma empresa nova.
export async function seedCompanyStages(companyId: string) {
  await prisma.productionStage.createMany({
    data: [
      { companyId, name: "Recebido", position: 1, color: "#4c6fff" },
      { companyId, name: "Aguardando material", position: 2, color: "#8a6fdb" },
      { companyId, name: "Corte", position: 3, color: "#0f8b8d" },
      { companyId, name: "Costura", position: 4, color: "#edae49" },
      { companyId, name: "Bordado/estampa", position: 5, color: "#c87941" },
      { companyId, name: "Acabamento", position: 6, color: "#d1495b" },
      { companyId, name: "Pronto", position: 7, color: "#1d1b16" },
      { companyId, name: "Entregue", position: 8, color: "#6f675b" },
    ],
  });
}
