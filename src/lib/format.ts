export function centsToCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function currencyToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
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
