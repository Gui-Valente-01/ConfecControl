import { describe, expect, it } from "vitest";
import {
  agruparPendencias,
  apenasDigitos,
  conferirDados,
  montarPedidoDeEmissao,
  type DadosDaEmpresa,
  type DadosDaPeca,
  type DadosDoCliente,
  type ItemDoPedido,
} from "@/lib/fiscal/montar-pedido";

const empresaCompleta: DadosDaEmpresa = {
  name: "Costura Viva",
  document: "12.345.678/0001-90",
  razaoSocial: "Costura Viva Confeccoes LTDA",
  nomeFantasia: "Costura Viva",
  inscricaoEstadual: "1234567890",
  regimeTributario: "1",
  logradouro: "Rua das Agulhas",
  numero: "245",
  complemento: null,
  bairro: "Centro",
  codigoMunicipio: "4106902",
  municipio: "Curitiba",
  uf: "pr",
  cep: "80000-000",
};

const clienteCompleto: DadosDoCliente = {
  id: "cli-1",
  name: "Escola Girassol",
  document: "08.111.222/0001-33",
  inscricaoEstadual: null,
  indicadorIe: "9",
  email: "compras@girassol.edu.br",
  logradouro: "Rua das Flores",
  numero: "10",
  complemento: null,
  bairro: "Centro",
  codigoMunicipio: "4106902",
  municipio: "Curitiba",
  uf: "PR",
  cep: "80010-000",
};

const pecaCompleta: DadosDaPeca = {
  id: "p1",
  name: "Uniforme Escolar",
  ncm: "61091000",
  cest: null,
  unidadeComercial: "UN",
  origem: "0",
  cfopSugerido: "5102",
};

const itens: ItemDoPedido[] = [
  { description: "Uniforme tam 10", quantity: 30, unitPriceInCents: 3_990, totalPriceInCents: 119_700, productId: "p1" },
];

const pecas = new Map([["p1", pecaCompleta]]);

describe("conferirDados", () => {
  it("cadastro completo nao gera pendencia", () => {
    expect(conferirDados({ empresa: empresaCompleta, cliente: clienteCompleto, itens, pecas })).toEqual([]);
  });

  it("lista TODAS as pendencias de uma vez, e nao a primeira", () => {
    // Mandar preencher um campo, tentar de novo e descobrir outro faltando e o
    // caminho mais rapido para a pessoa desistir da nota.
    const empresaVazia = { ...empresaCompleta, document: null, inscricaoEstadual: null, cep: null };
    const r = conferirDados({ empresa: empresaVazia, cliente: clienteCompleto, itens, pecas });
    expect(r.length).toBe(3);
    expect(r.map((p) => p.o_que).join(" ")).toMatch(/CNPJ/);
    expect(r.map((p) => p.o_que).join(" ")).toMatch(/nscri/);
    expect(r.map((p) => p.o_que).join(" ")).toMatch(/CEP/);
  });

  it("cada pendencia diz onde resolver", () => {
    const r = conferirDados({
      empresa: { ...empresaCompleta, document: null },
      cliente: { ...clienteCompleto, cep: null },
      itens,
      pecas: new Map([["p1", { ...pecaCompleta, ncm: null }]]),
    });
    expect(r.find((p) => p.onde === "empresa")?.link).toBe("/configuracoes");
    expect(r.find((p) => p.onde === "cliente")?.link).toBe("/clientes/cli-1");
    expect(r.find((p) => p.onde === "peca")?.link).toBe("/produtos");
  });

  it("peca sem NCM aparece UMA vez, mesmo com dez linhas iguais", () => {
    const dezLinhas = Array.from({ length: 10 }, (_, i) => ({ ...itens[0], description: `linha ${i}` }));
    const r = conferirDados({
      empresa: empresaCompleta,
      cliente: clienteCompleto,
      itens: dezLinhas,
      pecas: new Map([["p1", { ...pecaCompleta, ncm: null }]]),
    });
    expect(r.filter((p) => p.o_que.includes("NCM"))).toHaveLength(1);
  });

  it("item avulso, sem peca cadastrada, e apontado: nao ha de onde tirar o NCM", () => {
    const r = conferirDados({
      empresa: empresaCompleta,
      cliente: clienteCompleto,
      itens: [{ ...itens[0], productId: null }],
      pecas,
    });
    expect(r.some((p) => p.o_que.includes("não está ligado"))).toBe(true);
  });

  it("pedido sem item nao emite nota", () => {
    const r = conferirDados({ empresa: empresaCompleta, cliente: clienteCompleto, itens: [], pecas });
    expect(r.some((p) => p.onde === "pedido")).toBe(true);
  });

  it("cobra o regime tributario mandando perguntar ao contador", () => {
    const r = conferirDados({
      empresa: { ...empresaCompleta, regimeTributario: null },
      cliente: clienteCompleto,
      itens,
      pecas,
    });
    expect(r.some((p) => /contador/i.test(p.o_que))).toBe(true);
  });
});

