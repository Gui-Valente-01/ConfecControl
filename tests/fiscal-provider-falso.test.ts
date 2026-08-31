import { describe, expect, it } from "vitest";
import { MARCADOR_DE_TESTE, ProvedorFiscalFalso, validarPedido } from "@/lib/fiscal/provider-falso";
import type { PedidoDeEmissao } from "@/lib/fiscal/provider";

function pedido(over: Partial<PedidoDeEmissao> = {}): PedidoDeEmissao {
  return {
    idempotencyKey: "chave-1",
    ambiente: "HOMOLOGACAO",
    referenciaInterna: "doc-1",
    observacoes: null,
    totalInCents: 100_000,
    emitente: {
      razaoSocial: "Costura Viva Confeccoes LTDA",
      nomeFantasia: "Costura Viva",
      cnpj: "12345678000190",
      inscricaoEstadual: "1234567890",
      regimeTributario: "1",
      endereco: {
        logradouro: "Rua das Agulhas",
        numero: "245",
        complemento: null,
        bairro: "Centro",
        codigoMunicipio: "4106902",
        municipio: "Curitiba",
        uf: "PR",
        cep: "80000000",
      },
    },
    destinatario: {
      nome: "Escola Municipal Girassol",
      documento: "08111222000133",
      inscricaoEstadual: null,
      indicadorIe: "9",
      email: "compras@girassol.edu.br",
      endereco: {
        logradouro: "Rua das Flores",
        numero: "10",
        complemento: null,
        bairro: "Centro",
        codigoMunicipio: "4106902",
        municipio: "Curitiba",
        uf: "PR",
        cep: "80010000",
      },
    },
    itens: [
      {
        descricao: "Uniforme Escolar",
        ncm: "61091000",
        cfop: "5102",
        unidade: "UN",
        quantidade: 100,
        valorUnitarioInCents: 1_000,
        valorTotalInCents: 100_000,
        origem: "0",
        tributacao: {},
      },
    ],
    ...over,
  };
}

describe("emissao", () => {
  it("emite e devolve chave, numero e protocolo", async () => {
    const provedor = new ProvedorFiscalFalso();
    const r = await provedor.emitirNFe(pedido());

    expect(r.situacao).toBe("autorizada");
    expect(r.chaveAcesso).toHaveLength(44);
    expect(r.numero).toBeGreaterThan(0);
    expect(r.protocolo).toBeTruthy();
  });

  it("a nota falsa se identifica como falsa", async () => {
    // Se este arquivo escapar para o contador, precisa ser obvio.
    const provedor = new ProvedorFiscalFalso();
    const r = await provedor.emitirNFe(pedido());
    expect(r.chaveAcesso?.startsWith(MARCADOR_DE_TESTE)).toBe(true);
    expect(r.mensagem).toMatch(/N[ÃA]O existe para a SEFAZ/i);
  });

  it("o ambiente padrao dos testes e homologacao", () => {
    expect(pedido().ambiente).toBe("HOMOLOGACAO");
  });
});

describe("idempotencia", () => {
  it("a mesma chave devolve a MESMA nota, e nao uma nova", async () => {
    const provedor = new ProvedorFiscalFalso();
    const primeira = await provedor.emitirNFe(pedido({ idempotencyKey: "duplo-clique" }));
    const segunda = await provedor.emitirNFe(pedido({ idempotencyKey: "duplo-clique" }));

    expect(segunda.chaveAcesso).toBe(primeira.chaveAcesso);
    expect(segunda.providerReference).toBe(primeira.providerReference);
    expect(segunda.protocolo).toBe(primeira.protocolo);
  });

  it("chaves diferentes geram notas diferentes", async () => {
    const provedor = new ProvedorFiscalFalso();
    const a = await provedor.emitirNFe(pedido({ idempotencyKey: "a" }));
    const b = await provedor.emitirNFe(pedido({ idempotencyKey: "b" }));
    expect(a.chaveAcesso).not.toBe(b.chaveAcesso);
  });

  it("uma rejeicao tambem e lembrada: reenviar nao vira autorizacao", async () => {
    const provedor = new ProvedorFiscalFalso();
    const semItens = pedido({ idempotencyKey: "vazia", itens: [], totalInCents: 0 });
    const primeira = await provedor.emitirNFe(semItens);
    const segunda = await provedor.emitirNFe(semItens);
    expect(primeira.situacao).toBe("rejeitada");
    expect(segunda.situacao).toBe("rejeitada");
  });
});

