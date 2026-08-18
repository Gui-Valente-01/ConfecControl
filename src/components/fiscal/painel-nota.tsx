import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, XCircle } from "lucide-react";
import type { FiscalDocument, FiscalEvent } from "@prisma/client";
import { BotaoConsultar, BotaoEmitir, FormularioCancelamento } from "@/components/fiscal/acoes-nota";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { rotuloDoStatus } from "@/lib/fiscal/estados";
import { agruparPendencias, type Pendencia } from "@/lib/fiscal/montar-pedido";
import { formatShortDate } from "@/lib/format";

type Documento = FiscalDocument & { events: FiscalEvent[] };

// O StatusBadge tem quatro tons; "warn" e o vermelho dele.
const TOM: Record<string, "good" | "warn" | "neutral" | "dark"> = {
  AUTHORIZED: "good",
  CANCELLED: "dark",
  REJECTED: "warn",
  ERROR: "warn",
  PROCESSING: "neutral",
  VALIDATING: "neutral",
  CANCELLATION_PENDING: "neutral",
  DRAFT: "neutral",
};

/**
 * O painel da nota fiscal, dentro do pedido.
 *
 * Ele responde três perguntas, nesta ordem: esta nota já existe? se não existe,
 * o que falta para emitir? se deu errado, por quê? A lista do que falta vem
 * antes do botão de propósito — mandar emitir para depois descobrir o que
 * faltava é o caminho mais rápido para a pessoa desistir da nota.
 */
