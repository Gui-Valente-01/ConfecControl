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

const nextConfig: NextConfig = {
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
