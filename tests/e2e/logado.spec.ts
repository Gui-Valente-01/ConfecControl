import { expect, test, type Page } from "@playwright/test";

// Fluxos que só existem depois de entrar no sistema.
//
// A credencial NUNCA fica no repositório: vem de E2E_EMAIL e E2E_SENHA. Sem
// elas, tudo aqui é pulado e a suíte continua verde — é o que permite rodar os
// testes públicos em qualquer máquina, sem combinar senha com ninguém.
//
// Para rodar este arquivo, use uma conta de TESTE num banco de teste:
//   E2E_EMAIL=... E2E_SENHA=... npx playwright test

const EMAIL = process.env.E2E_EMAIL;
const SENHA = process.env.E2E_SENHA;

test.skip(!EMAIL || !SENHA, "defina E2E_EMAIL e E2E_SENHA para rodar os fluxos com login");

async function entrar(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(EMAIL!);
  await page.locator('input[name="password"]').fill(SENHA!);
  await page.getByRole("button", { name: /entrar no painel/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe("com sessão aberta", () => {
  test.beforeEach(async ({ page }) => entrar(page));

  test("o painel abre e o menu leva às telas principais", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Pedidos" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Peças" }).first()).toBeVisible();
  });

  test("as telas principais abrem sem erro", async ({ page }) => {
    for (const rota of ["/pedidos", "/clientes", "/produtos", "/estoque", "/financeiro", "/relatorios"]) {
      const resposta = await page.goto(rota);
      expect(resposta?.status(), `${rota} respondeu ${resposta?.status()}`).toBeLessThan(400);
      await expect(page.locator("main")).toBeVisible();
    }
  });

  // O erro aparecia num toast que sumia em quatro segundos; num formulário de
  // oito campos ninguém descobria qual estava errado.
  test("telefone inválido marca o campo, não só um aviso no canto", async ({ page }) => {
    await page.goto("/clientes");
    await page.locator('input[name="name"]').first().fill("Cliente de teste E2E");
    await page.locator('input[name="phone"]').first().fill("999");
    await page.getByRole("button", { name: /cadastrar|salvar|adicionar/i }).first().click();

    const telefone = page.locator('input[name="phone"]').first();
    await expect(telefone).toHaveAttribute("aria-invalid", "true");
    await expect(telefone).toBeFocused();
  });

  test("a lixeira abre e explica que nada foi apagado de verdade", async ({ page }) => {
    await page.goto("/lixeira");
    await expect(page.locator("main")).toContainText(/lixeira/i);
    await expect(page.locator("main")).toContainText(/apagad|excluíd/i);
  });
});
