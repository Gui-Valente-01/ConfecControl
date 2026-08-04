import { expect, test } from "@playwright/test";

// Telas que qualquer pessoa alcança sem entrar no sistema. É o que o cliente
// novo vê primeiro, e o que a pessoa travada no login precisa conseguir abrir.

test.describe("telas públicas", () => {
  test("a página de entrada abre e oferece o caminho para entrar", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ConfecControl/i);
    await expect(page.getByRole("link", { name: /entrar/i }).first()).toBeVisible();
  });

  test("o login pede e-mail e senha", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar no painel/i })).toBeVisible();
  });

  // Quem mais precisa de ajuda é justamente quem não consegue entrar e por isso
  // não abre nada por dentro do sistema. Se isso sumir do login, some para ele.
  test("o login mostra a ajuda: manual aberto para quem não tem acesso", async ({ page }) => {
    await page.goto("/login");
    const manual = page.getByRole("link", { name: /manual do sistema/i });
    await expect(manual).toBeVisible();
    await expect(manual).toHaveAttribute("href", "/manual");
  });

  test("o manual abre sem precisar de login", async ({ page }) => {
    const resposta = await page.goto("/manual");
    expect(resposta?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/manual/i);
  });

  test("criar empresa pede o token de acesso", async ({ page }) => {
    await page.goto("/cadastro");
    await expect(page.locator('input[name="accessCode"]')).toBeVisible();
    await expect(page.locator('input[name="companyName"]')).toBeVisible();
  });

  test("o portal do cliente tem entrada própria", async ({ page }) => {
    await page.goto("/portal/entrar");
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});

test.describe("portas trancadas", () => {
  // Cada uma dessas telas mostra dado de uma empresa. Abrir sem sessão tem que
  // cair no login, e não mostrar um pedaço da tela antes de decidir.
  for (const rota of ["/pedidos", "/financeiro", "/relatorios", "/bancada", "/clientes", "/lixeira"]) {
    test(`${rota} manda para o login quando não há sessão`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('input[name="password"]')).toBeVisible();
    });
  }
});

test.describe("celular", () => {
  test.skip(({ isMobile }) => !isMobile, "só faz sentido na viewport de celular");

  test("o login não rola para o lado", async ({ page }) => {
    await page.goto("/login");
    const rola = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(rola).toBe(false);
  });

  // Campo com fonte menor que 16px faz o iPhone dar zoom sozinho ao tocar, e a
  // pessoa perde o lugar na tela no meio do preenchimento.
  test("os campos têm 16px, senão o iPhone dá zoom ao tocar", async ({ page }) => {
    await page.goto("/login");
    const tamanhos = await page.evaluate(() =>
      [...document.querySelectorAll('input:not([type="hidden"])')].map(
        (el) => parseFloat(getComputedStyle(el).fontSize),
      ),
    );
    expect(tamanhos.length).toBeGreaterThan(0);
    for (const tamanho of tamanhos) expect(tamanho).toBeGreaterThanOrEqual(16);
  });

  test("os controles têm altura de dedo (44px)", async ({ page }) => {
    await page.goto("/login");
    const baixos = await page.evaluate(() =>
      [...document.querySelectorAll('input:not([type="hidden"]), select, textarea, button')]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && b.height < 44;
        })
        .map((el) => `${el.tagName}:${Math.round(el.getBoundingClientRect().height)}px`),
    );
    expect(baixos).toEqual([]);
  });
});
