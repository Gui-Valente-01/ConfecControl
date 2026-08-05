// Contas do visualizador de imagem. Sem React e sem DOM, para permitir teste.
//
// O funcionário precisa aproximar a arte para conferir detalhe de bordado ou
// posição de estampa. Antes o clique abria o arquivo em outra aba: funcionava,
// mas tirava a pessoa do sistema, e no celular ela voltava perdida.

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 6;
const PASSO = 0.5;

/**
 * Mantém o zoom entre o mínimo e o máximo.
 *
 * NaN volta para o mínimo, porque não dá para clampar o que não é número — e
 * NaN no transform faria a imagem sumir da tela. Infinito não precisa desse
 * cuidado: o Math.min já o traz para o máximo.
 */
export function limitarZoom(valor: number): number {
  if (Number.isNaN(valor)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, valor));
}

/** Um passo de zoom para mais ou para menos. */
export function proximoZoom(atual: number, direcao: "mais" | "menos"): number {
  return limitarZoom(atual + (direcao === "mais" ? PASSO : -PASSO));
}

export type Deslocamento = { x: number; y: number };

/**
 * Impede de arrastar a imagem para fora da vista.
 *
 * Sem isto, dois arrastos e a arte some da tela — e a pessoa acha que quebrou.
 * A folga é a metade do que sobra da imagem ampliada para cada lado; em zoom 1
 * não sobra nada, então nem arrasta.
 */
export function limitarDeslocamento(
  deslocamento: Deslocamento,
  escala: number,
  caixa: { largura: number; altura: number },
): Deslocamento {
  const folgaX = Math.max(0, (caixa.largura * escala - caixa.largura) / 2);
  const folgaY = Math.max(0, (caixa.altura * escala - caixa.altura) / 2);
  return {
    x: Math.min(folgaX, Math.max(-folgaX, deslocamento.x)),
    y: Math.min(folgaY, Math.max(-folgaY, deslocamento.y)),
  };
}

/** Voltar ao início: usado ao trocar de imagem e ao fechar. */
export const SEM_DESLOCAMENTO: Deslocamento = { x: 0, y: 0 };

/**
 * Próxima imagem da lista, dando a volta no fim.
 *
 * Dar a volta é o que a pessoa espera de uma galeria: chegou na última, a seta
 * seguinte leva de novo à primeira, em vez de simplesmente não fazer nada.
 */
export function indiceVizinho(indice: number, total: number, direcao: 1 | -1): number {
  if (total <= 0) return 0;
  return (indice + direcao + total) % total;
}

/** Zoom já está no limite? A tela usa para desligar o botão. */
export function noLimite(escala: number, direcao: "mais" | "menos"): boolean {
  return direcao === "mais" ? escala >= ZOOM_MAX : escala <= ZOOM_MIN;
}

/** Texto do nível de zoom, para quem não enxerga a diferença visual. */
export function rotuloZoom(escala: number): string {
  return `${Math.round(escala * 100)}%`;
}
