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
    slug: "bones",
    nome: "Bonés e chapéus",
    titulo: "O boné do evento tem data. E a arte bordada tem que ser a aprovada.",
    subtitulo:
      "Arte presa ao pedido, contagem por cor e modelo, e a etapa travada aparecendo antes de o cliente ligar.",
    metaTitulo: "Sistema para fábrica de bonés",
    metaDescricao:
      "Controle de produção para fábrica de bonés promocionais: arte aprovada anexada ao pedido, quantidade por cor e modelo, etapa acompanhada e saldo a receber.",
    dores: [
      {
        queixa: "Aprovaram a arte por mensagem e a produção bordou a versão antiga.",
        resposta:
          "A arte aprovada fica anexada ao pedido, e não perdida numa conversa. Quem vai produzir abre o pedido e vê o arquivo certo. As fotos tiradas na bancada ficam separadas da arte, com o nome de quem enviou, então dá para voltar e perguntar à pessoa certa o que saiu daquela mesa.",
      },
      {
        queixa: "São dois mil bonés em seis cores e eu perco a conta do que já saiu.",
        resposta:
          "Cada linha do pedido guarda o modelo, a cor, a quantidade e o preço. O pedido anda pelas etapas que você cadastrou — corte, bordado, montagem, acabamento — e cada mudança fica registrada com data. A conta do que falta é do sistema, não da sua cabeça.",
      },
      {
        queixa: "O evento é dia 20 e só descubro no dia 18 que travou no bordado.",
        resposta:
          "Cada pedido tem prazo, e o painel destaca o que está atrasado ou perto de vencer. Quando alguém registra falta de material na bancada, isso vira aviso com notificação no celular de quem precisa saber — na hora, não na véspera.",
      },
    ],
    recursos: ["producao", "bancada", "estoque", "financeiro"],
    perguntas: [
      {
        q: "Dá para separar a amostra do lote?",
        a: "Dá. A amostra entra como um pedido próprio, com o prazo dela, e o lote entra como outro. Os dois ficam na ficha do mesmo cliente, então o histórico continua junto quando ele voltar a pedir.",
      },
      {
        q: "Consigo controlar quantidade por cor e por modelo?",
        a: "Sim. Cada item do pedido tem peça, cor, tamanho, quantidade e preço unitário. A ficha impressa sai com tudo isso para a oficina, e o total é somado pelo sistema.",
      },
      {
        q: "E quando eu mando o bordado para fora?",
        a: "Você cadastra a bordadeira ou a facção parceira e vincula o pedido a ela. Fica registrado o que está na mão de quem, com data, em vez de ficar só na conversa.",
      },
      {
        q: "O cliente corporativo consegue acompanhar sozinho?",
        a: "Consegue, se você liberar o portal. Ele entra com um acesso próprio, vê em que etapa está o pedido e pode pedir uma nova produção igual à anterior — que chega para você aprovar antes de virar pedido.",
      },
    ],
  },
  {
    slug: "camisetas",
    nome: "Camisetas",
    titulo: "A camiseta que falta é sempre a do tamanho que acabou.",
    subtitulo:
      "Grade por tamanho em cada item, baixa no estoque a cada pedido e o que falta visível antes da entrega.",
    metaTitulo: "Sistema para confecção de camisetas",
    metaDescricao:
      "Controle de produção de camisetas por lote: grade de tamanho e cor em cada item, baixa automática no estoque e saldo a receber por pedido.",
    dores: [
      {
        queixa: "Entreguei o lote quase todo e faltou justamente o tamanho maior.",
        resposta:
          "Cada linha do pedido guarda peça, tamanho, cor e quantidade — a grade fica escrita, não na memória. Enquanto o pedido não passa pela etapa de conferência, ele continua aparecendo em aberto no painel, com o que ainda falta.",
      },
      {
        queixa: "Não sei se a camiseta que saiu era minha ou do cliente.",
        resposta:
          "Peça sua e peça do cliente são cadastradas de formas diferentes: o que sai da sua prateleira baixa do estoque, o que veio de fora entra como serviço e não mexe no seu saldo. No relatório os dois aparecem separados.",
      },
      {
        queixa: "Descubro que a malha acabou quando a costureira já está parada.",
        resposta:
          "O estoque tem alerta de mínimo por peça, e a baixa acontece quando o pedido consome. Em vez de descobrir na hora do corte, o aviso chega antes — e quem está na bancada registra a falta na hora, com observação presa ao pedido.",
      },
    ],
    recursos: ["producao", "estoque", "bancada", "relatorios"],
    perguntas: [
      {
        q: "Serve para quem produz por lote e também vende avulso?",
        a: "Serve. O pedido aceita quantas linhas você quiser, então o lote de quinhentas e a venda de dez convivem no mesmo lugar, cada um com o próprio prazo e o próprio saldo.",
      },
      {
        q: "Consigo saber quanto lucrei em cada modelo?",
        a: "Sim, desde que a peça tenha o custo cadastrado. O relatório mostra o lucro por peça e por cliente, e aponta quando alguma coisa saiu por menos do que custou para fazer.",
      },
      {
        q: "A ficha vai para a oficina com os tamanhos?",
        a: "Vai. A ficha impressa sai com peça, tamanho, cor e quantidade. Quando quem imprime não tem acesso a dinheiro, a ficha sai sem os valores.",
      },
      {
        q: "Preciso instalar algo nos computadores?",
        a: "Não. Funciona no navegador, no computador e no celular, e dá para instalar como aplicativo direto do navegador — sem passar por loja de aplicativos.",
      },
    ],
  },
  {
    slug: "brindes",
    nome: "Brindes promocionais",
    titulo: "Brinde é prazo de evento. Atrasou, não serve mais para nada.",
    subtitulo:
      "Vários itens no mesmo pedido, arte do cliente aprovada e anexada, e o prazo do evento em primeiro plano.",
    metaTitulo: "Sistema para indústria de brindes promocionais",
    metaDescricao:
      "Controle de pedidos para brindes promocionais: vários itens no mesmo pedido, arte do cliente anexada, prazo de evento em destaque e saldo por pedido.",
    dores: [
      {
        queixa: "O mesmo pedido tem boné, camiseta e sacola, e cada um anda num ritmo.",
        resposta:
          "Um pedido comporta quantos itens diferentes você precisar, cada um com quantidade e preço. O pedido inteiro anda pelas etapas que você cadastrou, e o histórico mostra quando cada mudança aconteceu — sem precisar abrir três controles.",
      },
      {
        queixa: "A agência mandou o logo por e-mail, depois por mensagem, e ninguém sabe qual vale.",
        resposta:
          "Os arquivos ficam anexados ao pedido, no lugar onde quem produz vai olhar. A versão que está no pedido é a que vale, e a foto do que saiu da produção fica registrada ao lado, com o nome de quem enviou.",
      },
      {
        queixa: "Fechei o pedido, recebi a entrada e o saldo ficou esquecido.",
        resposta:
          "Cada recebimento entra com data e forma de pagamento, e o que falta aparece como saldo em aberto. A tela do financeiro mostra quem deve, de qual pedido e desde quando.",
      },
    ],
    recursos: ["producao", "financeiro", "portal", "relatorios"],
    perguntas: [
      {
        q: "Dá para ver todos os pedidos de um mesmo cliente corporativo?",
        a: "Dá. Todo pedido fica guardado na ficha do cliente, com o que foi feito, quando e por quanto. Quando ele volta no ano seguinte, o histórico está lá.",
      },
      {
        q: "O cliente pode pedir a repetição de um brinde anterior?",
        a: "Pode, com o portal liberado. Ele vê os pedidos anteriores e solicita uma nova produção igual. A solicitação chega para você aceitar ou recusar — nada vira pedido sem a sua aprovação.",
      },
      {
        q: "Consigo separar o que é produção própria do que é revenda?",
        a: "Consegue. O que sai do seu estoque baixa; o que é serviço sobre peça de terceiro não mexe no estoque. O relatório mostra os dois separados.",
      },
      {
        q: "E se eu precisar terceirizar parte do pedido?",
        a: "Você cadastra a parceira e vincula o pedido a ela, com data. Assim fica registrado o que está fora e com quem, em vez de depender de lembrar.",
      },
    ],
  },
  {
    slug: "bordados",
    nome: "Bordados",
    titulo: "Bordou a matriz errada e o lote inteiro foi embora.",
    subtitulo:
      "Matriz aprovada presa ao pedido, fila por máquina e o registro de quem bordou o quê.",
    metaTitulo: "Sistema para bordado industrial",
    metaDescricao:
      "Controle de produção para bordadeira: matriz aprovada anexada ao pedido, fila por máquina e registro de quem bordou cada lote.",
    dores: [
      {
        queixa: "A matriz foi ajustada duas vezes e a produção pegou a versão velha.",
        resposta:
          "O arquivo aprovado fica anexado ao pedido, e é dali que quem produz tira o que vai bordar. As fotos do que saiu ficam separadas da matriz, com autor e data, então dá para reconstruir o que aconteceu em vez de discutir de memória.",
      },
      {
        queixa: "Três máquinas rodando e ninguém sabe qual pedido é o da vez.",
        resposta:
          "Você cadastra suas máquinas como mesas, cada uma com nome e responsável. Cada uma tem a própria fila: o funcionário pega o pedido na máquina em que está e marca quando termina. Dá para ver quem pegou o quê e há quanto tempo aquilo está parado.",
      },
      {
        queixa: "Recebo peça do cliente para bordar e ela se mistura com a minha.",
        resposta:
          "O que você faz sobre a peça de terceiro é cadastrado como serviço e não movimenta o seu estoque. A peça própria baixa normalmente. No fim do mês o relatório mostra quanto veio de serviço e quanto veio de peça vendida.",
      },
    ],
    recursos: ["bancada", "producao", "relatorios", "equipe"],
    perguntas: [
      {
        q: "Como o sistema sabe quem bordou cada lote?",
        a: "Cada pessoa entra com o próprio acesso e pega o trabalho na bancada. Fica registrado quem pegou, em qual máquina, quando começou e quando terminou.",
      },
      {
        q: "Serve para quem só presta serviço de bordado?",
        a: "Serve. Cadastre o bordado como serviço e o pedido registra a peça que o cliente trouxe, sem tocar no seu estoque. O faturamento sai pelo serviço prestado.",
      },
      {
        q: "Consigo saber qual etapa mais segura a produção?",
        a: "Consegue. Como cada mudança de etapa fica registrada com data, o relatório mostra onde os pedidos ficam parados por mais tempo.",
      },
      {
        q: "Cada funcionário vê tudo?",
        a: "Não. O acesso é por cargo: quem está na produção vê pedido e estoque para saber o que fazer, mas não vê dinheiro, relatório nem configuração.",
      },
    ],
  },
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
  {
    slug: "moda",
    nome: "Marca própria e roupas",
    titulo: "Você sabe quanto custa fazer a sua peça? O sistema sabe.",
    subtitulo:
      "Custo por peça, grade de cor e tamanho, e o lucro de cada modelo em vez do chute do fim do mês.",
    metaTitulo: "Sistema para confecção de roupas e marca própria",
    metaDescricao:
      "Gestão para confecção de roupas: custo e ficha técnica por peça, grade de cor e tamanho no pedido, etapas de corte e costura, lucro por modelo e por cliente.",
    dores: [
      {
        queixa: "No fim do mês entrou dinheiro, mas eu não sei em qual peça eu ganhei.",
        resposta:
          "Cada peça pode ter o custo cadastrado, e o relatório mostra o lucro por peça e por cliente. Quando alguma coisa sai por menos do que custou para fazer, o sistema aponta — em vez de o prejuízo aparecer só no caixa do mês seguinte.",
      },
      {
        queixa: "A mesma peça tem quatro cores e cinco tamanhos, e o controle não acompanha.",
        resposta:
          "Cada linha do pedido guarda peça, cor, tamanho, quantidade e preço unitário. A ficha impressa sai com a grade completa para a oficina, e o total vem somado pelo sistema.",
      },
      {
        queixa: "Metade da produção está fora, na facção, e eu perco o fio da meada.",
        resposta:
          "A parceira é cadastrada e o pedido fica vinculado a ela, com data. O que está fora aparece na tela como está: fora, com quem e desde quando — em vez de virar mensagem perdida.",
      },
    ],
    recursos: ["producao", "estoque", "financeiro", "relatorios"],
    perguntas: [
      {
        q: "Dá para registrar do que a peça é feita?",
        a: "Dá. A peça tem ficha com os materiais usados e o custo, e é isso que permite o relatório calcular o lucro em vez de estimar.",
      },
      {
        q: "Serve para quem produz coleção, e não sob encomenda?",
        a: "Serve em parte, e vale saber antes: o sistema é construído em volta do pedido. Quem produz para estoque usa o estoque de peças e os relatórios, mas o quadro de produção foi feito pensando em pedido com cliente e prazo. Se a sua operação é só coleção para revenda, provavelmente há ferramenta mais adequada.",
      },
      {
        q: "Consigo dar acesso diferente para cada pessoa da equipe?",
        a: "Consegue. O acesso é por cargo: quem está na produção não vê dinheiro nem relatório, e quem cuida do financeiro não mexe na configuração da empresa.",
      },
      {
        q: "E se eu quiser parar de usar?",
        a: "Os dados são seus. Os relatórios exportam, e a sua conta não fica presa a contrato de fidelidade.",
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
