"use client";

import { ChevronLeft, ChevronRight, Download, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { classificarAnexo, rotuloAnexo, type Anexo } from "@/lib/anexos";
import {
  SEM_DESLOCAMENTO,
  indiceVizinho,
  limitarDeslocamento,
  noLimite,
  proximoZoom,
  rotuloZoom,
  type Deslocamento,
} from "@/lib/zoom";

// Visualizador da arte, dentro do sistema.
//
// Antes o clique abria o arquivo em outra aba: funcionava, mas tirava a pessoa
// do sistema — e no celular ela voltava perdida, às vezes fechando a aba errada.
// Aqui a arte abre por cima, com aproximar/afastar para conferir detalhe de
// bordado, e o Esc devolve ao lugar de onde saiu.
//
// Usa o <dialog> nativo pelo mesmo motivo da confirmação: foco preso enquanto
// aberto, Esc fechando e foco devolvido ao botão que abriu, sem escrever isso
// à mão.

type Props = {
  anexos: Anexo[];
  /** Índice aberto; null = fechado. */
  aberto: number | null;
  onFechar: () => void;
  numeroPedido: number;
};

export function VisualizadorAnexo({ anexos, aberto, onFechar, numeroPedido }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [deslocamento, setDeslocamento] = useState<Deslocamento>(SEM_DESLOCAMENTO);
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  // Arrastando vira estado, e não só ref: o render precisa saber para desligar
  // a transição — imagem com transição durante o arrasto fica "escorregando"
  // atrás do dedo.
  const [arrastando, setArrastando] = useState(false);

  const reiniciar = useCallback(() => {
    setEscala(1);
    setDeslocamento(SEM_DESLOCAMENTO);
  }, []);

  const [indice, setIndice] = useState(aberto ?? 0);

  // Padrão do React de ajustar estado durante o render ao ver a prop mudar.
  // Feito por efeito, isto renderizaria duas vezes e a arte anterior piscaria
  // antes da nova aparecer.
  const [aberturaAnterior, setAberturaAnterior] = useState(aberto);
  if (aberto !== aberturaAnterior) {
    setAberturaAnterior(aberto);
    if (aberto !== null) {
      setIndice(aberto);
      setEscala(1);
      setDeslocamento(SEM_DESLOCAMENTO);
    }
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto !== null && !dialog.open) dialog.showModal();
    if (aberto === null && dialog.open) dialog.close();
  }, [aberto]);

  // O Esc fecha o <dialog> sem passar pelo React: sem avisar, o estado ficaria
  // dizendo "aberto" e o visualizador não abriria de novo.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const aoFechar = () => onFechar();
    dialog.addEventListener("close", aoFechar);
    return () => dialog.removeEventListener("close", aoFechar);
  }, [onFechar]);

  const trocar = useCallback(
    (direcao: 1 | -1) => {
      setIndice((i) => indiceVizinho(i, anexos.length, direcao));
      reiniciar();
    },
    [anexos.length, reiniciar],
  );

  const aplicarZoom = useCallback(
    (direcao: "mais" | "menos") => {
      setEscala((atual) => {
        const nova = proximoZoom(atual, direcao);
        // Ao voltar para 100% a imagem recentraliza sozinha: senão ela ficaria
        // torta num canto, sem sobra para arrastar de volta.
        const caixa = areaRef.current?.getBoundingClientRect();
        setDeslocamento((d) =>
          caixa ? limitarDeslocamento(d, nova, { largura: caixa.width, altura: caixa.height }) : SEM_DESLOCAMENTO,
        );
        return nova;
      });
    },
    [],
  );

  // Teclado: setas trocam de arte, + e - aproximam, 0 volta ao tamanho normal.
  useEffect(() => {
    if (aberto === null) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") trocar(1);
      else if (e.key === "ArrowLeft") trocar(-1);
      else if (e.key === "+" || e.key === "=") aplicarZoom("mais");
      else if (e.key === "-") aplicarZoom("menos");
      else if (e.key === "0") reiniciar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, trocar, aplicarZoom, reiniciar]);

  const anexo = anexos[indice];
  if (!anexo) return null;
  const tipo = classificarAnexo(anexo);

  // Enquanto está fechado, o <dialog> não desenha NADA de mídia.
  //
  // Isto não é detalhe: <img> dentro de elemento escondido continua baixando o
  // arquivo. Com o visualizador montado em cada cartão da bancada, a tela
  // baixava a arte em tamanho cheio de todos os pedidos — 12 MB por foto — só
  // por existir, jogando fora a economia da miniatura.
  const mostrarMidia = aberto !== null;

  const aoArrastar = (e: React.PointerEvent) => {
    if (escala <= 1 || !arrasto.current) return;
    const caixa = areaRef.current?.getBoundingClientRect();
    if (!caixa) return;
    const proximo = {
      x: deslocamento.x + (e.clientX - arrasto.current.x),
      y: deslocamento.y + (e.clientY - arrasto.current.y),
    };
    arrasto.current = { x: e.clientX, y: e.clientY };
    setDeslocamento(limitarDeslocamento(proximo, escala, { largura: caixa.width, altura: caixa.height }));
  };

  return (
    <dialog
      ref={ref}
      aria-label={`Arte do pedido ${numeroPedido}`}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-[#111a16] p-0 text-white backdrop:bg-black/70"
    >
      <div className="flex h-full flex-col">
        {/* Cabeçalho: o que é, e como sair. */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{anexo.name}</p>
            <p className="text-xs text-[#9eb1a8]">
              {rotuloAnexo(anexo)}
              {anexos.length > 1 ? ` · ${indice + 1} de ${anexos.length}` : ""}
            </p>
          </div>
          <a
            href={anexo.url}
            target="_blank"
            rel="noopener"
            download
            className="inline-flex size-11 items-center justify-center rounded-lg text-[#c8d6cf] transition hover:bg-white/10"
            title="Baixar arquivo"
            aria-label={`Baixar ${anexo.name}`}
          >
            <Download size={18} aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={onFechar}
            className="inline-flex size-11 items-center justify-center rounded-lg text-[#c8d6cf] transition hover:bg-white/10"
            title="Fechar"
            aria-label="Fechar a arte"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Área da arte. */}
        <div
          ref={areaRef}
          className="relative min-h-0 flex-1 overflow-hidden"
          onPointerDown={(e) => {
            if (escala > 1) {
              arrasto.current = { x: e.clientX, y: e.clientY };
              setArrastando(true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }}
          onPointerMove={aoArrastar}
          onPointerUp={() => {
            arrasto.current = null;
            setArrastando(false);
          }}
          onPointerCancel={() => {
            arrasto.current = null;
            setArrastando(false);
          }}
        >
          {!mostrarMidia ? null : tipo === "imagem" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={anexo.url}
              alt={`Arte do pedido ${numeroPedido}: ${anexo.name}`}
              draggable={false}
              className="absolute inset-0 m-auto max-h-full max-w-full select-none object-contain"
              style={{
                transform: `translate(${deslocamento.x}px, ${deslocamento.y}px) scale(${escala})`,
                cursor: escala > 1 ? "grab" : "default",
                transition: arrastando ? "none" : "transform 120ms ease-out",
              }}
            />
          ) : tipo === "pdf" ? (
            // O navegador desenha o PDF: é a prévia sem carregar biblioteca de
            // 1 MB só para mostrar a primeira página.
            <iframe
              src={anexo.url}
              title={`PDF do pedido ${numeroPedido}: ${anexo.name}`}
              className="h-full w-full bg-white"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-[#c8d6cf]">
                {rotuloAnexo(anexo)} não abre aqui na tela.
              </p>
              <a
                href={anexo.url}
                target="_blank"
                rel="noopener"
                download
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#111a16]"
              >
                <Download size={16} aria-hidden="true" />
                Baixar para abrir no programa de arte
              </a>
            </div>
          )}

          {anexos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => trocar(-1)}
                className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                aria-label="Arte anterior"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => trocar(1)}
                className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                aria-label="Próxima arte"
              >
                <ChevronRight size={22} aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>

        {/* Controles de zoom: só para imagem — PDF já tem os do navegador. */}
        {tipo === "imagem" ? (
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-white/10 px-3 py-2">
            <button
              type="button"
              onClick={() => aplicarZoom("menos")}
              disabled={noLimite(escala, "menos")}
              className="inline-flex size-11 items-center justify-center rounded-lg text-[#c8d6cf] transition hover:bg-white/10 disabled:opacity-40"
              aria-label="Afastar"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            {/* O nível em texto: quem não percebe a diferença visual lê o número. */}
            <span className="min-w-16 text-center text-sm font-semibold tabular-nums" aria-live="polite">
              {rotuloZoom(escala)}
            </span>
            <button
              type="button"
              onClick={() => aplicarZoom("mais")}
              disabled={noLimite(escala, "mais")}
              className="inline-flex size-11 items-center justify-center rounded-lg text-[#c8d6cf] transition hover:bg-white/10 disabled:opacity-40"
              aria-label="Aproximar"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={reiniciar}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[#c8d6cf] transition hover:bg-white/10"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Tamanho normal
            </button>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
