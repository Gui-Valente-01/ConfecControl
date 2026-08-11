"use client";

import Image from "next/image";
import { FileText, ImageOff, Palette, Paperclip } from "lucide-react";
import { useState } from "react";
import {
  classificarAnexo,
  comoAbrir,
  ehVisualizavel,
  rotuloAnexo,
  separarAnexos,
  separarPorOrigem,
  type Anexo,
} from "@/lib/anexos";
import { VisualizadorAnexo } from "@/components/visualizador-anexo";

// O modelo que o funcionário precisa ver antes de produzir.
//
// A arte chega de todo jeito: foto do celular, PDF, .cdr do Corel, .ai do
// Illustrator. Foto aparece na tela; o que o navegador não abre vira um cartão
// dizendo o que é e como abrir — em vez de um quadrado quebrado, que era o que
// acontecia quando um PDF caía dentro de uma <img>.
//
// A miniatura passa pelo next/image de propósito: antes o arquivo original era
// baixado inteiro para virar um quadradinho de 80px, e uma foto de celular de
// 6 MB custava 6 MB de internet só para isso.

const ICONE = {
  pdf: FileText,
  arte: Palette,
  outro: Paperclip,
  imagem: Paperclip,
} as const;

export function ModeloDoPedido({
  anexos,
  numeroPedido,
  compacto = false,
}: {
  anexos: Anexo[];
  numeroPedido: number;
  /** Na lista da bancada mostra pouco; ao abrir o pedido, mostra tudo. */
  compacto?: boolean;
}) {
  // A arte do cliente vem primeiro e separada das fotos da produção: quem vai
  // produzir precisa saber qual imagem é o modelo aprovado e qual é o registro
  // do que já foi feito.
  const { arte, producao } = separarPorOrigem(anexos);
  const { imagens, arquivos } = separarAnexos(arte);
  // Índice do anexo aberto no visualizador; null = fechado.
  const [vendo, setVendo] = useState<number | null>(null);

  if (anexos.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-line-strong bg-canvas px-3 py-2.5 text-xs text-soft">
        <ImageOff size={14} aria-hidden="true" />
        Sem foto do modelo. Peça a arte a quem fez o pedido antes de começar.
      </p>
    );
  }

  const imagensVisiveis = compacto ? imagens.slice(0, 3) : imagens;
  const sobrando = imagens.length - imagensVisiveis.length;
  const lado = compacto ? 80 : 160;

  // O visualizador percorre TODOS os anexos, e não só as imagens: quem abriu a
  // foto e quer ver o PDF da arte não precisa fechar e procurar na lista.
  const posicaoNaLista = (anexo: Anexo) => anexos.findIndex((a) => a.id === anexo.id);

  return (
    <div className="space-y-2">
      {imagensVisiveis.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {imagensVisiveis.map((anexo) => (
            <li key={anexo.id}>
              <button
                type="button"
                onClick={() => setVendo(posicaoNaLista(anexo))}
                title={`Ver ${anexo.name} maior`}
                aria-label={`Ver a arte ${anexo.name} do pedido ${numeroPedido} em tamanho maior`}
                className="block overflow-hidden rounded-lg border border-line transition hover:border-primary"
              >
                <Image
                  src={anexo.url}
                  alt={`Modelo do pedido ${numeroPedido}: ${anexo.name}`}
                  width={lado}
                  height={lado}
                  // A miniatura é pequena e aparece logo de cara na bancada:
                  // carregar sob demanda faria a arte piscar ao rolar a lista.
                  className="object-cover"
                  style={{ width: lado, height: lado }}
                />
              </button>
            </li>
          ))}
          {sobrando > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => setVendo(posicaoNaLista(imagens[imagensVisiveis.length]))}
                className="flex size-20 items-center justify-center rounded-lg border border-dashed border-line-strong bg-canvas text-xs font-semibold text-muted transition hover:border-primary"
                aria-label={`Ver as outras ${sobrando} artes do pedido ${numeroPedido}`}
              >
                +{sobrando}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {arquivos.length > 0 ? (
        <ul className="space-y-1.5">
          {arquivos.map((anexo) => {
            const Icone = ICONE[classificarAnexo(anexo)];
            return (
              <li key={anexo.id}>
                <button
                  type="button"
                  onClick={() => setVendo(posicaoNaLista(anexo))}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-left transition hover:border-primary hover:bg-canvas"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-tint text-body">
                    <Icone size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-body">{anexo.name}</span>
                    <span className="block text-xs text-soft">
                      {rotuloAnexo(anexo)} · {comoAbrir(anexo)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {imagens.length === 0 && arte.length > 0 ? (
        <p className="text-xs text-soft">
          Nenhum arquivo dá para ver aqui na tela. Toque acima para abrir ou baixar.
        </p>
      ) : null}

      {producao.length > 0 ? (
        <div className="border-t border-divider pt-2">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-soft">
            Fotos da produção
          </p>
          <ul className="flex flex-wrap gap-2">
            {producao.map((anexo) => (
              <li key={anexo.id}>
                <button
                  type="button"
                  onClick={() => setVendo(posicaoNaLista(anexo))}
                  title={anexo.sentBy ? `${anexo.name} — enviada por ${anexo.sentBy}` : anexo.name}
                  aria-label={
                    anexo.sentBy
                      ? `Ver a foto ${anexo.name}, enviada por ${anexo.sentBy}`
                      : `Ver a foto ${anexo.name}`
                  }
                  className="block overflow-hidden rounded-lg border border-warning-line transition hover:border-warning"
                >
                  {ehVisualizavel(anexo) ? (
                    <Image
                      src={anexo.url}
                      alt={`Foto da produção do pedido ${numeroPedido}: ${anexo.name}`}
                      width={64}
                      height={64}
                      className="object-cover"
                      style={{ width: 64, height: 64 }}
                    />
                  ) : (
                    <span className="flex size-16 items-center justify-center bg-warning-soft text-warning-ink">
                      <Paperclip size={16} aria-hidden="true" />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {/* Quem tirou fica visível: é o que permite voltar e perguntar. */}
          {producao[0]?.sentBy ? (
            <p className="mt-1 text-xs text-soft">
              {producao.length === 1
                ? `Enviada por ${producao[0].sentBy}`
                : `Enviadas pela equipe, a última por ${producao[producao.length - 1].sentBy}`}
            </p>
          ) : null}
        </div>
      ) : null}

      <VisualizadorAnexo
        anexos={anexos}
        aberto={vendo}
        onFechar={() => setVendo(null)}
        numeroPedido={numeroPedido}
      />
    </div>
  );
}
