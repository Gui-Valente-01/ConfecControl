// Páginas por tipo de confecção.
//
// Quem procura no Google não digita "sistema de gestão". Digita "sistema para
// estamparia", "controle de facção", "programa para confecção de uniformes" —
// e cai em quem escreveu sobre a dor dele, não sobre software. Uma página por
// segmento é o que permite responder na língua de cada um.
//
// O conteúdo mora aqui, e não dentro da tela, porque é texto de venda: muda
// com frequência, e mexer nele não pode obrigar ninguém a entender React.
//
// REGRA: só prometer o que o sistema faz hoje. Página de venda que promete
// função inexistente traz o cliente errado, que cancela no primeiro mês.

import type { FeatureKey } from "@/lib/features";

export type Segmento = {
  slug: string;
  /** Nome curto, para menus e migalhas. */
  nome: string;
  titulo: string;
  subtitulo: string;
  metaTitulo: string;
  metaDescricao: string;
  /** A queixa em voz de dono, e a resposta do sistema. */
  dores: { queixa: string; resposta: string }[];
  /** Módulos que importam para este segmento; a descrição vem de features.ts. */
  recursos: FeatureKey[];
  perguntas: { q: string; a: string }[];
};

export const segmentos: Segmento[] = [
  {
    slug: "estamparias",
    nome: "Estamparias e serigrafias",
    titulo: "O sistema para estamparia que sabe de quem é cada camiseta.",
    subtitulo:
      "Peça do cliente e peça sua no mesmo pedido, fila por mesa de silk e a arte certa na mão de quem produz.",
    metaTitulo: "Sistema para estamparia e serigrafia",
    metaDescricao:
      "Controle de ordens de serviço para estamparia: peça do cliente separada da sua, fila por mesa de silk, arte aprovada e foto da produção no mesmo pedido.",
    dores: [
      {
        queixa: "O cliente traz as camisetas dele e no fim eu não sei de quem era cada lote.",
        resposta:
          "Cada peça é cadastrada como sua ou como serviço na peça do cliente. O que sai da sua prateleira baixa do estoque; o que veio de fora, não. No fim do mês o relatório mostra os dois separados, e você enxerga quanto o serviço rendeu de verdade.",
      },
      {
        queixa: "Duas mesas de silk e ninguém sabe qual pedido é o da vez.",
        resposta:
          "Você cadastra suas mesas e cada uma tem a própria fila. O funcionário pega o pedido na mesa em que está trabalhando e marca quando termina. De onde você estiver, dá para ver quem pegou o quê e há quanto tempo aquilo está parado.",
      },
      {
        queixa: "Estampamos pela arte errada e perdemos o lote inteiro.",
        resposta:
          "A arte aprovada pelo cliente fica separada das fotos tiradas na bancada. Quem vai produzir abre o pedido e vê a arte certa; a foto do que saiu fica registrada com o nome de quem enviou, então dá para voltar e perguntar para a pessoa certa.",
      },
    ],
    recursos: ["bancada", "producao", "estoque", "financeiro"],
    perguntas: [
      {
        q: "Serve para quem só estampa peça do cliente?",
        a: "Serve. Cadastre o que você faz como serviço, e o pedido registra a peça que o cliente trouxe sem mexer no seu estoque. Quem também vende peça própria usa os dois tipos no mesmo pedido.",
      },
      {
        q: "Dá para controlar mais de uma mesa?",
        a: "Sim. Você cadastra quantas mesas quiser, com nome próprio e um responsável por cada uma. Cada mesa pode atender uma etapa específica ou aceitar qualquer pedido.",
      },
      {
        q: "O cliente consegue acompanhar o pedido dele?",
        a: "Consegue, se você liberar. Ele entra com um acesso próprio, vê em que etapa está o pedido e pode pedir uma nova produção igual à anterior, que chega para você aprovar.",
      },
      {
        q: "Preciso instalar alguma coisa nas máquinas da produção?",
        a: "Não. Funciona no navegador do computador e do celular. Se quiser, dá para instalar como aplicativo direto do navegador, sem loja de aplicativos.",
      },
    ],
  },
  {
    slug: "uniformes",
    nome: "Uniformes",
    titulo: "O pedido de uniforme não acaba na entrega. Acaba na reposição.",
    subtitulo:
      "Histórico por escola ou empresa, entrada e saldo controlados, e o cliente pedindo a reposição sozinho.",
    metaTitulo: "Sistema para confecção de uniformes",
    metaDescricao:
      "Controle de pedidos de uniforme escolar e profissional: histórico por cliente, tamanho e cor em cada item, entrada e saldo, e reposição pedida pelo próprio cliente.",
    dores: [
      {
        queixa: "A escola pediu reposição e ninguém achou o pedido do ano passado.",
        resposta:
          "Todo pedido fica guardado na ficha do cliente, com o que foi feito, em que tamanho e por quanto. Achar o pedido do ano passado é abrir o cliente e olhar a lista — e a busca encontra por número, nome ou peça.",
      },
      {
        queixa: "Fechei o contrato, recebi a entrada e esqueci de cobrar o saldo.",
        resposta:
          "Cada recebimento entra com data e forma de pagamento, e o que falta aparece como saldo em aberto. A tela do financeiro mostra quem deve, de qual pedido e desde quando — a cobrança para de depender da memória.",
      },
      {
        queixa: "Tamanho 8, 10, 12, 14 anotado no caderno, e sempre falta um.",
        resposta:
          "Cada linha do pedido guarda a peça, o tamanho, a cor, a quantidade e o preço unitário. A ficha impressa sai com tudo isso para a oficina, e o total do pedido é somado pelo sistema, não pela sua cabeça.",
      },
    ],
    recursos: ["portal", "financeiro", "producao", "relatorios"],
    perguntas: [
      {
        q: "O cliente consegue pedir reposição sozinho?",
        a: "Consegue. Com o portal liberado, ele entra, vê os pedidos anteriores e pede uma nova produção igual, com foto se quiser. A solicitação chega para você aceitar ou recusar — nada vira pedido sem a sua aprovação.",
      },
      {
        q: "Consigo saber quanto lucrei em cada contrato?",
        a: "Sim, desde que a peça tenha o custo cadastrado. O relatório mostra o lucro por cliente e por peça, e avisa quando alguma coisa saiu por menos do que custou para fazer.",
      },
      {
        q: "E se eu mandar parte da produção para fora?",
        a: "Você cadastra a facção parceira e vincula o pedido a ela. Assim fica registrado o que está na mão de quem, em vez de ficar só na conversa do WhatsApp.",
      },
      {
        q: "Serve para uniforme profissional, não só escolar?",
        a: "Serve. As etapas de produção são cadastradas por você, então o fluxo acompanha o seu jeito de trabalhar, seja jaleco, uniforme de time ou camisa de empresa.",
      },
    ],
  },
  {
    slug: "faccoes",
    nome: "Facções",
    titulo: "Quanto cada pessoa produziu esta semana? O sistema para facção responde.",
    subtitulo:
      "Lote por etapa, produção por costureira e o aviso de falta de peça saindo da bancada direto para o seu celular.",
    metaTitulo: "Sistema para facção de costura",
    metaDescricao:
      "Controle de produção para facção: lote acompanhado por etapa, quanto cada costureira produziu, registro de falta de peça e aviso no celular quando algo trava.",
    dores: [
      {
        queixa: "O contratante liga cobrando e eu não sei em que pé está o lote.",
        resposta:
          "Cada lote anda pelas etapas que você cadastrou, e toda mudança fica registrada com data. Em vez de descer até a produção para responder, você abre o pedido e vê onde está e há quanto tempo. O relatório ainda mostra qual etapa mais segura a produção.",
      },
      {
        queixa: "No fim da semana, não sei quanto cada costureira produziu.",
        resposta:
          "Quem produz pega o trabalho na bancada e marca quando termina. Disso sai um relatório com quantos trabalhos cada pessoa concluiu e quanto tempo levou em média — sem ninguém precisar preencher planilha no fim do dia.",
      },
      {
        queixa: "Faltaram peças no lote e só descobrimos na hora de entregar.",
        resposta:
          "Na hora de concluir, a pessoa registra se faltou ou sobrou material, com uma observação. Isso vira aviso na hora, com notificação no celular de quem precisa saber, e fica guardado no pedido em vez de sumir no grupo do WhatsApp.",
      },
    ],
    recursos: ["bancada", "producao", "relatorios", "equipe"],
    perguntas: [
      {
        q: "Serve para facção que só presta serviço, sem vender peça?",
        a: "Serve. O que você faz é cadastrado como serviço na peça de quem contratou, então o seu estoque não é movimentado e o faturamento sai pelo serviço prestado.",
      },
      {
        q: "Como o sistema sabe quem produziu o quê?",
        a: "Cada funcionário entra com o próprio acesso e pega o trabalho na bancada. Fica registrado quem pegou, em qual mesa, quando começou e quando terminou.",
      },
      {
        q: "Funciona no celular, no meio do barulho da produção?",
        a: "Funciona. As telas da bancada são feitas para o celular, e o aplicativo instala direto do navegador. Quem está produzindo vê em destaque só a própria peça.",
      },
      {
        q: "Meus dados ficam separados dos de outras confecções?",
        a: "Ficam. Cada empresa enxerga somente os próprios clientes, pedidos e valores, e cada funcionário vê apenas o que o cargo dele permite.",
      },
    ],
  },
];

/** O segmento pelo endereço. Devolve nulo quando o endereço não existe. */
export function acharSegmento(slug: string): Segmento | null {
  return segmentos.find((s) => s.slug === slug) ?? null;
}

/** Os endereços das páginas de segmento, para o sitemap e para o menu. */
export const rotasDosSegmentos = segmentos.map((s) => `/para/${s.slug}`);
