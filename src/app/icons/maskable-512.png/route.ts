import { renderIcon } from "@/lib/pwa-icon";

export const dynamic = "force-static";

// Versao maskable: quadrado cheio (sem cantos arredondados) para o
// Android aplicar a propria mascara sem cortar a marca.
export function GET() {
  return renderIcon(512, false);
}
