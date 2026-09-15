import { describe, expect, it } from "vitest";
import {
  diaEmBrasilia,
  diaIso,
  diasDeAtraso,
  diasDeCalendario,
  fimDoDia,
  inicioDoDia,
  lerDiaIso,
  periodoDoPreset,
  prazoVencido,
} from "@/lib/datas";

// Instantes escritos no horário de Brasília: o teste vale igual rodando em UTC
// (Vercel) ou em Brasília (máquina do dono).
const brt = (texto: string) => new Date(`${texto}-03:00`);
const iso = (d: Date) => d.toISOString();

describe("diaEmBrasilia", () => {
  it("22h30 do dia 31 em Brasilia ainda e dia 31, mesmo sendo dia 1 em UTC", () => {
    const d = brt("2026-08-31T22:30:00");
    expect(d.getUTCDate()).toBe(1);
    expect(diaEmBrasilia(d)).toEqual({ ano: 2026, mes: 8, dia: 31 });
  });

  it("meia-noite em ponto ja e o dia novo", () => {
    expect(diaEmBrasilia(brt("2026-09-01T00:00:00"))).toEqual({ ano: 2026, mes: 9, dia: 1 });
  });
});

describe("inicioDoDia / fimDoDia", () => {
  it("comeca a meia-noite e termina no ultimo milissegundo do dia", () => {
    const dia = { ano: 2026, mes: 9, dia: 14 };
    expect(iso(inicioDoDia(dia))).toBe(iso(brt("2026-09-14T00:00:00")));
    expect(iso(fimDoDia(dia))).toBe(iso(brt("2026-09-14T23:59:59.999")));
  });

  it("dia fora da faixa vira o dia certo (dia 0 = ultimo do mes anterior)", () => {
    expect(diaEmBrasilia(inicioDoDia({ ano: 2026, mes: 3, dia: 0 }))).toEqual({ ano: 2026, mes: 2, dia: 28 });
    expect(diaEmBrasilia(inicioDoDia({ ano: 2028, mes: 3, dia: 0 }))).toEqual({ ano: 2028, mes: 2, dia: 29 });
  });
});

describe("lerDiaIso", () => {
  it("le a data do campo de data", () => {
    expect(lerDiaIso("2026-09-14")).toEqual({ ano: 2026, mes: 9, dia: 14 });
    expect(diaIso({ ano: 2026, mes: 9, dia: 4 })).toBe("2026-09-04");
  });

  it("recusa data que nao existe em vez de pular para o mes seguinte", () => {
    expect(lerDiaIso("2026-02-31")).toBeNull();
    expect(lerDiaIso("2026-13-01")).toBeNull();
  });

  it("recusa texto que nao e data", () => {
    expect(lerDiaIso("")).toBeNull();
    expect(lerDiaIso(null)).toBeNull();
    expect(lerDiaIso("ontem")).toBeNull();
    expect(lerDiaIso("2026-9-1")).toBeNull();
  });
});

describe("prazoVencido", () => {
  // O prazo antigo ficou gravado ao meio-dia UTC (9h em Brasília); o novo, ao
  // meio-dia de Brasília. Os dois têm que se comportar igual.
  const prazos = [new Date("2026-09-14T12:00:00Z"), new Date("2026-09-14T15:00:00Z")];

  it("no proprio dia do prazo nao esta vencido, nem de manha nem a noite", () => {
    for (const prazo of prazos) {
      expect(prazoVencido(prazo, brt("2026-09-14T10:00:00"))).toBe(false);
      expect(prazoVencido(prazo, brt("2026-09-14T23:59:59"))).toBe(false);
    }
  });

  it("vence quando o dia do prazo termina", () => {
    for (const prazo of prazos) {
      expect(prazoVencido(prazo, brt("2026-09-15T00:00:01"))).toBe(true);
    }
  });

  it("sem prazo nunca vence", () => {
    expect(prazoVencido(null, brt("2030-01-01T00:00:00"))).toBe(false);
  });
});

