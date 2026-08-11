import Link from "next/link";
import { Bell, BellOff, CheckCheck, Palette, Camera, HandHelping, MessageSquare, ArrowRight } from "lucide-react";
import { marcarTodosLidosAction } from "@/app/avisos/actions";
import { AppShell } from "@/components/app-shell";
import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { SectionCard } from "@/components/section-card";
import { ToastForm } from "@/components/toast-form";
import { requireRouteUser } from "@/lib/auth";
import { descreverTipo, eTipoAviso, ordenarAvisos, tempoRelativo, type TipoAviso } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ICONE: Record<TipoAviso, typeof Bell> = {
  PEDIDO_CRIADO: Bell,
  ETAPA_MUDOU: ArrowRight,
  PEDIDO_PRONTO: CheckCheck,
  PEDIDO_ENTREGUE: CheckCheck,
  PEDE_COR: Palette,
  PEDE_FOTO: Camera,
  PEDE_AJUDA: HandHelping,
  OBSERVACAO: MessageSquare,
};

export default async function AvisosPage() {
  const user = await requireRouteUser("/avisos");

  // 60 é bastante para uma confecção pequena e evita a lista crescer sem fim.
  const avisos = await prisma.aviso.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      tipo: true,
      urgente: true,
      titulo: true,
      mensagem: true,
      criadoPor: true,
      createdAt: true,
      orderId: true,
      leituras: { where: { userId: user.id }, select: { userId: true } },
    },
  });

  const lista = ordenarAvisos(
    avisos
      .filter((a) => eTipoAviso(a.tipo))
      .map((a) => ({
        ...a,
        tipo: a.tipo as TipoAviso,
        lido: a.leituras.length > 0,
        criadoEm: a.createdAt,
      })),
  );

  const naoLidos = lista.filter((a) => !a.lido).length;

  return (
    <AppShell eyebrow="Equipe" title="Avisos" user={user} search={false}>
      {/* Some sozinho em aparelho que nao suporta; no iPhone vira o passo a
          passo de instalacao, sem o qual a Apple nao entrega notificacao. */}
      <AtivarNotificacoes />

      <SectionCard
        eyebrow="Comunicação"
        title={naoLidos > 0 ? `${naoLidos} não lido${naoLidos === 1 ? "" : "s"}` : "Tudo lido"}
        action={
          naoLidos > 0 ? (
            <ToastForm action={marcarTodosLidosAction}>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-body transition hover:bg-canvas">
                <CheckCheck size={15} aria-hidden="true" />
                Marcar tudo como lido
              </button>
            </ToastForm>
          ) : null
        }
      >
        {lista.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-canvas p-8 text-center">
            <BellOff size={24} className="mx-auto text-soft" aria-hidden="true" />
            <h3 className="mt-2 font-semibold">Nenhum aviso ainda</h3>
            <p className="mt-1 text-sm text-muted">
              Os avisos aparecem sozinhos quando um pedido entra, muda de etapa ou fica pronto — e quando
              alguém pede cor, foto ou ajuda na bancada.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-divider">
            {lista.map((aviso) => {
              const Icone = ICONE[aviso.tipo];
              const desc = descreverTipo(aviso.tipo);
              return (
                <li key={aviso.id}>
                  <div
                    className={`flex gap-3 py-3 ${aviso.lido ? "opacity-60" : ""}`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        aviso.urgente && !aviso.lido
                          ? "bg-danger-soft text-danger-dark"
                          : "bg-tint text-body"
                      }`}
                    >
                      <Icone size={17} aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-fg">{aviso.titulo}</span>
                        {/* Urgência não depende só de cor: tem palavra. */}
                        {aviso.urgente && !aviso.lido ? (
                          <span className="rounded-md border border-danger-line bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-danger-dark">
                            Urgente
                          </span>
                        ) : null}
                        <span className="text-xs text-soft">{desc.rotulo}</span>
                      </div>

                      <p className="mt-0.5 text-sm leading-6 text-muted">{aviso.mensagem}</p>

                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-soft">
                        <span>{tempoRelativo(aviso.createdAt)}</span>
                        {aviso.criadoPor ? <span>· {aviso.criadoPor}</span> : null}
                        {aviso.orderId ? (
                          <Link
                            href={`/pedidos/${aviso.orderId}`}
                            className="font-semibold text-primary underline underline-offset-2"
                          >
                            abrir o pedido
                          </Link>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </AppShell>
  );
}
