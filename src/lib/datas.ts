// Datas no horário de Brasília. Sem banco e sem React, para permitir teste.
//
// O servidor da Vercel roda em UTC. Toda conta de "hoje", "fim do dia",
// "este mês" feita com getDate()/getMonth() saía no dia de Londres, e não no da
// confecção: o pedido virava "atrasado" às 9h do próprio dia do prazo, e um
// pedido lançado às 22h do dia 31 entrava no relatório do mês seguinte.
//
// Aqui o calendário é sempre o de Brasília, rode o código onde rodar.
//
// O Brasil não tem horário de verão desde 2019, então o fuso é fixo em UTC-3.
// Fixar evita depender da tabela de fusos do ambiente (Node sem ICU completo
// devolveria UTC calado) e deixa a conta idêntica no servidor e no navegador.

export const FUSO_BRASILIA = "America/Sao_Paulo";

const OFFSET_HORAS = 3; // Brasília = UTC-3
const DIA_MS = 86_400_000;

export type Dia = { ano: number; mes: number; dia: number };

/** O dia do calendário de Brasília em que este instante cai. */
export function diaEmBrasilia(data: Date): Dia {
  const deslocado = new Date(data.getTime() - OFFSET_HORAS * 3_600_000);
  return { ano: deslocado.getUTCFullYear(), mes: deslocado.getUTCMonth() + 1, dia: deslocado.getUTCDate() };
}

/** Meia-noite de Brasília do dia informado. Aceita dia/mês fora da faixa (32 vira o dia 1 seguinte). */
export function inicioDoDia({ ano, mes, dia }: Dia): Date {
  return new Date(Date.UTC(ano, mes - 1, dia, OFFSET_HORAS, 0, 0, 0));
}

/** Último milissegundo do dia em Brasília. */
export function fimDoDia(d: Dia): Date {
  return new Date(inicioDoDia({ ...d, dia: d.dia + 1 }).getTime() - 1);
}

/** "2026-09-14" -> dia. Null quando o texto não é uma data de verdade. */
export function lerDiaIso(texto: string | null | undefined): Dia | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto ?? "").trim());
  if (!m) return null;
  const d = { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
  // 2026-02-31 não existe: o Date "corrigiria" para 3 de março sem avisar.
  const volta = diaEmBrasilia(inicioDoDia(d));
  if (volta.ano !== d.ano || volta.mes !== d.mes || volta.dia !== d.dia) return null;
  return d;
}

/** Dia -> "2026-09-14", o formato do <input type="date">. */
export function diaIso({ ano, mes, dia }: Dia): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Quantos dias de calendário (Brasília) separam dois instantes. Positivo se `ate` vem depois. */
export function diasDeCalendario(de: Date, ate: Date): number {
  return Math.round((inicioDoDia(diaEmBrasilia(ate)).getTime() - inicioDoDia(diaEmBrasilia(de)).getTime()) / DIA_MS);
}

/**
 * O prazo já venceu?
 *
 * Prazo é um DIA, não um horário: entregar às 18h do dia combinado é no prazo.
 * Só vence quando o dia do prazo termina em Brasília.
 */
export function prazoVencido(prazo: Date | null, agora: Date = new Date()): boolean {
  if (!prazo) return false;
  return agora.getTime() > fimDoDia(diaEmBrasilia(prazo)).getTime();
}

/** Quantos dias o prazo está vencido. Zero no próprio dia do prazo e antes dele. */
export function diasDeAtraso(prazo: Date | null, agora: Date = new Date()): number {
  if (!prazo) return 0;
  return Math.max(0, diasDeCalendario(prazo, agora));
}

// ---------------------------------------------------------------------------
// Períodos prontos do relatório
// ---------------------------------------------------------------------------

export type Preset = "semana" | "mes" | "mes-passado";

export const PRESETS: { chave: Preset; rotulo: string }[] = [
  { chave: "semana", rotulo: "Esta semana" },
  { chave: "mes", rotulo: "Este mês" },
  { chave: "mes-passado", rotulo: "Mês passado" },
];

export function ePreset(valor: unknown): valor is Preset {
  return valor === "semana" || valor === "mes" || valor === "mes-passado";
}

export type Periodo = { de: Date; ate: Date };

/**
 * O período de um botão rápido.
 *
 * Semana começa na segunda-feira, que é como o comércio conta a semana de
 * trabalho. Os períodos correntes vão até o fim de hoje, e não até "agora":
 * assim o campo "Até" mostra o dia de hoje e nada lançado hoje fica de fora.
 */
export function periodoDoPreset(preset: Preset, agora: Date = new Date()): Periodo {
  const hoje = diaEmBrasilia(agora);

  if (preset === "semana") {
    // getUTCDay do meio-dia de Brasília: 0 = domingo ... 6 = sábado.
    const diaDaSemana = new Date(inicioDoDia(hoje).getTime() + 12 * 3_600_000).getUTCDay();
    const voltar = (diaDaSemana + 6) % 7; // segunda = 0, domingo = 6
    return { de: inicioDoDia({ ...hoje, dia: hoje.dia - voltar }), ate: fimDoDia(hoje) };
  }

  if (preset === "mes") {
    return { de: inicioDoDia({ ...hoje, dia: 1 }), ate: fimDoDia(hoje) };
  }

  // Mês passado: do dia 1 ao último dia do mês anterior. O "dia 0" do mês
  // atual é o último dia do anterior, e o Date resolve 28, 29, 30 ou 31.
  const ultimoDiaDoAnterior = diaEmBrasilia(inicioDoDia({ ...hoje, dia: 0 }));
  return {
    de: inicioDoDia({ ...ultimoDiaDoAnterior, dia: 1 }),
    ate: fimDoDia(ultimoDiaDoAnterior),
  };
}