describe("diasDeAtraso / diasDeCalendario", () => {
  const prazo = new Date("2026-09-14T12:00:00Z");

  it("zero no dia do prazo e antes dele", () => {
    expect(diasDeAtraso(prazo, brt("2026-09-14T22:00:00"))).toBe(0);
    expect(diasDeAtraso(prazo, brt("2026-09-10T08:00:00"))).toBe(0);
  });

  it("um dia a partir da meia-noite seguinte, dez dias dez dias depois", () => {
    expect(diasDeAtraso(prazo, brt("2026-09-15T00:30:00"))).toBe(1);
    expect(diasDeAtraso(prazo, brt("2026-09-24T18:00:00"))).toBe(10);
  });

  it("conta dias de calendario, nao blocos de 24h", () => {
    expect(diasDeCalendario(brt("2026-09-14T23:50:00"), brt("2026-09-15T00:10:00"))).toBe(1);
    expect(diasDeCalendario(brt("2026-09-14T00:10:00"), brt("2026-09-14T23:50:00"))).toBe(0);
  });
});

describe("periodoDoPreset", () => {
  it("esta semana comeca na segunda e vai ate o fim de hoje", () => {
    // 16/09/2026 é quarta-feira.
    const p = periodoDoPreset("semana", brt("2026-09-16T15:00:00"));
    expect(iso(p.de)).toBe(iso(brt("2026-09-14T00:00:00")));
    expect(iso(p.ate)).toBe(iso(brt("2026-09-16T23:59:59.999")));
  });

  it("na segunda-feira a semana e so o dia de hoje", () => {
    const p = periodoDoPreset("semana", brt("2026-09-14T08:00:00"));
    expect(iso(p.de)).toBe(iso(brt("2026-09-14T00:00:00")));
  });

  it("no domingo a noite a semana ainda e a que comecou na segunda anterior", () => {
    // 23h50 de domingo em Brasília já é segunda-feira em UTC.
    const p = periodoDoPreset("semana", brt("2026-09-13T23:50:00"));
    expect(iso(p.de)).toBe(iso(brt("2026-09-07T00:00:00")));
    expect(iso(p.ate)).toBe(iso(brt("2026-09-13T23:59:59.999")));
  });

  it("este mes comeca no dia 1 de Brasilia, e nao as 21h do dia anterior", () => {
    const p = periodoDoPreset("mes", brt("2026-09-16T15:00:00"));
    expect(iso(p.de)).toBe(iso(brt("2026-09-01T00:00:00")));
    expect(iso(p.ate)).toBe(iso(brt("2026-09-16T23:59:59.999")));
  });

  it("as 22h do ultimo dia do mes, este mes ainda e o mes que esta acabando", () => {
    const p = periodoDoPreset("mes", brt("2026-08-31T22:00:00"));
    expect(iso(p.de)).toBe(iso(brt("2026-08-01T00:00:00")));
  });

  it("mes passado vai do dia 1 ao ultimo dia do mes anterior", () => {
    const p = periodoDoPreset("mes-passado", brt("2026-09-16T15:00:00"));
    expect(iso(p.de)).toBe(iso(brt("2026-08-01T00:00:00")));
    expect(iso(p.ate)).toBe(iso(brt("2026-08-31T23:59:59.999")));
  });

  it("mes passado em janeiro e dezembro do ano anterior", () => {
    const p = periodoDoPreset("mes-passado", brt("2027-01-05T10:00:00"));
    expect(iso(p.de)).toBe(iso(brt("2026-12-01T00:00:00")));
    expect(iso(p.ate)).toBe(iso(brt("2026-12-31T23:59:59.999")));
  });

  it("mes passado em marco de ano bissexto termina em 29 de fevereiro", () => {
    const p = periodoDoPreset("mes-passado", brt("2028-03-10T10:00:00"));
    expect(iso(p.ate)).toBe(iso(brt("2028-02-29T23:59:59.999")));
  });
});
