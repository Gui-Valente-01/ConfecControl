import type { MetadataRoute } from "next";
import { rotasPublicas, urlAbsoluta } from "@/lib/site";

// O mapa do site para o Google. Sem ele, a página só é achada se alguém já
// tiver colocado um link para ela em algum lugar — e ninguém colocou.
export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return rotasPublicas.map((rota) => ({
    url: urlAbsoluta(rota.caminho),
    lastModified: agora,
    changeFrequency: rota.frequencia,
    priority: rota.prioridade,
  }));
}
