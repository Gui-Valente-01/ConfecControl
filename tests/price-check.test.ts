import { describe, expect, it } from "vitest";
import { describeAtypicalPrices, findAtypicalPrices } from "@/lib/price-check";

// Boné trucker: preço cadastrado R$ 45,00.
const REFERENCIA = 4500;
const bone = (typedInCents: number) => ({ label: "Boné trucker", typedInCents, referenceInCents: REFERENCIA });

describe("findAtypicalPrices", () => {
  it("pega a virgula esquecida: 4500,00 onde o preco e 45,00", () => {
    const [achado] = findAtypicalPrices([bone(450000)]);
    expect(achado.direction).toBe("acima");
    expect(achado.times).toBe(100);
  });

  it("pega a virgula sobrando: 0,45 onde o preco e 45,00", () => {
    const [achado] = findAtypicalPrices([bone(45)]);
    expect(achado.direction).toBe("abaixo");
  });

  it("nao reclama do preco igual", () => {
    expect(findAtypicalPrices([bone(4500)])).toHaveLength(0);
  });

  it("nao reclama de desconto e acrescimo de rotina", () => {
    expect(findAtypicalPrices([bone(2250)])).toHaveLength(0); // metade
    expect(findAtypicalPrices([bone(9000)])).toHaveLength(0); // dobro
    expect(findAtypicalPrices([bone(1500)])).toHaveLength(0); // um terco
    expect(findAtypicalPrices([bone(18000)])).toHaveLength(0); // quatro vezes
  });

  it("reclama a partir de cinco vezes, para os dois lados", () => {
    expect(findAtypicalPrices([bone(22500)])).toHaveLength(1);
    expect(findAtypicalPrices([bone(900)])).toHaveLength(1);
  });

  it("sem preco cadastrado, nao opina", () => {
    expect(findAtypicalPrices([{ label: "Peça nova", typedInCents: 999999, referenceInCents: 0 }])).toHaveLength(0);
  });

  it("preco zerado passa: brinde e amostra existem", () => {
    expect(findAtypicalPrices([bone(0)])).toHaveLength(0);
  });

  it("olha cada item do pedido", () => {
    const achados = findAtypicalPrices([
      bone(4500),
      { label: "Camiseta", typedInCents: 350000, referenceInCents: 3500 },
      { label: "Boné aba reta", typedInCents: 5000, referenceInCents: 4800 },
    ]);
    expect(achados).toHaveLength(1);
    expect(achados[0].label).toBe("Camiseta");
  });

  it("fator invalido desliga a conferencia em vez de acusar tudo", () => {
    expect(findAtypicalPrices([bone(450000)], 1)).toHaveLength(0);
    expect(findAtypicalPrices([bone(450000)], 0)).toHaveLength(0);
  });
});

describe("describeAtypicalPrices", () => {
  it("sem achado, nao interrompe quem esta salvando", () => {
    expect(describeAtypicalPrices([])).toBeNull();
  });

  it("mostra o digitado e o cadastrado lado a lado", () => {
    const texto = describeAtypicalPrices(findAtypicalPrices([bone(450000)])) ?? "";
    expect(texto).toContain("Boné trucker");
    expect(texto).toContain("100x acima");
    expect(texto).toContain("Confira se a vírgula está no lugar certo");
    expect(texto.replace(/ /g, " ")).toContain("R$ 45,00");
  });

  it("usa o plural quando ha mais de um", () => {
    const texto =
      describeAtypicalPrices(
        findAtypicalPrices([bone(450000), { label: "Camiseta", typedInCents: 350000, referenceInCents: 3500 }]),
      ) ?? "";
    expect(texto).toContain("Alguns valores");
  });

  it("conta as vezes certo para o lado de baixo", () => {
    const texto = describeAtypicalPrices(findAtypicalPrices([bone(45)])) ?? "";
    expect(texto).toContain("100x abaixo");
  });
});
