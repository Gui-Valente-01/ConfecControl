// Entrega XML e DANFE de uma nota, conferindo antes de quem ela é.
//
// Os dois arquivos têm CNPJ, endereço e valor do cliente. Servi-los por um
// endereço que só depende de adivinhar o id seria o mesmo erro do bucket
// público — então a conferência de empresa acontece aqui, antes de qualquer
// byte sair.

import { NextResponse } from "next/server";
import { userWithCapability } from "@/lib/auth";
import { provedorFiscal } from "@/lib/fiscal/config";
import { prisma } from "@/lib/prisma";

export async function baixarArquivoFiscal(documentId: string, tipo: "xml" | "danfe") {
  const user = await userWithCapability("fiscal.read");
  if (!user) return new NextResponse("Não autorizado.", { status: 401 });

  // O filtro por empresa está no where, e não numa checagem depois: nota de
  // outra confecção simplesmente não é encontrada.
  const documento = await prisma.fiscalDocument.findFirst({
    where: { id: documentId, companyId: user.companyId },
    select: { providerReference: true, environment: true, status: true, number: true },
  });
  if (!documento) return new NextResponse("Nota não encontrada.", { status: 404 });
  if (!documento.providerReference) {
    return new NextResponse("Esta nota ainda não foi enviada ao provedor.", { status: 409 });
  }

  const provedor = provedorFiscal();
  const arquivo =
    tipo === "xml"
      ? await provedor.baixarXml(documento.providerReference, documento.environment)
      : await provedor.baixarDanfe(documento.providerReference, documento.environment);

  if (!arquivo) return new NextResponse("Arquivo indisponível no provedor.", { status: 502 });

  return new NextResponse(arquivo.conteudo, {
    headers: {
      "content-type": arquivo.contentType,
      "content-disposition": `attachment; filename="${arquivo.nomeSugerido}"`,
      // Documento fiscal não fica em cache de proxy nem de navegador.
      "cache-control": "private, no-store",
    },
  });
}