describe("montarPedidoDeEmissao", () => {
  const base = {
    empresa: empresaCompleta,
    cliente: clienteCompleto,
    itens,
    pecas,
    idempotencyKey: "k1",
    referenciaInterna: "doc-1",
  };

  it("tira a pontuacao de CNPJ, CEP e municipio", () => {
    const p = montarPedidoDeEmissao({ ...base, ambiente: "PRODUCAO" });
    expect(p.emitente.cnpj).toBe("12345678000190");
    expect(p.emitente.endereco.cep).toBe("80000000");
    expect(p.destinatario.documento).toBe("08111222000133");
  });

  it("a UF vai em maiuscula", () => {
    const p = montarPedidoDeEmissao({ ...base, ambiente: "PRODUCAO" });
    expect(p.emitente.endereco.uf).toBe("PR");
  });

  it("em HOMOLOGACAO o destinatario recebe a razao social de teste da SEFAZ", () => {
    // E a forma de deixar explicito, no proprio documento, que aquilo e teste.
    const p = montarPedidoDeEmissao({ ...base, ambiente: "HOMOLOGACAO" });
    expect(p.destinatario.nome).toMatch(/HOMOLOGACAO/);
    expect(p.destinatario.nome).not.toBe(clienteCompleto.name);
  });

  it("em PRODUCAO vai o nome real do cliente", () => {
    const p = montarPedidoDeEmissao({ ...base, ambiente: "PRODUCAO" });
    expect(p.destinatario.nome).toBe("Escola Girassol");
  });

  it("o total sai da soma dos itens, e nao de um campo solto", () => {
    const p = montarPedidoDeEmissao({ ...base, ambiente: "HOMOLOGACAO" });
    expect(p.totalInCents).toBe(119_700);
  });

  it("NAO inventa tributacao: o perfil e do contador", () => {
    const p = montarPedidoDeEmissao({ ...base, ambiente: "HOMOLOGACAO" });
    expect(p.itens[0].tributacao).toEqual({});
  });

  it("o CFOP vem da peca como sugestao, e viaja por item", () => {
    const p = montarPedidoDeEmissao({ ...base, ambiente: "HOMOLOGACAO" });
    expect(p.itens[0].cfop).toBe("5102");
  });

  it("cliente sem indicador de IE assume nao contribuinte, o caso comum", () => {
    const p = montarPedidoDeEmissao({
      ...base,
      cliente: { ...clienteCompleto, indicadorIe: null },
      ambiente: "HOMOLOGACAO",
    });
    expect(p.destinatario.indicadorIe).toBe("9");
  });
});

describe("agruparPendencias", () => {
  it("agrupa por tela e some com grupo vazio", () => {
    const grupos = agruparPendencias([
      { o_que: "CNPJ", onde: "empresa" },
      { o_que: "CEP", onde: "empresa" },
      { o_que: "NCM", onde: "peca" },
    ]);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].onde).toBe("empresa");
    expect(grupos[0].itens).toHaveLength(2);
  });

  it("lista vazia nao gera grupo nenhum", () => {
    expect(agruparPendencias([])).toEqual([]);
  });
});

describe("apenasDigitos", () => {
  it("limpa pontuacao e aceita nulo", () => {
    expect(apenasDigitos("12.345.678/0001-90")).toBe("12345678000190");
    expect(apenasDigitos(null)).toBe("");
  });
});
