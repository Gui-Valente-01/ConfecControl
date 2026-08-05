import { describe, expect, it } from "vitest";
import {
  SEM_DESLOCAMENTO,
  ZOOM_MAX,
  ZOOM_MIN,
  indiceVizinho,
  limitarDeslocamento,
  limitarZoom,
  noLimite,
  proximoZoom,
  rotuloZoom,
} from "@/lib/zoom";

describe("limitarZoom", () => {
  it("mantem o valor dentro dos limites", () => {
    expect(limitarZoom(2)).toBe(2);
    expect(limitarZoom(0.1)).toBe(ZOOM_MIN);
    expect(limitarZoom(99)).toBe(ZOOM_MAX);
  });

  it("valor quebrado volta para o minimo, em vez de sumir com a imagem", () => {
    expect(limitarZoom(Number.NaN)).toBe(ZOOM_MIN);
    expect(limitarZoom(Number.POSITIVE_INFINITY)).toBe(ZOOM_MAX);
  });
});

describe("proximoZoom", () => {
  it("aproxima e afasta de meio em meio", () => {
    expect(proximoZoom(1, "mais")).toBe(1.5);
    expect(proximoZoom(2, "menos")).toBe(1.5);
  });

  it("nao passa do maximo nem do minimo", () => {
    expect(proximoZoom(ZOOM_MAX, "mais")).toBe(ZOOM_MAX);
    expect(proximoZoom(ZOOM_MIN, "menos")).toBe(ZOOM_MIN);
  });
});

describe("limitarDeslocamento", () => {
  const caixa = { largura: 400, altura: 300 };

  it("em zoom 1 nao arrasta: nao sobra imagem para mostrar", () => {
    const r = limitarDeslocamento({ x: 200, y: 200 }, 1, caixa);
    expect(r).toEqual({ x: 0, y: 0 });
  });

  it("em zoom 2 arrasta ate a metade do que sobra", () => {
    // Sobra 400 de largura; a folga para cada lado e 200.
    expect(limitarDeslocamento({ x: 500, y: 0 }, 2, caixa).x).toBe(200);
    expect(limitarDeslocamento({ x: -500, y: 0 }, 2, caixa).x).toBe(-200);
  });

  it("deslocamento pequeno passa intacto", () => {
    expect(limitarDeslocamento({ x: 30, y: -20 }, 2, caixa)).toEqual({ x: 30, y: -20 });
  });

  it("limita os dois eixos, cada um com a sua folga", () => {
    const r = limitarDeslocamento({ x: 9999, y: 9999 }, 3, caixa);
    expect(r.x).toBe(400); // (400*3 - 400) / 2
    expect(r.y).toBe(300); // (300*3 - 300) / 2
  });
});

describe("indiceVizinho", () => {
  it("anda para frente e para tras", () => {
    expect(indiceVizinho(0, 3, 1)).toBe(1);
    expect(indiceVizinho(1, 3, -1)).toBe(0);
  });

  it("da a volta no fim e no comeco, como galeria", () => {
    expect(indiceVizinho(2, 3, 1)).toBe(0);
    expect(indiceVizinho(0, 3, -1)).toBe(2);
  });

  it("lista vazia nao quebra", () => {
    expect(indiceVizinho(0, 0, 1)).toBe(0);
  });

  it("uma imagem so fica nela mesma", () => {
    expect(indiceVizinho(0, 1, 1)).toBe(0);
    expect(indiceVizinho(0, 1, -1)).toBe(0);
  });
});

describe("noLimite", () => {
  it("avisa quando nao da mais para aproximar ou afastar", () => {
    expect(noLimite(ZOOM_MAX, "mais")).toBe(true);
    expect(noLimite(ZOOM_MIN, "menos")).toBe(true);
    expect(noLimite(2, "mais")).toBe(false);
    expect(noLimite(2, "menos")).toBe(false);
  });
});

describe("rotuloZoom", () => {
  it("mostra em porcentagem, para quem nao percebe a diferenca visual", () => {
    expect(rotuloZoom(1)).toBe("100%");
    expect(rotuloZoom(2.5)).toBe("250%");
  });
});

describe("SEM_DESLOCAMENTO", () => {
  it("e o ponto de partida ao trocar de imagem", () => {
    expect(SEM_DESLOCAMENTO).toEqual({ x: 0, y: 0 });
  });
});
