import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Manual do usuário em /manual — endereço curto para mandar ao cliente.
    // O arquivo vive em public/manual.html e é público de propósito: quem mais
    // precisa dele é justamente quem ainda não sabe entrar no sistema.
    return [{ source: "/manual", destination: "/manual.html" }];
  },
};

export default nextConfig;
