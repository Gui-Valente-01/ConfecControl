import { describe, expect, it } from "vitest";
import {
  classificarAnexo,
  comoAbrir,
  ehDaBancada,
  separarPorOrigem,
  ehVisualizavel,
  primeiraImagem,
  rotuloAnexo,
  separarAnexos,
  type Anexo,
} from "@/lib/anexos";

const anexo = (name: string, type: string | null = null): Anexo => ({
  id: name,
  name,
  url: `https://exemplo/${name}`,
  type,
});

describe("classificarAnexo", () => {
  it("foto do celular e imagem", () => {
    expect(classificarAnexo(anexo("modelo.jpg", "image/jpeg"))).toBe("imagem");
    expect(classificarAnexo(anexo("arte.png", "image/png"))).toBe("imagem");
  });

  it("reconhece imagem pela extensao quando o tipo nao veio", () => {
    // Upload de celular chega com tipo generico com frequencia.
    expect(classificarAnexo(anexo("IMG_2231.HEIC", "application/octet-stream"))).toBe("imagem");
    expect(classificarAnexo(anexo("foto.jpeg", null))).toBe("imagem");
  });

  it("PDF e PDF, pelo tipo ou pela extensao", () => {
    expect(classificarAnexo(anexo("arte.pdf", "application/pdf"))).toBe("pdf");
    expect(classificarAnexo(anexo("arte.pdf", null))).toBe("pdf");
  });

  it("arquivo de arte da oficina: corel, illustrator, photoshop", () => {
    expect(classificarAnexo(anexo("logo.cdr", "application/octet-stream"))).toBe("arte");
    expect(classificarAnexo(anexo("logo.ai", null))).toBe("arte");
    expect(classificarAnexo(anexo("estampa.psd", null))).toBe("arte");
    expect(classificarAnexo(anexo("faca.eps", null))).toBe("arte");
  });

  it("SVG conta como arte, nao como imagem: quem abre e o Corel", () => {
    expect(classificarAnexo(anexo("logo.svg", "image/svg+xml"))).toBe("arte");
  });

  it("o que nao reconhece vira arquivo comum, sem quebrar", () => {
    expect(classificarAnexo(anexo("medidas.xlsx", null))).toBe("outro");
    expect(classificarAnexo(anexo("semextensao", null))).toBe("outro");
  });

  it("extensao em maiuscula tambem vale", () => {
    expect(classificarAnexo(anexo("MODELO.JPG", null))).toBe("imagem");
    expect(classificarAnexo(anexo("LOGO.CDR", null))).toBe("arte");
  });
});

describe("primeiraImagem", () => {
  it("acha a foto mesmo quando o PDF foi enviado primeiro", () => {
    // Era exatamente aqui que o sistema errava: pegava o PDF e jogava numa
    // <img>, e o funcionario via um quadrado quebrado no lugar do modelo.
    const lista = [anexo("arte.pdf", "application/pdf"), anexo("modelo.jpg", "image/jpeg")];
    expect(primeiraImagem(lista)?.name).toBe("modelo.jpg");
  });

  it("so arquivo que nao e imagem devolve null, e nao um PDF disfarcado", () => {
    const lista = [anexo("arte.pdf", "application/pdf"), anexo("logo.cdr", null)];
    expect(primeiraImagem(lista)).toBeNull();
  });

  it("pedido sem anexo devolve null", () => {
    expect(primeiraImagem([])).toBeNull();
  });

  it("com varias fotos, usa a primeira enviada", () => {
    const lista = [anexo("frente.jpg", "image/jpeg"), anexo("costas.jpg", "image/jpeg")];
    expect(primeiraImagem(lista)?.name).toBe("frente.jpg");
  });
});

describe("ehVisualizavel", () => {
  it("so imagem aparece na tela", () => {
    expect(ehVisualizavel(anexo("modelo.jpg", "image/jpeg"))).toBe(true);
    expect(ehVisualizavel(anexo("arte.pdf", "application/pdf"))).toBe(false);
    expect(ehVisualizavel(anexo("logo.cdr", null))).toBe(false);
  });
});

describe("rotuloAnexo", () => {
  it("diz o que e, com a extensao quando ajuda", () => {
    expect(rotuloAnexo(anexo("modelo.jpg", "image/jpeg"))).toBe("Foto");
    expect(rotuloAnexo(anexo("arte.pdf", "application/pdf"))).toBe("PDF");
    expect(rotuloAnexo(anexo("logo.cdr", null))).toBe("Arquivo de arte (.cdr)");
    expect(rotuloAnexo(anexo("medidas.xlsx", null))).toBe("Arquivo .xlsx");
  });
});

describe("comoAbrir", () => {
  it("avisa que arquivo de arte nao abre no navegador", () => {
    expect(comoAbrir(anexo("logo.cdr", null))).toContain("Não abre no navegador");
  });

  it("PDF e desenhado pelo navegador dentro do visualizador", () => {
    expect(comoAbrir(anexo("arte.pdf", "application/pdf"))).toContain("ver o PDF aqui");
  });
});

describe("separarAnexos", () => {
  it("separa o que se ve do que so se baixa", () => {
    const lista = [
      anexo("frente.jpg", "image/jpeg"),
      anexo("arte.pdf", "application/pdf"),
      anexo("costas.png", "image/png"),
      anexo("logo.cdr", null),
    ];
    const { imagens, arquivos } = separarAnexos(lista);
    expect(imagens.map((a) => a.name)).toEqual(["frente.jpg", "costas.png"]);
    expect(arquivos.map((a) => a.name)).toEqual(["arte.pdf", "logo.cdr"]);
  });

  it("lista vazia nao quebra", () => {
    expect(separarAnexos([])).toEqual({ imagens: [], arquivos: [] });
  });
});

describe("origem do anexo", () => {
  const arte = { id: "1", name: "arte.png", url: "/a.png", type: "image/png" };
  const foto = { id: "2", name: "pronto.jpg", url: "/b.jpg", type: "image/jpeg", origem: "BANCADA", sentBy: "Maria" };

  it("arte do cliente nao e da bancada", () => {
    expect(ehDaBancada(arte)).toBe(false);
    expect(ehDaBancada({ ...arte, origem: null })).toBe(false);
  });

  it("foto da producao e reconhecida", () => {
    expect(ehDaBancada(foto)).toBe(true);
  });

  it("separa as duas coisas, para nao produzirem olhando a foto errada", () => {
    const r = separarPorOrigem([arte, foto, { ...arte, id: "3" }]);
    expect(r.arte.map((a) => a.id)).toEqual(["1", "3"]);
    expect(r.producao.map((a) => a.id)).toEqual(["2"]);
  });

  it("pedido sem foto de producao devolve lista vazia, e nao quebra", () => {
    const r = separarPorOrigem([arte]);
    expect(r.producao).toEqual([]);
    expect(r.arte).toHaveLength(1);
  });
});
