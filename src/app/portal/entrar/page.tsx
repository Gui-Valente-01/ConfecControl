import { redirect } from "next/navigation";
import { Shirt } from "lucide-react";
import { PortalActivateForm, PortalLoginForm } from "@/components/portal/portal-entry-forms";
import { getPortalClient } from "@/lib/client-auth";
import { planHasFeature } from "@/lib/features";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PortalEntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const existing = await getPortalClient();
  if (existing) redirect("/portal");

  const { t } = await searchParams;
  const token = (t ?? "").trim();

  // Convite válido? Mostra o formulário de criar senha; senão, login normal.
  let inviteCompany: string | null = null;
  if (token) {
    const client = await prisma.client.findUnique({
      where: { inviteToken: token },
      include: { company: { select: { name: true, features: true } } },
    });
    // Cliente na lixeira nao aparece: findUnique nao passa pelo filtro automatico.
    if (client && !client.deletedAt && planHasFeature(client.company.features, "portal")) {
      inviteCompany = client.company.name;
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f6f5] px-4 py-10 text-[#1c2420]">
      <div className="w-full max-w-md rounded-2xl border border-[#d9e1dd] bg-white p-6 shadow-[var(--cc-shadow)]">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-[#087f7d] text-white">
            <Shirt size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold">Portal do cliente</p>
            <p className="text-sm text-[#63736b]">Acompanhe seus pedidos</p>
          </div>
        </div>

        {inviteCompany ? (
          <>
            <h1 className="mt-6 text-xl font-semibold">Ative seu acesso</h1>
            <PortalActivateForm token={token} companyName={inviteCompany} />
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold">Entrar</h1>
            {token ? (
              <p className="mt-2 rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">
                Link de convite inválido ou expirado. Entre com seu e-mail e senha, ou peça um novo link à confecção.
              </p>
            ) : null}
            <PortalLoginForm />
            <p className="mt-4 text-center text-sm text-[#66756d]">
              Ainda não tem acesso? Peça o link do portal para a sua confecção.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
