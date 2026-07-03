import Link from "next/link";
import { ShieldCheck, UserCog, UsersRound, Workflow } from "lucide-react";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { SectionCard } from "@/components/section-card";

type DbSettingsPanelProps = {
  company: {
    name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
};

export function DbSettingsPanel({ company }: DbSettingsPanelProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <SectionCard eyebrow="Empresa" title="Dados da confecção">
        <CompanySettingsForm company={company} />
      </SectionCard>

      <div className="space-y-6">
        <SectionCard
          eyebrow="Permissões"
          title="Usuários e acessos"
          action={
            <Link
              href="/usuarios"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#087f7d] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05605e]"
            >
              <UsersRound size={16} aria-hidden="true" />
              Gerenciar usuários
            </Link>
          }
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              ["Dono", "Acesso total ao sistema", ShieldCheck],
              ["Gerente", "Ve tudo e gerencia usuários", UserCog],
              ["Produção / Financeiro", "Acesso só às áreas do cargo", Workflow],
            ].map(([role, text, Icon]) => (
              <article key={role as string} className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#e8f6f3] text-[#05605e]">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-semibold">{role as string}</h3>
                <p className="mt-2 text-sm text-[#66756d]">{text as string}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
