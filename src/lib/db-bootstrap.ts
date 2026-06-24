import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const defaultCompanyName = "Confecção Modelo";
const defaultAdminEmail = "admin@confeccontrol.local";
const defaultAdminPassword = "admin123";

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

// Garante que exista pelo menos um usuário dono para a empresa poder logar.
export async function ensureDefaultUser(companyId: string) {
  const existing = await prisma.user.findFirst({ where: { companyId } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      companyId,
      name: "Administrador",
      email: defaultAdminEmail,
      password: hashPassword(defaultAdminPassword),
      role: "ADMIN",
    },
  });
}

export async function getDefaultCompany() {
  const existing = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    await ensureDefaultUser(existing.id);
    return existing;
  }

  const company = await prisma.company.create({
    data: {
      name: defaultCompanyName,
      email: "admin@confeccontrol.local",
      phone: "(11) 99999-9999",
    },
  });

  await seedCompanyStages(company.id);
  await ensureDefaultUser(company.id);

  return company;
}
