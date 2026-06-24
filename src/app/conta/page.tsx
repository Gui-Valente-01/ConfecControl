import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/change-password-form";
import { SectionCard } from "@/components/section-card";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const user = await requireUser();

  return (
    <AppShell eyebrow="Conta" title="Minha conta" user={user}>
      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="Perfil" title="Meus dados">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#766d5d]">Nome</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#766d5d]">E-mail</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#766d5d]">Cargo</dt>
              <dd className="font-medium">{roleLabels[user.role]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#766d5d]">Empresa</dt>
              <dd className="font-medium">{user.companyName}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard eyebrow="Seguranca" title="Trocar senha">
          <ChangePasswordForm />
        </SectionCard>
      </section>
    </AppShell>
  );
}
