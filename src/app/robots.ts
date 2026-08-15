import type { MetadataRoute } from "next";
import { rotasPrivadas, siteUrl, urlAbsoluta } from "@/lib/site";

// O que o robô de busca pode ler. As telas de dentro ficam de fora: já exigem
// login, e deixá-las abertas só faz o robô gastar rastreio para encontrar a
// mesma tela de login vinte vezes.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: rotasPrivadas }],
    sitemap: urlAbsoluta("/sitemap.xml"),
    host: siteUrl,
  };
}
