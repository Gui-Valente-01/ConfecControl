import { RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { recomecarDemoAction } from "@/app/demo/actions";
import { BotaoSubmitDemo } from "@/components/landing/botao-submit-demo";
import { demoHabilitada, EMPRESA_DEMO } from "@/lib/demo";

/**
 * Faixa que avisa que isto aqui é a demonstração, e não a confecção de ninguém.
 *
 * Sem ela o visitante pode achar que criou conta de verdade, e o dono de
 * confecção que entrou pelo celular acabaria lançando pedido real num cenário
 * que vai ser apagado. O botão de recomeçar fica junto do aviso porque é
 * exatamente ali que a pessoa percebe que pode mexer sem medo.
 */
export function AvisoDemo({ companyName }: { companyName: string }) {
  if (!demoHabilitada() || companyName !== EMPRESA_DEMO.nome) return null;

  return (
    <section className="rounded-lg border border-primary/30 bg-primary-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Sparkles size={20} className="mt-0.5 shrink-0 text-primary-dark" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-primary-dark">
              Você está na confecção de demonstração.
            </p>
            <p className="mt-1 text-sm text-body">
              Os dados são fictícios e podem ser apagados a qualquer momento. Mexa à vontade: crie
              pedidos, mova etapas, receba pagamentos. Nada aqui é de verdade.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={recomecarDemoAction}>
            <BotaoSubmitDemo
              className="h-10 border border-primary/40 bg-surface px-4 text-primary-dark hover:bg-primary-soft"
              rotulo="Recomeçar do zero"
              rotuloOcupado="Recriando o cenário..."
              icone={<RotateCcw size={15} aria-hidden="true" />}
            />
          </form>
          <Link
            href="/planos"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Quero para a minha confecção
          </Link>
        </div>
      </div>
    </section>
  );
}
