import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta: abrem o navegador de verdade e percorrem a tela como
// uma pessoa faria. Servem para pegar o que teste de unidade não vê — rota que
// não abre, formulário que não envia, link que aponta para lugar nenhum.
//
// Os testes ficam divididos em dois grupos:
//
//  - tests/e2e/publico.spec.ts   roda sempre; só usa tela sem login
//  - tests/e2e/logado.spec.ts    só roda com E2E_EMAIL e E2E_SENHA no ambiente
//
// A senha nunca fica no repositório: sem essas variáveis os testes com login
// são pulados, e a suíte continua verde.

const PORTA = Number(process.env.E2E_PORT ?? 3100);
const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Um pedido salvo duas vezes ao mesmo tempo daria falso negativo.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE,
    // Rastro só do que falhou: guardar tudo enche o disco à toa.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // O celular é onde o funcionário usa a bancada: o alvo de toque e o
    // tamanho de fonte dos campos precisam continuar certos.
    //
    // Pixel 5 (Chromium) e não iPhone (WebKit) de propósito: o que estes
    // testes olham é largura de tela e CSS, que não muda de um motor para o
    // outro. Assim a suíte roda com um navegador só, em vez de exigir o
    // download de um segundo de mais de 100 MB para medir a mesma coisa.
    { name: "celular", use: { ...devices["Pixel 5"] } },
  ],

  // Sobe o servidor sozinho, a menos que E2E_BASE_URL aponte para um já no ar.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORTA}`,
        url: BASE,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
