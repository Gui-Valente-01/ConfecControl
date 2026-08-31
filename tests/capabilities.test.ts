import { describe, expect, it } from "vitest";
import type { UserRole } from "@prisma/client";
import {
  CAPACIDADE_DA_ROTA,
  TODAS_AS_CAPACIDADES,
  capabilitiesOf,
  roleCanOpenRoute,
  roleHasCapability,
  type Capability,
} from "@/lib/capabilities";

const CARGOS: UserRole[] = ["ADMIN", "MANAGER", "PRODUCTION", "FINANCE", "SALES"];

describe("matriz de cargos", () => {
  it("o Dono pode tudo", () => {
    for (const capacidade of TODAS_AS_CAPACIDADES) {
      expect(roleHasCapability("ADMIN", capacidade), capacidade).toBe(true);
    }
  });

  it("todo cargo tem ao menos uma capacidade: cargo sem nada seria conta inutil", () => {
    for (const cargo of CARGOS) {
      expect(capabilitiesOf(cargo).length, cargo).toBeGreaterThan(0);
    }
  });

  it("a lista completa cobre a matriz inteira, sem capacidade orfa", () => {
    // Se alguem criar uma capacidade nova e esquecer da lista, o Dono deixaria
    // de te-la e nenhum teste perceberia. Este e o teste que percebe.
    const naMatriz = new Set<Capability>();
    for (const cargo of CARGOS) {
      for (const c of capabilitiesOf(cargo)) naMatriz.add(c);
    }
    for (const c of naMatriz) {
      expect(TODAS_AS_CAPACIDADES, `${c} fora de TODAS_AS_CAPACIDADES`).toContain(c);
    }
  });
});

// O bloco que o pedido do usuario exige explicitamente.
describe("Producao nao alcanca dinheiro, relatorio, configuracao nem fiscal", () => {
  const proibidas: Capability[] = [
    "finance.read",
    "finance.write",
    "reports.read",
    "reports.export",
    "settings.write",
    "fiscal.read",
    "fiscal.issue",
    "fiscal.cancel",
  ];

  for (const capacidade of proibidas) {
    it(`Producao NAO tem ${capacidade}`, () => {
      expect(roleHasCapability("PRODUCTION", capacidade)).toBe(false);
    });
  }

  it("mas continua enxergando o que precisa para produzir", () => {
    expect(roleHasCapability("PRODUCTION", "orders.read")).toBe(true);
    expect(roleHasCapability("PRODUCTION", "stock.read")).toBe(true);
    expect(roleHasCapability("PRODUCTION", "bancada.use")).toBe(true);
  });

  it("imprime a ficha, porque a oficina precisa do papel", () => {
    // O papel sai sem valores: quem decide isso e finance.read, na tela.
    expect(roleHasCapability("PRODUCTION", "orders.print")).toBe(true);
    expect(roleHasCapability("PRODUCTION", "finance.read")).toBe(false);
  });

  it("nao mexe em pedido, estoque nem producao", () => {
    expect(roleHasCapability("PRODUCTION", "orders.write")).toBe(false);
    expect(roleHasCapability("PRODUCTION", "stock.write")).toBe(false);
    expect(roleHasCapability("PRODUCTION", "production.write")).toBe(false);
  });

  it("nao ve o desempenho dos colegas", () => {
    expect(roleHasCapability("PRODUCTION", "bancada.history")).toBe(false);
  });
});

describe("Vendas", () => {
  it("nao ve dinheiro nem relatorio, e por isso tambem nao exporta", () => {
    expect(roleHasCapability("SALES", "finance.read")).toBe(false);
    expect(roleHasCapability("SALES", "reports.read")).toBe(false);
    expect(roleHasCapability("SALES", "reports.export")).toBe(false);
  });

  it("cuida de cliente, peca e pedido", () => {
    expect(roleHasCapability("SALES", "clients.write")).toBe(true);
    expect(roleHasCapability("SALES", "products.write")).toBe(true);
    expect(roleHasCapability("SALES", "orders.write")).toBe(true);
  });

  it("nao emite nota", () => {
    expect(roleHasCapability("SALES", "fiscal.issue")).toBe(false);
    expect(roleHasCapability("SALES", "fiscal.read")).toBe(false);
  });
});

