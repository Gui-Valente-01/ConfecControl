import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// O host do Storage vem da própria variável de ambiente, e não escrito à mão:
// cada instalação aponta para o seu projeto no Supabase, e um host fixo aqui
// faria a miniatura parar de aparecer em qualquer outra.
function hostDoStorage(): string | null {
  const bruto = process.env.SUPABASE_URL;
  if (!bruto) return null;
  try {
    return new URL(bruto).hostname;
  } catch {
    return null;
  }
}

const host = hostDoStorage();


// O host de ingestao do Sentry sai do proprio DSN. Existe uma combinacao em que
// o tunel /monitoring NAO e criado (o withSentryConfig exige ORG+PROJECT+TOKEN,
// mas o SDK do navegador liga so com o DSN publico): sem este host liberado, o
// aviso de erro morre bloqueado pela CSP -- e o que morre e justamente o canal
// que avisaria.
function hostDoSentry(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    return new URL(dsn).hostname;
  } catch {
    return null;
  }
}

const sentry = hostDoSentry();

// VERCEL_ENV preserva a barra de ferramentas do preview; o fallback para
// NODE_ENV faz a politica valer num "next build && next start" local, que e
// onde ela deve ser testada antes de subir.
const emProducao = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";

// Content-Security-Policy.
// ---------------------------------------------------------------------------
// Sejamos honestos sobre o que ela compra: com 'unsafe-inline' em script-src
// isto NAO e protecao contra XSS. O sistema tem um script inline no <head> que
// decide o tema antes da pintura (src/lib/tema.ts) -- sem ele a tela pisca de
// claro para escuro a cada carregamento. Trocar por nonce exigiria middleware
// em toda requisicao.
//
// O que ela compra de verdade e contencao: script injetado nao manda dado de
// cliente para servidor nenhum (connect-src), nao carrega payload de fora, nao
// sequestra <base>, nao posta formulario para endereco de atacante, e o site
// nao pode ser posto dentro de um iframe. Num sistema que guarda cadastro de
// cliente e financeiro, ja vale bastante.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${emProducao ? "" : " 'unsafe-eval'"}`,
  // O Tailwind e o Next injetam <style> em tempo de execucao.
  "style-src 'self' 'unsafe-inline'",
  // blob: e data: cobrem a pre-visualizacao da foto antes do envio.
  `img-src 'self' data: blob:${host ? ` https://${host}` : ""}${emProducao ? "" : " https://picsum.photos"}`,
  "font-src 'self' data:",
  `connect-src 'self'${host ? ` https://${host}` : ""}${sentry ? ` https://${sentry}` : ""}${emProducao ? "" : " ws: http://localhost:*"}`,
  // O service worker do PWA.
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  // Ninguem pode enquadrar o sistema: e o que impede clickjacking em cima dos
  // botoes de apagar e de receber dinheiro.
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // Formulario so posta para o proprio site. Fecha a rota mais direta de
  // exfiltracao caso algum dia entre HTML de terceiro numa tela.
  "form-action 'self'",
  ...(emProducao ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cabecalhosDeSeguranca = [
  // A CSP entra em Report-Only de proposito: uma politica que quebra o site em
  // producao e pior do que nenhuma. Depois de alguns dias sem relato de
  // violacao, trocar o nome do cabecalho para "Content-Security-Policy".
  { key: "Content-Security-Policy-Report-Only", value: csp },
  // Estes ja entram valendo: sao antigos, bem suportados e nao quebram nada.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // O sistema nao usa nenhum destes. A camera some junto: a foto da bancada
    // entra por <input type="file">, que o navegador trata como escolha de
    // arquivo e nao depende desta permissao.
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // HSTS fica de fora da lista comum: so faz sentido em HTTPS, e ligar em
  // desenvolvimento trava o localhost no navegador por dois anos. Sem
  // "preload": entrar na lista do Chrome e praticamente irreversivel, e essa
  // decisao e do dono do dominio, nao do build.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: emProducao
          ? [
              ...cabecalhosDeSeguranca,
              { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
            ]
          : cabecalhosDeSeguranca,
      },
    ];
  },

  async rewrites() {
    // Manual do usuário em /manual — endereço curto para mandar ao cliente.
    // O arquivo vive em public/manual.html e é público de propósito: quem mais
    // precisa dele é justamente quem ainda não sabe entrar no sistema.
    return [{ source: "/manual", destination: "/manual.html" }];
  },

  images: {
    // Sem isto, a foto do modelo era baixada inteira para virar um quadradinho
    // de 80px: um JPG de 6 MB do celular gastava 6 MB para mostrar a miniatura,
    // e com cinco pedidos na tela eram 30 MB no 4G da oficina.
    //
    // Só o host do Storage é liberado. Deixar aberto permitiria transformar
    // imagem de qualquer endereço da internet às nossas custas.
    remotePatterns: [
      ...(host
        ? [{ protocol: "https" as const, hostname: host, pathname: "/storage/v1/object/public/**" }]
        : []),
      // O seed de demonstração usa fotos do picsum.photos. Liberado APENAS fora
      // de produção, para o cenário de demo renderizar no dev local; em produção
      // nada além do Storage é permitido (transformar imagem de qualquer host às
      // nossas custas continua bloqueado).
      ...(process.env.NODE_ENV !== "production"
        ? [{ protocol: "https" as const, hostname: "picsum.photos", pathname: "/**" }]
        : []),
    ],
    // Tamanhos que a tela realmente pede: miniatura da bancada e a maior do
    // pedido. Lista curta significa menos versões geradas e mais cache.
    imageSizes: [64, 96, 160, 256],
    formats: ["image/webp" as const],
  },
};

// O empacotamento do monitoramento só entra quando as credenciais existem.
//
// Sem esta condição, o build passaria a exigir a conta do Sentry para
// funcionar: quem clonar o projeto, e o próprio deploy antes de a conta
// existir, quebrariam por falta de uma variável. Com ela, o sistema roda igual
// sem monitoramento e ganha o envio dos mapas de código assim que as chaves
// forem cadastradas no painel do Vercel.
const credenciaisDoMonitoramento =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN;

export default credenciaisDoMonitoramento
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      // Sem os mapas, o erro chega como uma linha de código embaralhado. Eles
      // são enviados e apagados do pacote público: quem abrir o site não
      // consegue ler o código-fonte do sistema.
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      // O bloqueador de anúncio do navegador derruba chamada para domínio de
      // monitoramento. Passando pelo próprio site, o aviso chega mesmo assim.
      tunnelRoute: "/monitoring",
      disableLogger: true,
    })
  : nextConfig;
