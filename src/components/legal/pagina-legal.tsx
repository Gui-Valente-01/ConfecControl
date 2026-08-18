import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { LandingFooter, LandingHeader } from "@/components/landing/landing-chrome";
import { dadosLegais, pendenciasLegais } from "@/lib/legal";

/**
 * A moldura das páginas legais.
 *
 * O aviso de pendência aparece na PRÓPRIA página, e não só num log: documento
 * legal com lacuna precisa ser visível para quem publicou, senão fica no ar
 * por meses com "[preencher]" no meio.
 */
export function PaginaLegal({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) {
  const dados = dadosLegais();
  const pendencias = pendenciasLegais(dados);

  return (
    <div className="bg-shell text-fg">
      <LandingHeader base="/" />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-14 md:px-8">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">{titulo}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{resumo}</p>
        <p className="mt-2 text-sm text-soft">Última atualização: {dados.atualizadoEm}.</p>

        {pendencias.length > 0 ? (
          <div className="mt-8 rounded-lg border border-warning-line bg-warning-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-warning-ink">
              <AlertTriangle size={16} aria-hidden="true" />
              Este documento está incompleto.
            </p>
            <p className="mt-1 text-sm text-warning-ink">
              Faltam dados que só o responsável pela empresa pode informar. Cadastre estas variáveis
              de ambiente antes de considerar a página publicada:
            </p>
            <ul className="mt-2 space-y-1">
              {pendencias.map((chave) => (
                <li key={chave} className="font-mono text-xs text-warning-ink">{chave}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <article className="legal mt-10">{children}</article>

        <section className="mt-12 rounded-lg border border-line bg-canvas p-5">
          <h2 className="text-lg font-semibold">Quem responde por este sistema</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            {[
              ["Razão social", dados.razaoSocial],
              ["CNPJ", dados.cnpj],
              ["Endereço", dados.endereco],
              ["Contato para privacidade", dados.emailPrivacidade],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-body">{rotulo}:</dt>
                <dd className={valor ? "text-muted" : "font-mono text-xs text-danger-dark"}>
                  {valor ?? "não informado"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