describe("Gerente", () => {
  it("nao mexe em funcionario nem esvazia a lixeira de vez", () => {
    expect(roleHasCapability("MANAGER", "team.write")).toBe(false);
    expect(roleHasCapability("MANAGER", "trash.purge")).toBe(false);
  });

  it("no fiscal apenas acompanha", () => {
    expect(roleHasCapability("MANAGER", "fiscal.read")).toBe(true);
    expect(roleHasCapability("MANAGER", "fiscal.issue")).toBe(false);
    expect(roleHasCapability("MANAGER", "fiscal.cancel")).toBe(false);
  });

  it("restaura da lixeira, porque e ele quem apaga material e terceirizada", () => {
    expect(roleHasCapability("MANAGER", "trash.restore")).toBe(true);
  });
});

describe("Financeiro", () => {
  it("e quem emite e cancela nota, junto do Dono", () => {
    for (const capacidade of ["fiscal.read", "fiscal.issue", "fiscal.cancel"] as Capability[]) {
      expect(roleHasCapability("FINANCE", capacidade), capacidade).toBe(true);
      expect(roleHasCapability("ADMIN", capacidade), capacidade).toBe(true);
    }
  });

  it("exporta relatorio, que e trabalho dele", () => {
    expect(roleHasCapability("FINANCE", "reports.export")).toBe(true);
  });

  it("nao mexe em producao, estoque nem configuracao", () => {
    expect(roleHasCapability("FINANCE", "production.write")).toBe(false);
    expect(roleHasCapability("FINANCE", "stock.write")).toBe(false);
    expect(roleHasCapability("FINANCE", "settings.write")).toBe(false);
  });
});

describe("emitir e cancelar nota", () => {
  it("so Dono e Financeiro", () => {
    const podem = CARGOS.filter((c) => roleHasCapability(c, "fiscal.issue"));
    expect(podem.sort()).toEqual(["ADMIN", "FINANCE"]);

    const cancelam = CARGOS.filter((c) => roleHasCapability(c, "fiscal.cancel"));
    expect(cancelam.sort()).toEqual(["ADMIN", "FINANCE"]);
  });
});

describe("exportar relatorio", () => {
  it("so quem tambem pode ler relatorio: exportar e ler em arquivo", () => {
    // Era exatamente aqui que estava o furo: a rota de export nao perguntava
    // nada, e a Producao baixava o financeiro inteiro digitando a URL.
    for (const cargo of CARGOS) {
      if (!roleHasCapability(cargo, "reports.export")) continue;
      expect(roleHasCapability(cargo, "reports.read"), cargo).toBe(true);
    }
  });

  it("Producao nao exporta", () => {
    expect(roleHasCapability("PRODUCTION", "reports.export")).toBe(false);
  });
});

describe("rotas", () => {
  it("cada rota protegida exige a capacidade correspondente", () => {
    for (const [rota, capacidade] of Object.entries(CAPACIDADE_DA_ROTA)) {
      for (const cargo of CARGOS) {
        expect(roleCanOpenRoute(cargo, rota), `${cargo} em ${rota}`).toBe(
          roleHasCapability(cargo, capacidade),
        );
      }
    }
  });

  it("rota do nucleo fica liberada para quem esta logado", () => {
    for (const cargo of CARGOS) {
      expect(roleCanOpenRoute(cargo, "/"), cargo).toBe(true);
      expect(roleCanOpenRoute(cargo, "/avisos"), cargo).toBe(true);
      expect(roleCanOpenRoute(cargo, "/conta"), cargo).toBe(true);
    }
  });

  it("Producao nao abre financeiro, relatorio, configuracao nem fiscal", () => {
    for (const rota of ["/financeiro", "/relatorios", "/configuracoes", "/fiscal", "/usuarios"]) {
      expect(roleCanOpenRoute("PRODUCTION", rota), rota).toBe(false);
    }
  });
});
