// Troca o caminho guardado no banco por um link temporário para exibir.
//
// O bucket é privado: o banco guarda `storagePath`, e não uma URL. Quem monta a
// tela pede o link aqui, ele vale por minutos e depois morre. Antes a URL
// pública ficava gravada e valia para sempre — bastava vazar uma vez.
//
// Só o servidor chama isto. A conferência de empresa é feita aqui, e não na
// função que assina: quem assina é a caneta, e o porteiro precisa ser outro.

import { signedUrlForAttachment } from "@/lib/storage";
import { caminhoPertenceAEmpresa } from "@/lib/upload-validation";

type ComCaminho = { url: string; storagePath?: string | null };

/**
 * Devolve os anexos com `url` pronta para a tela.
 *
 * Anexo antigo (gravado quando o bucket era público) mantém a URL que já tinha:
 * enquanto os dois formatos convivem, a tela precisa mostrar os dois.
 */
export async function comLinkAssinado<T extends ComCaminho>(anexos: T[], companyId: string): Promise<T[]> {
  return Promise.all(
    anexos.map(async (anexo) => {
      if (!anexo.storagePath) return anexo;

      // Anexo cujo caminho não começa pela empresa não é desta empresa. Não
      // deveria acontecer (a consulta já filtra), mas assinar sem conferir
      // transformaria qualquer erro de consulta em vazamento entre empresas.
      if (!caminhoPertenceAEmpresa(anexo.storagePath, companyId)) {
        return { ...anexo, url: "" };
      }

      const link = await signedUrlForAttachment(anexo.storagePath);
      return { ...anexo, url: link ?? "" };
    }),
  );
}
