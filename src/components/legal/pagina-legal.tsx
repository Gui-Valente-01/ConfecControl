import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { LandingFooter, LandingHeader } from "@/components/landing/landing-chrome";
import { dadosLegais, pendenciasLegais } from "@/lib/legal";

/**
 * A moldura das páginas legais.
 *
 * O aviso de pendência aparece na PRÓPRIA página, e não só num log: documento
 * legal com lacuna precisa ser visível para quem publicou, senão fica no ar
 * por meses com um campo em branco no meio.
 */
export function PaginaLegal({
  titulo,
  resumo,
  sumario,
  children,
}: {
  titulo: string;
  resumo: string;
  sumario: { id: string; texto: string }[];
  children: ReactNode;
}) {
  const dados = dadosLegais();
  const pendencias = pendenciasLegais(dados);

  // Pessoa fisica nao tem CNPJ, e endereco residencial so aparece se a pessoa
  // escolher publicar. Mostrar "nao informado" nesses casos sugeriria falta de
  // dado, quando na verdade o campo nao se aplica.
  const identificacao: { rotulo: string; valor: string | null }[] = [
    { rotulo: dados.rotuloNome, valor: dados.nomeControlador },
    ...(dados.tipo === "pj" ? [{ rotulo: "CNPJ", valor: dados.cnpj }] : []),
    ...(dados.tipo === "pj" || dados.endereco ? [{ rotulo: "Endereço", valor: dados.endereco }] : []),
    { rotulo: "Encarregado de dados", valor: dados.encarregadoNome },
    { rotulo: "Contato para privacidade", valor: dados.encarregadoEmail },
  ];

  return (
    <div className="bg-shell text-fg">
      <LandingHeader base="/" />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-14 md:px-8">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">{titulo}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{resumo}</p>
        <p className="mt-2 text-sm text-soft">
          Versão {dados.versao} · em vigor desde {dados.atualizadoEm}.
        </p>

        {pendencias.length > 0 ? (
          <div className="mt-8 rounded-lg border border-warning-line bg-warning-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-warning-ink">
              <AlertTriangle size={16} aria-hidden="true" />
              Este documento ainda não está pronto para valer.
            </p>
            <p className="mt-1 text-sm text-warning-ink">
              Faltam dados que só o responsável pela empresa pode informar. Cadastre estas variáveis
              de ambiente antes de considerar a página publicada:
            </p>
            <ul className="mt-2 space-y-1">
              {pendencias.map((p) => (
                <li key={p.chave} className="text-sm text-warning-ink">
                  <span className="font-mono text-xs">{p.chave}</span> — {p.oQue}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Documento longo pede índice: quem chega aqui quase sempre procura uma
            seção específica, e não vai ler do começo ao fim. */}
        <nav className="mt-10 rounded-lg border border-line bg-canvas p-5" aria-label="Índice">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-soft">Nesta página</p>
          <ol className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {sumario.map((item, i) => (
              <li key={item.id} className="text-sm">
                <a href={`#${item.id}`} className="text-body transition hover:text-primary">
                  <span className="font-mono text-xs text-soft">{String(i + 1).padStart(2, "0")}</span>{" "}
                  {item.texto}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="legal mt-12">{children}</article>

        <section className="mt-14 rounded-lg border border-line bg-canvas p-5">
          <h2 className="text-lg font-semibold">Quem responde por este sistema</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            {identificacao.map(({ rotulo, valor }) => (
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