export function PainelNota({
  orderId,
  documentos,
  pendencias,
  ambiente,
  provedorEhFalso,
  podeEmitir,
  podeCancelar,
}: {
  orderId: string;
  documentos: Documento[];
  pendencias: Pendencia[];
  ambiente: "HOMOLOGACAO" | "PRODUCAO";
  provedorEhFalso: boolean;
  podeEmitir: boolean;
  podeCancelar: boolean;
}) {
  const atual = documentos[0] ?? null;
  const grupos = agruparPendencias(pendencias);
  const prontoParaEmitir = pendencias.length === 0;
  const jaAutorizada = atual?.status === "AUTHORIZED";

  return (
    <SectionCard
      eyebrow="Fiscal"
      title="Nota fiscal"
      action={atual ? <StatusBadge tone={TOM[atual.status] ?? "neutral"}>{rotuloDoStatus(atual.status)}</StatusBadge> : undefined}
    >
      {/* Sempre visível, nunca escondido num canto: quem está olhando esta tela
          precisa saber se aquilo vale como documento fiscal. */}
      <div
        className={`rounded-lg border p-3 text-sm ${
          ambiente === "HOMOLOGACAO"
            ? "border-warning-line bg-warning-soft text-warning-ink"
            : "border-danger-line bg-danger-soft text-danger-dark"
        }`}
      >
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle size={15} aria-hidden="true" />
          {ambiente === "HOMOLOGACAO" ? "Ambiente de teste (homologação)" : "Ambiente de produção"}
        </p>
        <p className="mt-1 leading-relaxed">
          {ambiente === "HOMOLOGACAO"
            ? "As notas emitidas aqui NÃO têm valor fiscal e não existem para a SEFAZ."
            : "As notas emitidas aqui têm valor fiscal e não podem ser desfeitas, apenas canceladas."}
          {provedorEhFalso ? " O provedor configurado é o de teste, que simula as respostas." : null}
        </p>
      </div>

      {/* O que falta */}
      {!prontoParaEmitir ? (
        <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
          <p className="text-sm font-semibold text-body">
            Faltam {pendencias.length} {pendencias.length === 1 ? "dado obrigatório" : "dados obrigatórios"} para emitir.
          </p>
          <p className="mt-1 text-sm text-muted">
            A nota é recusada pela SEFAZ com um código numérico se algum destes faltar. Preencher
            antes evita a recusa.
          </p>
          <div className="mt-3 space-y-3">
            {grupos.map((grupo) => (
              <div key={grupo.onde}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-soft">{grupo.rotulo}</p>
                <ul className="mt-1.5 space-y-1">
                  {grupo.itens.map((pendencia) => (
                    <li key={pendencia.o_que} className="flex items-start gap-2 text-sm">
                      <XCircle size={14} className="mt-0.5 shrink-0 text-danger-dark" aria-hidden="true" />
                      <span className="text-body">
                        {pendencia.o_que}
                        {pendencia.link ? (
                          <Link href={pendencia.link} className="ml-1.5 font-semibold text-primary hover:text-primary-dark">
                            preencher
                          </Link>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : !atual ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft p-3 text-sm text-primary-dark">
          <CheckCircle2 size={15} aria-hidden="true" />
          Os dados obrigatórios estão completos.
        </div>
      ) : null}

      {/* A nota */}
      {atual ? (
        <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[
              ["Situação", rotuloDoStatus(atual.status)],
              ["Número / série", atual.number ? `${atual.number} / ${atual.series ?? "-"}` : "—"],
              ["Emitida em", atual.issuedAt ? formatShortDate(atual.issuedAt) : "—"],
              ["Autorizada em", atual.authorizedAt ? formatShortDate(atual.authorizedAt) : "—"],
            ].map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-xs text-soft">{rotulo}</dt>
                <dd className="text-sm font-medium text-body">{valor}</dd>
              </div>
            ))}
          </dl>

          {atual.accessKey ? (
            <div className="mt-3">
              <p className="text-xs text-soft">Chave de acesso</p>
              <p className="break-all font-mono text-xs text-body">{atual.accessKey}</p>
            </div>
          ) : null}

          {atual.rejectionMessage ? (
            <div className="mt-3 rounded-lg border border-danger-line bg-danger-soft p-3">
              <p className="text-sm font-semibold text-danger-dark">
                {atual.rejectionCode ? `Código ${atual.rejectionCode}` : "Recusa"}
              </p>
              {/* O texto vai como veio da SEFAZ, sem traduzir: e o codigo
                  original que o contador usa para saber o que corrigir. */}
              <p className="mt-1 text-sm text-danger-dark">{atual.rejectionMessage}</p>
            </div>
          ) : null}

          {jaAutorizada ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`/fiscal/${atual.id}/xml`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-body transition hover:bg-tint"
              >
                <FileText size={14} aria-hidden="true" />
                Baixar XML
              </a>
              <a
                href={`/fiscal/${atual.id}/danfe`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-body transition hover:bg-tint"
              >
                <ExternalLink size={14} aria-hidden="true" />
                Baixar DANFE
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Ações */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {podeEmitir && prontoParaEmitir && (!atual || atual.status === "REJECTED" || atual.status === "ERROR") ? (
          <BotaoEmitir orderId={orderId} homologacao={ambiente === "HOMOLOGACAO"} />
        ) : null}

        {atual && (atual.status === "PROCESSING" || atual.status === "CANCELLATION_PENDING") ? (
          <BotaoConsultar documentId={atual.id} />
        ) : null}
      </div>

      {/* Cancelamento */}
      {podeCancelar && jaAutorizada ? (
        <details className="mt-4 rounded-lg border border-line bg-canvas p-4">
          <summary className="cursor-pointer text-sm font-semibold text-body">Cancelar esta nota</summary>
          <p className="mt-2 text-sm text-muted">
            O cancelamento é registrado na SEFAZ e não pode ser desfeito. Há prazo legal para
            cancelar, e ele varia por estado.
          </p>
          <FormularioCancelamento documentId={atual.id} />
        </details>
      ) : null}

      {/* Histórico */}
      {atual && atual.events.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-soft">Histórico</p>
          <ul className="mt-2 divide-y divide-divider">
            {atual.events.map((evento) => (
              <li key={evento.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                <span className="font-medium text-body">{evento.tipo.replaceAll("_", " ").toLowerCase()}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{evento.mensagem}</span>
                <span className="text-xs text-soft">{formatShortDate(evento.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}
