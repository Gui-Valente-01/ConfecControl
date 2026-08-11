import { RotateCcw, Trash2, Undo2 } from "lucide-react";
import { purgeAction, restoreAction } from "@/app/lixeira/actions";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { ToastForm } from "@/components/toast-form";
import { requireRouteUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { diasNaLixeira, rotuloTipo, textoApagarDeVez, type TipoLixeira } from "@/lib/lixeira";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ItemLixeira = {
  id: string;
  nome: string;
  tipo: TipoLixeira;
  detalhe: string | null;
  deletedAt: Date;
};

export default async function LixeiraPage() {
  const user = await requireRouteUser("/lixeira");
  const companyId = user.companyId;

  // deletedAt: { not: null } é o que faz o filtro global sair da frente — em
  // qualquer outra tela do sistema estes registros são invisíveis.
  const naLixeira = { companyId, deletedAt: { not: null } } as const;
  const ordem = { deletedAt: "desc" } as const;

  const [clientes, pecas, materiais, terceirizadas, servicos] = await Promise.all([
    prisma.client.findMany({ where: naLixeira, orderBy: ordem, select: { id: true, name: true, phone: true, deletedAt: true } }),
    prisma.product.findMany({ where: naLixeira, orderBy: ordem, select: { id: true, name: true, category: true, deletedAt: true } }),
    prisma.material.findMany({ where: naLixeira, orderBy: ordem, select: { id: true, name: true, unit: true, deletedAt: true } }),
    prisma.partner.findMany({ where: naLixeira, orderBy: ordem, select: { id: true, name: true, service: true, deletedAt: true } }),
    prisma.service.findMany({ where: naLixeira, orderBy: ordem, select: { id: true, name: true, deletedAt: true } }),
  ]);

  const itens: ItemLixeira[] = [
    ...clientes.map((c) => ({ id: c.id, nome: c.name, tipo: "cliente" as const, detalhe: c.phone, deletedAt: c.deletedAt! })),
    ...pecas.map((p) => ({ id: p.id, nome: p.name, tipo: "peca" as const, detalhe: p.category, deletedAt: p.deletedAt! })),
    ...materiais.map((m) => ({ id: m.id, nome: m.name, tipo: "material" as const, detalhe: m.unit, deletedAt: m.deletedAt! })),
    ...terceirizadas.map((t) => ({ id: t.id, nome: t.name, tipo: "terceirizada" as const, detalhe: t.service, deletedAt: t.deletedAt! })),
    ...servicos.map((s) => ({ id: s.id, nome: s.name, tipo: "servico" as const, detalhe: null, deletedAt: s.deletedAt! })),
  ].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());

  const podeApagar = user.role === "ADMIN";

  return (
    <AppShell eyebrow="Administração" title="Lixeira" user={user} search={false}>
      <SectionCard
        eyebrow="Recuperação"
        title="Cadastros excluídos"
        action={
          <span className="rounded-lg bg-tint px-3 py-2 text-sm font-semibold text-body">
            {itens.length} {itens.length === 1 ? "item" : "itens"}
          </span>
        }
      >
        <p className="mb-4 rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm leading-6 text-muted">
          Nada aqui foi apagado de verdade. A ficha técnica das peças e o histórico de estoque continuam
          intactos — some tudo só se você mandar apagar de vez.
        </p>

        {itens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-canvas p-8 text-center">
            <Undo2 size={24} className="mx-auto text-primary-dark" aria-hidden="true" />
            <h3 className="mt-2 font-semibold">Lixeira vazia</h3>
            <p className="mt-1 text-sm text-muted">Nenhum cadastro foi excluído.</p>
          </div>
        ) : (
          <ul className="divide-y divide-divider">
            {itens.map((item) => (
              <li key={`${item.tipo}-${item.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                <span className="rounded-md border border-line bg-canvas px-2 py-0.5 text-xs font-semibold text-body">
                  {rotuloTipo(item.tipo)}
                </span>
                <span className="font-semibold">{item.nome}</span>
                {item.detalhe ? <span className="text-sm text-soft">{item.detalhe}</span> : null}

                <span className="ml-auto text-xs text-soft">
                  {(() => {
                    const dias = diasNaLixeira(item.deletedAt);
                    if (dias === 0) return `excluído hoje, ${formatDateTime(item.deletedAt)}`;
                    return dias === 1 ? "excluído ontem" : `excluído há ${dias} dias`;
                  })()}
                </span>

                <div className="flex items-center gap-2">
                  <ToastForm action={restoreAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="tipo" value={item.tipo} />
                    <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-3 text-sm font-semibold text-primary-dark transition hover:bg-primary-soft">
                      <RotateCcw size={14} aria-hidden="true" />
                      Restaurar
                    </button>
                  </ToastForm>

                  {podeApagar ? (
                    <ToastForm action={purgeAction} confirm={textoApagarDeVez(item.tipo, item.nome)}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="tipo" value={item.tipo} />
                      <button
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger-line bg-surface px-3 text-sm font-semibold text-danger-dark transition hover:bg-danger-soft"
                        title={`Apagar ${rotuloTipo(item.tipo).toLowerCase()} ${item.nome} de vez`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Apagar de vez
                      </button>
                    </ToastForm>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </AppShell>
  );
}
