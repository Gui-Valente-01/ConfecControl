import { FileText, ImageOff, Palette, Paperclip } from "lucide-react";
import { classificarAnexo, comoAbrir, rotuloAnexo, separarAnexos, type Anexo } from "@/lib/anexos";

// O modelo que o funcionário precisa ver antes de produzir.
//
// A arte chega de todo jeito: foto do celular, PDF, .cdr do Corel, .ai do
// Illustrator. Foto aparece na tela; o que o navegador não abre vira um cartão
// dizendo o que é e como abrir — em vez de um quadrado quebrado, que era o que
// acontecia quando um PDF caía dentro de uma <img>.

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
  const { imagens, arquivos } = separarAnexos(anexos);

  if (anexos.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] px-3 py-2.5 text-xs text-[#8a9890]">
        <ImageOff size={14} aria-hidden="true" />
        Sem foto do modelo. Peça a arte a quem fez o pedido antes de começar.
      </p>
    );
  }

  const imagensVisiveis = compacto ? imagens.slice(0, 3) : imagens;
  const sobrando = imagens.length - imagensVisiveis.length;

  return (
    <div className="space-y-2">
      {imagensVisiveis.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {imagensVisiveis.map((anexo) => (
            <li key={anexo.id}>
              {/* Abre em aba nova, em tamanho cheio: na bancada a pessoa
                  precisa dar zoom na arte para conferir detalhe. */}
              <a
                href={anexo.url}
                target="_blank"
                rel="noopener"
                title={`Ver ${anexo.name} em tamanho maior`}
                className="block overflow-hidden rounded-lg border border-[#d9e1dd] transition hover:border-[#087f7d]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={anexo.url}
                  alt={`Modelo do pedido ${numeroPedido}: ${anexo.name}`}
                  className={compacto ? "size-20 object-cover" : "h-40 w-40 object-cover"}
                />
              </a>
            </li>
          ))}
          {sobrando > 0 ? (
            <li className="flex size-20 items-center justify-center rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] text-xs font-semibold text-[#66756d]">
              +{sobrando}
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
                <a
                  href={anexo.url}
                  target="_blank"
                  rel="noopener"
                  className="flex min-h-11 items-center gap-2.5 rounded-lg border border-[#d9e1dd] bg-white px-2.5 py-2 transition hover:border-[#087f7d] hover:bg-[#f8faf9]"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#eef4f1] text-[#405047]">
                    <Icone size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#405047]">{anexo.name}</span>
                    <span className="block text-xs text-[#8a9890]">
                      {rotuloAnexo(anexo)} · {comoAbrir(anexo)}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      {imagens.length === 0 ? (
        <p className="text-xs text-[#8a9890]">
          Nenhum arquivo dá para ver aqui na tela. Baixe acima para abrir no programa certo.
        </p>
      ) : null}
    </div>
  );
}
