import { expect, test, type Page } from "@playwright/test";

// Auditoria de enquadramento: pega o que corta conteudo ou faz a pagina rolar
// para o lado. Roda nas telas publicas, nas larguras que importam.
//
// Existe porque dois defeitos reais passaram despercebidos ate serem medidos:
// o botao do cabecalho que nao sumia em tela estreita, e o e-mail de suporte
// (texto sem espaco) empurrando a tela de login inteira num aparelho de 320px.

const PAGINAS = ["/", "/login", "/cadastro", "/portal/entrar", "/manual"];

// 320px e o piso real: iPhone SE antigo e Android de entrada, que e o aparelho
// de quem trabalha no chao de fabrica.
const LARGURAS = [320, 375, 414];

async function vazamentos(page: Page) {
  return page.evaluate(() => {
    const W = window.innerWidth;
    const achados: string[] = [];

    if (document.documentElement.scrollWidth > W + 1) {
      achados.push(`a pagina rola para o lado: ${document.documentElement.scrollWidth}px numa janela de ${W}px`);
    }

    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.right <= W + 1) continue;

      // Tabela larga dentro de um container que rola e proposital.
      let dentroDeRolagem = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === "auto" || ov === "scroll") { dentroDeRolagem = true; break; }
      }
      if (dentroDeRolagem) continue;

      const classe = String((el as HTMLElement).className).slice(0, 40);
      achados.push(`passa ${Math.round(b.right - W)}px da borda: ${el.tagName.toLowerCase()}.${classe}`);
    }
    return achados;
  });
}

for (const largura of LARGURAS) {
  for (const rota of PAGINAS) {
    test(`${rota} cabe em ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 });
      await page.goto(rota);
      expect(await vazamentos(page)).toEqual([]);
    });
  }
}

test("campo de formulario consegue encolher em tela estreita", async ({ page }) => {
  // Campo tem largura minima propria (~20 caracteres). Com a fonte de 16px do
  // celular isso passa de 270px e empurrava a tela inteira num aparelho de 320.
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/login");
  const minWidths = await page.evaluate(() =>
    [...document.querySelectorAll("input:not([type=hidden]), select, textarea")].map(
      (el) => getComputedStyle(el).minWidth,
    ),
  );
  expect(minWidths.length).toBeGreaterThan(0);
  for (const mw of minWidths) expect(mw).toBe("0px");
});
