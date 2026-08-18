// Dados da empresa que assina os documentos legais.
//
// Política de privacidade e termos de uso são declarações jurídicas: quem
// controla os dados, onde eles ficam, com quem falar. Inventar CNPJ, endereço
// ou responsável seria produzir documento falso — pior do que não ter documento
// nenhum, porque cria confiança indevida.
//
// Por isso tudo vem de variável de ambiente. O que não estiver preenchido
// aparece na página como pendência visível, em vez de sumir em silêncio.

export type DadosLegais = {
  razaoSocial: string | null;
  cnpj: string | null;
  endereco: string | null;
  emailPrivacidade: string | null;
  /** Data da última revisão do texto, no formato "18 de agosto de 2026". */
  atualizadoEm: string;
  completo: boolean;
};

export function dadosLegais(env: Record<string, string | undefined> = process.env): DadosLegais {
  const razaoSocial = env.LEGAL_RAZAO_SOCIAL?.trim() || null;
  const cnpj = env.LEGAL_CNPJ?.trim() || null;
  const endereco = env.LEGAL_ENDERECO?.trim() || null;
  const emailPrivacidade = env.LEGAL_EMAIL_PRIVACIDADE?.trim() || null;

  return {
    razaoSocial,
    cnpj,
    endereco,
    emailPrivacidade,
    atualizadoEm: env.LEGAL_ATUALIZADO_EM?.trim() || "18 de agosto de 2026",
    completo: Boolean(razaoSocial && cnpj && endereco && emailPrivacidade),
  };
}

/** O que ainda falta preencher, para a própria página cobrar. */
export function pendenciasLegais(dados: DadosLegais): string[] {
  const faltando: string[] = [];
  if (!dados.razaoSocial) faltando.push("LEGAL_RAZAO_SOCIAL");
  if (!dados.cnpj) faltando.push("LEGAL_CNPJ");
  if (!dados.endereco) faltando.push("LEGAL_ENDERECO");
  if (!dados.emailPrivacidade) faltando.push("LEGAL_EMAIL_PRIVACIDADE");
  return faltando;
}
