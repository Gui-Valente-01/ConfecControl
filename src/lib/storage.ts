// Anexos no Supabase Storage (bucket "anexos") via API REST, sem dependência extra.
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente — apenas no servidor;
// a service role key nunca pode chegar ao cliente.

const BUCKET = "anexos";

function storageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function storageConfigured(): boolean {
  return storageConfig() !== null;
}

// Sobe o arquivo e retorna a URL pública, ou null se o upload falhar.
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
      },
      body: data,
    });
    if (!res.ok) return null;
  } catch {
    return null;
  }

  return `${config.url}/storage/v1/object/public/${BUCKET}/${path}`;
}

// Remove do Storage um arquivo a partir da URL pública salva no anexo.
// Melhor esforço: o registro já foi removido do banco antes desta chamada.
export async function removeAttachmentFromStorage(publicUrl: string): Promise<void> {
  const config = storageConfig();
  if (!config) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;

  try {
    await fetch(`${config.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${config.key}` },
    });
  } catch {
    // arquivo fica órfão no bucket, mas some da tela; não bloqueia a exclusão
  }
}
