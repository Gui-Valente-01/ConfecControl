// Anexos no Supabase Storage (bucket "anexos") via API REST, sem dependência extra.
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente — apenas no servidor;
// a service role key nunca pode chegar ao cliente.
//
// O BUCKET É PRIVADO.
//
// Antes ele era público e o banco guardava a URL pública inteira. Isso
// significa que a arte do cliente e a foto da produção ficavam legíveis por
// qualquer pessoa com o link, para sempre, sem sessão — e um link vaza com um
// copiar e colar num grupo de WhatsApp. Agora o banco guarda só o CAMINHO, e a
// tela pede uma URL assinada que expira em minutos.

const BUCKET = "anexos";

/** Validade do link. Curta de propósito: é o que limita o estrago de um vazamento. */
export const VALIDADE_DO_LINK_SEGUNDOS = 10 * 60;

function storageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function storageConfigured(): boolean {
  return storageConfig() !== null;
}

/**
 * Sobe o arquivo e devolve o CAMINHO dentro do bucket (nunca uma URL).
 *
 * Devolver caminho, e não URL, é o que permite o link expirar: URL gravada no
 * banco vale para sempre.
 */
export async function uploadAttachmentToStorage(
  path: string,
  data: ArrayBuffer,
  contentType: string | null,
): Promise<string | null> {
  const config = storageConfig();
  if (!config) return null;

  try {
    const res = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.key}`,
        "content-type": contentType || "application/octet-stream",
        // Impede o navegador de adivinhar o tipo e executar o conteúdo.
        "x-upsert": "false",
      },
      body: data,
    });
    if (!res.ok) return null;
  } catch {
    return null;
  }

  return path;
}

/**
 * Link temporário para ver o arquivo.
 *
 * Quem chama JÁ deve ter conferido que o anexo pertence à empresa da pessoa
 * (ver caminhoPertenceAEmpresa em upload-validation.ts). Esta função assina o
 * que mandarem: ela é a caneta, não o porteiro.
 */
export async function signedUrlForAttachment(
  path: string,
  segundos: number = VALIDADE_DO_LINK_SEGUNDOS,
): Promise<string | null> {
  const config = storageConfig();
  if (!config || !path) return null;

  try {
    const res = await fetch(`${config.url}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expiresIn: segundos }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { signedURL?: string };
    if (!json.signedURL) return null;
    return `${config.url}/storage/v1${json.signedURL}`;
  } catch {
    return null;
  }
}

/** Remove pelo caminho. Melhor esforço: o registro do banco já saiu antes. */
export async function removeAttachmentByPath(path: string): Promise<void> {
  const config = storageConfig();
  if (!config || !path) return;

  try {
    await fetch(`${config.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${config.key}` },
    });
  } catch {
    // arquivo fica órfão no bucket, mas some da tela; não bloqueia a exclusão
  }
}

/**
 * Remove a partir da URL pública antiga.
 *
 * Existe só para os anexos gravados antes do bucket virar privado. Some quando
 * a coluna `url` for esvaziada pela migração de dados.
 */
export async function removeAttachmentFromStorage(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  if (path) await removeAttachmentByPath(path);
}
