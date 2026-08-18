// Dados da empresa que assina os documentos legais.
//
// Política de privacidade e termos de uso são declarações jurídicas: dizem quem
// controla os dados, sob qual base legal, por quanto tempo e com quem falar.
// Inventar CNPJ, endereço ou encarregado seria produzir documento falso — pior
// do que não ter documento nenhum, porque cria confiança indevida.
//
// Por isso tudo vem de variável de ambiente. O que não estiver preenchido
// aparece na página como pendência visível, em vez de sumir em silêncio.

export type DadosLegais = {
  razaoSocial: string | null;
  cnpj: string | null;
  endereco: string | null;
  emailPrivacidade: string | null;
  /** Encarregado pelo tratamento de dados (LGPD, art. 41). */
  encarregadoNome: string | null;
  encarregadoEmail: string | null;
  /** Data da última revisão, ex.: "18 de agosto de 2026". */
  atualizadoEm: string;
  versao: string;
  completo: boolean;
};

export function dadosLegais(env: Record<string, string | undefined> = process.env): DadosLegais {
  const razaoSocial = env.LEGAL_RAZAO_SOCIAL?.trim() || null;
  const cnpj = env.LEGAL_CNPJ?.trim() || null;
  const endereco = env.LEGAL_ENDERECO?.trim() || null;
  const emailPrivacidade = env.LEGAL_EMAIL_PRIVACIDADE?.trim() || null;
  const encarregadoNome = env.LEGAL_ENCARREGADO_NOME?.trim() || null;
  const encarregadoEmail = env.LEGAL_ENCARREGADO_EMAIL?.trim() || emailPrivacidade;

  return {
    razaoSocial,
    cnpj,
    endereco,
    emailPrivacidade,
    encarregadoNome,
    encarregadoEmail,
    atualizadoEm: env.LEGAL_ATUALIZADO_EM?.trim() || "18 de agosto de 2026",
    versao: env.LEGAL_VERSAO?.trim() || "1.0",
    completo: Boolean(razaoSocial && cnpj && endereco && emailPrivacidade && encarregadoNome),
  };
}

/** O que ainda falta preencher, para a própria página cobrar. */
export function pendenciasLegais(dados: DadosLegais): { chave: string; oQue: string }[] {
  const faltando: { chave: string; oQue: string }[] = [];
  if (!dados.razaoSocial) faltando.push({ chave: "LEGAL_RAZAO_SOCIAL", oQue: "Razão social de quem opera o sistema" });
  if (!dados.cnpj) faltando.push({ chave: "LEGAL_CNPJ", oQue: "CNPJ" });
  if (!dados.endereco) faltando.push({ chave: "LEGAL_ENDERECO", oQue: "Endereço completo" });
  if (!dados.emailPrivacidade) faltando.push({ chave: "LEGAL_EMAIL_PRIVACIDADE", oQue: "E-mail para assuntos de privacidade" });
  if (!dados.encarregadoNome) {
    faltando.push({ chave: "LEGAL_ENCARREGADO_NOME", oQue: "Nome do encarregado de dados (LGPD, art. 41)" });
  }
  return faltando;
}

/**
 * Quem processa dados a nosso mando, e onde.
 *
 * A LGPD (art. 9º, II) dá ao titular o direito de saber com quem os dados são
 * compartilhados. Fica no código, e não numa variável, porque é fato da
 * arquitetura do sistema: mudou o fornecedor, muda esta lista junto com a
 * configuração que o usa.
 */
export const SUBOPERADORES: {
  nome: string;
  papel: string;
  local: string;
  dados: string;
}[] = [
  {
    nome: "Vercel",
    papel: "Hospedagem da aplicação",
    local: "Brasil (São Paulo)",
    dados: "Tráfego das requisições e registros técnicos de acesso",
  },
  {
    nome: "Supabase",
    papel: "Banco de dados e armazenamento de arquivos",
    local: "Brasil (São Paulo)",
    dados: "Todos os dados cadastrais e operacionais, e os arquivos anexados",
  },
  {
    nome: "Sentry",
    papel: "Monitoramento de erros (opcional; só quando configurado)",
    local: "Estados Unidos",
    dados: "Rota, mensagem e pilha do erro. Sem dados pessoais — ver a seção de segurança",
  },
  {
    nome: "Provedor de nota fiscal",
    papel: "Emissão de NF-e (somente para quem contrata o módulo)",
    local: "Brasil",
    dados: "Dados exigidos pela legislação fiscal para emitir a nota",
  },
];
