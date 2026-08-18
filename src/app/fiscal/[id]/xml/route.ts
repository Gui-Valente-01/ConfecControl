import { baixarArquivoFiscal } from "@/lib/fiscal/download";

// XML da nota. Nunca público: tem CNPJ, endereço e valor do cliente.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return baixarArquivoFiscal(id, "xml");
}
