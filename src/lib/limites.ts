// O que o ConfecControl NÃO faz.
//
// Por que este arquivo existe
// ---------------------------------------------------------------------------
// features.ts responde "o que posso vender". Faltava o par dele: "o que preciso
// dizer que não existe". A diferença importa porque o silêncio também vende —
// quem lê uma lista de módulos e não vê "nota fiscal" assume que vem junto, do
// mesmo jeito que assumiria se estivesse escrito.
//
// O módulo fiscal foi removido do produto (não está mais em FeatureKey). Antes
// disso ele já tinha vazado uma vez para /planos sozinho, por configuração.
// A lição foi que promessa não se controla com revisão de texto, e sim com
// dado em um lugar só, lido por quem exibe. Este arquivo é esse lugar para o
// lado negativo da promessa.
//
// Regra: se um cliente pode se decepcionar no primeiro mês por supor que existe,
// entra aqui. Cada item traz a saída prática — dizer "não faz" e parar é deixar
// a pessoa sem caminho, e ela vai embora achando que o sistema é incompleto em
// vez de focado.

export type Limite = {
  key: string;
  /** O que não existe, na palavra que o dono da confecção usa. */
  titulo: string;
  /** Por que não existe, sem desculpa e sem promessa de roadmap. */
  porque: string;
  /** O que a pessoa faz na prática. Sempre preenchido. */
  saida: string;
};

export const limites: Limite[] = [
  {
    key: "fiscal",
    titulo: "Não emite nota fiscal",
    porque:
      "Não há integração com SEFAZ nem com provedor fiscal. O sistema não gera NF-e, NFS-e, XML nem DANFE.",
    saida:
      "Você continua emitindo onde já emite hoje, com seu contador ou emissor. O ConfecControl cuida do pedido, da produção e do que falta receber.",
  },
  {
    key: "loja",
    titulo: "Não é loja virtual, PDV nem marketplace",
    porque:
      "Não tem carrinho, frente de caixa, catálogo de venda ao consumidor nem integração com Shopee, Mercado Livre ou Shopify.",
    saida:
      "Se você vende no varejo além de produzir, mantenha a ferramenta de venda que já usa. Aqui entra o pedido que vira produção.",
  },
  {
    key: "offline",
    titulo: "Não funciona sem internet",
    porque:
      "O sistema abre no navegador e instala como aplicativo no celular, mas os dados ficam no servidor. Sem conexão, a tela não carrega.",
    saida:
      "No chão de fábrica, o celular no wi-fi da empresa resolve. Se a sua internet cai com frequência, me diga antes de contratar — isso pesa.",
  },
  {
    key: "whatsapp",
    titulo: "Não responde WhatsApp por você",
    porque:
      "O sistema monta a mensagem de status e abre o WhatsApp com o texto pronto. Quem envia é você. Não é uma caixa de entrada dentro do sistema.",
    saida:
      "Serve para avisar o cliente sem digitar tudo de novo. A conversa continua no seu WhatsApp normal.",
  },
  {
    key: "planejamento",
    titulo: "Não calcula capacidade nem diz o que produzir primeiro",
    porque:
      "Não há MRP, cálculo de carga de máquina nem previsão por inteligência artificial. O sistema mostra prazo, etapa e responsável; quem decide a prioridade é você.",
    saida:
      "O painel deixa visível o que está atrasado e o que está parado. A decisão continua sendo sua, com a informação na frente em vez de na memória.",
  },
  {
    key: "contabil",
    titulo: "Não faz contabilidade nem folha de pagamento",
    porque:
      "O financeiro registra entrada, saldo e pagamento ligados ao pedido. Não é livro contábil, não apura imposto e não calcula salário.",
    saida:
      "Os relatórios de faturamento e lucro ajudam na conversa com o contador. Eles não substituem o contador.",
  },
  {
    key: "importacao",
    titulo: "Não lê pedido por foto nem importa planilha sozinho",
    porque:
      "Não existe leitura automática de imagem, PDF ou planilha para virar pedido.",
    saida:
      "Na implantação eu cadastro com você os clientes, as peças e os pedidos que já estão andando. Depois disso o cadastro é rápido porque a base já existe.",
  },
];

/**
 * Compromissos que dependem de mim, não do sistema.
 *
 * Estão separados dos limites acima de propósito: um limite é coisa que o
 * produto não faz; isto é coisa que o produto não faz sozinho e eu faço na mão.
 * Prometer no contrato e não ter tela é dívida — melhor dizer quem executa.
 */
export const compromissosManuais = [
  {
    key: "exportacao",
    titulo: "Levar seus dados embora",
    detalhe:
      "A tela de Relatórios exporta seus pedidos em CSV, com cliente, data, prazo, status e valores — isso você faz sozinho, quando quiser. Para uma cópia completa (cadastros, estoque e histórico de produção), você pede e eu gero o arquivo.",
  },
  {
    key: "implantacao",
    titulo: "Colocar o sistema para rodar",
    detalhe:
      "Não é autoatendimento. Eu configuro a conta, cadastro sua base inicial e treino a equipe junto com você.",
  },
] as const;

export const limiteKeys = limites.map((l) => l.key);
