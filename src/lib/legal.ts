// Dados de quem assina os documentos legais.
//
// Política de privacidade e termos de uso são declarações jurídicas: dizem quem
// controla os dados, sob qual base legal, por quanto tempo e com quem falar.
// Inventar CNPJ, endereço ou encarregado seria produzir documento falso — pior
// do que não ter documento nenhum, porque cria confiança indevida.
//
// Por isso tudo vem de variável de ambiente. O que não estiver preenchido
// aparece na página como pendência visível, em vez de sumir em silêncio.

/**
 * Quem responde pelo tratamento.
 *
 * A LGPD (art. 5º, VI) admite controlador pessoa natural, e a isenção do art.
 * 4º, I não alcança quem trata dados com finalidade econômica. Ou seja: operar
 * sem empresa aberta não dispensa a política — só muda quem assina e quais
 * campos existem. Pessoa física não tem razão social nem CNPJ, e exigir os dois
 * deixaria a página presa em pendência para sempre.
 */
export type TipoControlador = "pf" | "pj";

export type DadosLegais = {
  tipo: TipoControlador;
  /** Razão social (PJ) ou nome civil completo (PF). */
  nomeControlador: string | null;
  /** Rótulo correto para exibir o campo acima. */
  rotuloNome: string;
  /** Só se aplica a PJ. Em PF fica nulo por decisão, não por falta. */
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
  const tipo: TipoControlador = env.LEGAL_TIPO_CONTROLADOR?.trim().toLowerCase() === "pf" ? "pf" : "pj";

  // LEGAL_RAZAO_SOCIAL continua valendo para não quebrar quem já configurou.
  const nomeControlador = env.LEGAL_NOME_CONTROLADOR?.trim() || env.LEGAL_RAZAO_SOCIAL?.trim() || null;
  const cnpj = tipo === "pj" ? env.LEGAL_CNPJ?.trim() || null : null;
  const endereco = env.LEGAL_ENDERECO?.trim() || null;
  const emailPrivacidade = env.LEGAL_EMAIL_PRIVACIDADE?.trim() || null;
  const encarregadoNome = env.LEGAL_ENCARREGADO_NOME?.trim() || null;
  const encarregadoEmail = env.LEGAL_ENCARREGADO_EMAIL?.trim() || emailPrivacidade;

  // Pessoa física não precisa publicar CPF nem endereço residencial para
  // cumprir a LGPD: o que o titular tem direito de saber é quem controla e por
  // onde falar (arts. 9º e 18). Publicar CPF só aumenta risco de fraude.
  // Isso muda no dia em que houver cobrança on-line — ver o comentário em
  // pendenciasLegais.
  const completo =
    tipo === "pj"
      ? Boolean(nomeControlador && cnpj && endereco && emailPrivacidade && encarregadoNome)
      : Boolean(nomeControlador && emailPrivacidade && encarregadoNome);

  return {
    tipo,
    nomeControlador,
    rotuloNome: tipo === "pj" ? "Razão social" : "Responsável",
    cnpj,
    endereco,
    emailPrivacidade,
    encarregadoNome,
    encarregadoEmail,
    atualizadoEm: env.LEGAL_ATUALIZADO_EM?.trim() || "18 de agosto de 2026",
    versao: env.LEGAL_VERSAO?.trim() || "1.0",
    completo,
  };
}

/**
 * O que ainda falta preencher, para a própria página cobrar.
 *
 * Atenção ao dia em que o sistema passar a cobrar: o Decreto 7.962/2013, que
 * regula a contratação no comércio eletrônico, manda exibir inscrição no CPF ou
 * CNPJ e endereço físico do fornecedor. Enquanto não há cobrança, a exigência
 * não incide — por isso ela não entra nesta lista automaticamente.
 */
export function pendenciasLegais(dados: DadosLegais): { chave: string; oQue: string }[] {
  const faltando: { chave: string; oQue: string }[] = [];

  if (!dados.nomeControlador) {
    faltando.push({
      chave: "LEGAL_NOME_CONTROLADOR",
      oQue:
        dados.tipo === "pj"
          ? "Razão social de quem opera o sistema"
          : "Nome civil completo de quem responde pelo tratamento",
    });
  }
  if (dados.tipo === "pj" && !dados.cnpj) faltando.push({ chave: "LEGAL_CNPJ", oQue: "CNPJ" });
  if (dados.tipo === "pj" && !dados.endereco) {
    faltando.push({ chave: "LEGAL_ENDERECO", oQue: "Endereço completo" });
  }
  if (!dados.emailPrivacidade) {
    faltando.push({ chave: "LEGAL_EMAIL_PRIVACIDADE", oQue: "E-mail para assuntos de privacidade" });
  }
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
];
