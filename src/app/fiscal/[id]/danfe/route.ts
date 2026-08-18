import { baixarArquivoFiscal } from "@/lib/fiscal/download";

// DANFE da nota. Mesmo cuidado do XML.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return baixarArquivoFiscal(id, "danfe");
}
