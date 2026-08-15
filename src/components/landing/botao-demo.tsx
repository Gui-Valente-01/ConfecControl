import { PlayCircle } from "lucide-react";
import { entrarNaDemoAction } from "@/app/demo/actions";
import { demoHabilitada } from "@/lib/demo";
import { BotaoSubmitDemo } from "./botao-submit-demo";

/**
 * "Ver o sistema funcionando": entra numa confecção fictícia, sem cadastro.
 *
 * Metade do mercado só mostra o produto depois de o visitante falar com um
 * vendedor. Quem está pesquisando às 23h desiste antes disso — e é justamente
 * esse o dono de confecção pequena que a gente quer.
 *
 * Some sozinho quando a demonstração não está ligada no ambiente, então não há
 * botão que leve a lugar nenhum.
 */
export function BotaoDemo({ className, tom = "claro" }: { className?: string; tom?: "claro" | "escuro" }) {
  if (!demoHabilitada()) return null;

  const estilo =
    tom === "escuro"
      ? "border-white/20 text-white hover:bg-white/10"
      : "border-line-strong bg-surface text-body hover:bg-canvas";

  return (
    <form action={entrarNaDemoAction}>
      <BotaoSubmitDemo
        className={`h-11 border px-5 ${estilo} ${className ?? ""}`}
        rotulo="Ver o sistema funcionando"
        rotuloOcupado="Preparando a demonstração..."
        icone={<PlayCircle size={17} aria-hidden="true" />}
      />
    </form>
  );
}
