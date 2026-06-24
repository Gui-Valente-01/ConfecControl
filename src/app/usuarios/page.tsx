import { AppShell } from "@/components/app-shell";
import { DbUsersManager } from "@/components/db-users-manager";
import { requireRouteUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await requireRouteUser("/usuarios");
  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, sector: true, phone: true, active: true, createdAt: true },
  });

  return (
    <AppShell eyebrow="Equipe" title="Funcionários" actionLabel="Novo funcionário" user={user}>
      <DbUsersManager users={users} currentUserId={user.id} />
    </AppShell>
  );
}
