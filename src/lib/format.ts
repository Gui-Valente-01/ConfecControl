// Dinheiro sempre com centavos. Arredondar na exibição escondia diferença do
// cliente: R$ 43,25 impresso como "R$ 43" vira discussão na hora da entrega.
export function centsToCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Texto digitado -> centavos inteiros.
 *
 * O dono digita dos dois jeitos, e os dois têm que funcionar: "3,25" e "3.25"
 * são R$ 3,25. Antes o ponto era sempre tratado como separador de milhar, então
 * "3.25" virava R$ 325 — erro de cem vezes no valor cobrado.
 *
 * A regra segue o costume brasileiro de escrita:
 * - com vírgula, ela é o decimal e os pontos são milhar ("1.234,56");
 * - só com ponto, ele é decimal se sobrarem 1 ou 2 dígitos ("3.25", "10.5");
 * - ponto com 3 dígitos depois é milhar ("1.234"), como se escreve de verdade;
 * - vários pontos são sempre milhar ("1.234.567").
 */
export function currencyToCents(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;

  const negative = cleaned.trimStart().startsWith("-");
  const digitsAndSeparators = cleaned.replace(/-/g, "");

  let normalized: string;
  if (digitsAndSeparators.includes(",")) {
    // Vírgula manda: o que vem depois dela é centavo.
    normalized = digitsAndSeparators.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = digitsAndSeparators.split(".");
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    const pontoEhDecimal = parts.length === 2 && last.length > 0 && last.length <= 2;
    normalized = pontoEhDecimal ? digitsAndSeparators : digitsAndSeparators.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) * (negative ? -1 : 1);
}

// Dinheiro digitado pelo usuário nunca é negativo neste sistema: preço, custo e
// entrada. Um sinal de menos digitado por engano vira zero, em vez de contaminar
// em silêncio o total do pedido e a margem do relatório.
export function moneyToCents(value: string) {
  return Math.max(0, currencyToCents(value));
}

// Centavos -> string em reais para preencher inputs de edição (ex.: "120,00").
export function centsToInput(value: number) {
  return (value / 100).toFixed(2).replace(".", ",");
}

export function dateInputToDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatShortDate(date: Date | null) {
  if (!date) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatLongDate(date: Date | null) {
  if (!date) return "Não definido";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Converte uma data para o formato aceito por <input type="date"> (yyyy-mm-dd).
export function dateToInputValue(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Valor de serviço aceita conta de multiplicação: "4x100" e "4*100" viram 400,00.
// Serigrafia cobra por peça ("R$ 4 a estampa, 100 camisetas"), e obrigar o dono a
// fazer a conta de cabeça era o preço de manter o campo com dois campos só.
export function priceExpressionToCents(value: string) {
  const parts = value.split(/[x*]/i);
  if (parts.length === 2) {
    const right = parts[1].replace(",", ".").trim();
    const quantity = Number(right);
    // Quantidade zero é conta válida e dá zero — sem isso "4x0" viraria R$ 40,
    // porque o "x" seria removido e sobraria "40". Já o campo pela metade
    // ("4x", quem ainda está digitando) cai na leitura simples do valor.
    if (right !== "" && Number.isFinite(quantity) && quantity >= 0) {
      return Math.round(moneyToCents(parts[0]) * quantity);
    }
  }
  return moneyToCents(value);
}