describe("validacao dos dados obrigatorios", () => {
  it("aponta o que falta, em portugues, sem inventar regra tributaria", () => {
    expect(validarPedido(pedido())).toBeNull();

    const semNcm = pedido();
    semNcm.itens[0].ncm = "";
    expect(validarPedido(semNcm)).toMatch(/NCM/);

    const semCfop = pedido();
    semCfop.itens[0].cfop = "";
    expect(validarPedido(semCfop)).toMatch(/CFOP/);
  });

  it("cobra os dados do emitente", () => {
    const semIe = pedido();
    semIe.emitente.inscricaoEstadual = "";
    expect(validarPedido(semIe)).toMatch(/inscri/i);

    const semMunicipio = pedido();
    semMunicipio.emitente.endereco.codigoMunicipio = "";
    expect(validarPedido(semMunicipio)).toMatch(/munic/i);
  });

  it("cobra os dados do destinatario", () => {
    const semDoc = pedido();
    semDoc.destinatario.documento = "";
    expect(validarPedido(semDoc)).toMatch(/CPF|CNPJ/);

    const semCep = pedido();
    semCep.destinatario.endereco.cep = "";
    expect(validarPedido(semCep)).toMatch(/CEP/);
  });

  it("nota sem item ou com total zerado nao passa", () => {
    expect(validarPedido(pedido({ itens: [] }))).toBeTruthy();
    expect(validarPedido(pedido({ totalInCents: 0 }))).toBeTruthy();
  });
});

describe("cancelamento", () => {
  it("exige justificativa de 15 caracteres, como a SEFAZ", async () => {
    const provedor = new ProvedorFiscalFalso();
    const curta = await provedor.cancelarNFe({
      ambiente: "HOMOLOGACAO",
      providerReference: "falso-1",
      chaveAcesso: "0".repeat(44),
      justificativa: "errei",
    });
    expect(curta.situacao).toBe("erro");
    expect(curta.mensagem).toMatch(/15/);
  });

  it("cancela quando a justificativa serve", async () => {
    const provedor = new ProvedorFiscalFalso();
    const r = await provedor.cancelarNFe({
      ambiente: "HOMOLOGACAO",
      providerReference: "falso-1",
      chaveAcesso: "0".repeat(44),
      justificativa: "Pedido cancelado pelo cliente antes da entrega",
    });
    expect(r.situacao).toBe("cancelada");
    expect(r.protocolo).toBeTruthy();
  });
});

describe("webhook", () => {
  it("RECUSA por padrao: endpoint que aceita qualquer corpo altera nota fiscal", async () => {
    const provedor = new ProvedorFiscalFalso();
    const r = provedor.validarWebhook(JSON.stringify({ referenciaInterna: "doc-1" }), {});
    expect(r.valido).toBe(false);
  });

  it("corpo invalido tambem e recusado", () => {
    const provedor = new ProvedorFiscalFalso();
    expect(provedor.validarWebhook("nao e json", {}).valido).toBe(false);
    expect(provedor.validarWebhook("{}", {}).valido).toBe(false);
  });
});

describe("arquivos", () => {
  it("o XML de teste avisa que nao tem validade fiscal", async () => {
    const provedor = new ProvedorFiscalFalso();
    const arquivo = await provedor.baixarXml("falso-1", "HOMOLOGACAO");
    const texto = new TextDecoder().decode(arquivo!.conteudo);
    expect(texto).toMatch(/sem validade|nao possui validade/i);
  });
});
