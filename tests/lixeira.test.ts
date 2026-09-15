import { describe, expect, it } from "vitest";
import { descreverCascata, diasNaLixeira, eTipoLixeira, rotuloTipo, textoApagarDeVez } from "@/lib/lixeira";

describe("eTipoLixeira", () => {
  it("aceita os cinco cadastros que vao para a lixeira", () => {
    for (const t of ["cliente", "peca", "material", "terceirizada", "servico"]) {
      expect(eTipoLixeira(t)).toBe(true);
    }
  });

  it("recusa qualquer outra coisa vinda do formulario", () => {
    expect(eTipoLixeira("pedido")).toBe(false);
    expect(eTipoLixeira("")).toBe(false);
    expect(eTipoLixeira("Cliente")).toBe(false);
  });
});

describe("rotuloTipo", () => {
  it("usa a mesma palavra do resto do sistema", () => {
    expect(rotuloTipo("peca")).toBe("Peça");
    expect(rotuloTipo("terceirizada")).toBe("Terceirizada");
  });
});

describe("descreverCascata", () => {
  it("material e o caso grave: leva ficha tecnica e historico de estoque", () => {
    expect(descreverCascata("material")).toContain("histórico de estoque");
  });

  it("cliente e terceirizada nao levam nada junto", () => {
    expect(descreverCascata("cliente")).toBeNull();
    expect(descreverCascata("terceirizada")).toBeNull();
  });
});

describe("textoApagarDeVez", () => {
  it("diz o tipo, o nome e que nao tem volta", () => {
    const texto = textoApagarDeVez("cliente", "Bar do Zé");
    expect(texto).toContain('Apagar cliente "Bar do Zé" de vez?');
    expect(texto).toContain("não tem como voltar");
  });

  it("avisa o que some junto quando ha cascata", () => {
    const texto = textoApagarDeVez("material", "Malha PV preta");
    expect(texto).toContain("Malha PV preta");
    expect(texto).toContain("histórico de estoque");
  });
});

describe("diasNaLixeira", () => {
  // Horário de Brasília explícito: o teste vale igual no servidor (UTC).
  const brt = (t: string) => new Date(`${t}-03:00`);
  const agora = brt("2026-08-04T10:00:00"); // 4 de agosto de 2026

  it("apagado hoje conta zero, mesmo em horas diferentes", () => {
    expect(diasNaLixeira(brt("2026-08-04T01:00:00"), agora)).toBe(0);
    expect(diasNaLixeira(brt("2026-08-04T23:00:00"), agora)).toBe(0);
  });

  it("conta o dia inteiro, nao a diferenca de horas", () => {
    expect(diasNaLixeira(brt("2026-08-03T23:30:00"), agora)).toBe(1);
    expect(diasNaLixeira(brt("2026-07-28T08:00:00"), agora)).toBe(7);
  });

  it("data no futuro nao vira numero negativo", () => {
    expect(diasNaLixeira(brt("2026-08-10T00:00:00"), agora)).toBe(0);
  });
});
