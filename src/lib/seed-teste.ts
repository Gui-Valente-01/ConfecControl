// Empresa de teste: uma confecção fictícia completa, com pedido atrasado,
// estoque no vermelho, bancada em uso e solicitação no portal.
//
// Serve para dois momentos: encher um banco de desenvolvimento recém-criado, e
// montar a conta que se usa para mostrar o sistema a alguém.
//
// Não importa nada do Next nem caminho com "@/": o script de linha de comando
// carrega este arquivo direto pelo Node, e qualquer um dos dois quebraria ali.

import type { PrismaClient } from "@prisma/client";

// Identidade da empresa de teste. São constantes de código, nunca vindas de
// formulário: é o que garante que o "recomeçar" só possa apagar ESTA empresa.
export const EMPRESA_TESTE = {
  nome: "Costura Viva Confecções",
  emailDono: "dono@costuraviva.com",
  senhaEquipe: "costura123",
  senhaPortal: "portal123",
} as const;

// Só os modelos que o cenário usa, e não o PrismaClient inteiro: o client do
// site vem estendido e não é do mesmo tipo do client cru que o script abre.
// Pedindo apenas o necessário, os dois servem.
export type PrismaDoSeed = Pick<
  PrismaClient,
  | "company"
  | "user"
  | "productionStage"
  | "partner"
  | "client"
  | "product"
  | "material"
  | "stockMovement"
  | "productMaterial"
  | "order"
  | "mesa"
  | "bancadaTask"
  | "orderRequest"
>;

type Dependencias = {
  prisma: PrismaDoSeed;
  /** O mesmo hash do app, para os logins da demo funcionarem de verdade. */
  hashPassword: (plain: string) => string;
  /**
   * Anexar fotos de exemplo. Desligado em produção porque as imagens vêm do
   * picsum.photos, que o next.config só libera fora de produção — com ele
   * ligado lá, a miniatura quebraria na tela.
   */
  comFotos: boolean;
};

const ETAPAS = [
  { name: "Recebido", position: 1, color: "#5b68d8", status: "RECEIVED" },
  { name: "Aguardando material", position: 2, color: "#8a6fdb", status: "WAITING_MATERIAL" },
  { name: "Corte", position: 3, color: "#087f7d", status: "CUTTING" },
  { name: "Costura", position: 4, color: "#c88a2b", status: "SEWING" },
  { name: "Bordado/estampa", position: 5, color: "#c87941", status: "EMBROIDERY_PRINT" },
  { name: "Acabamento", position: 6, color: "#c43f54", status: "FINISHING" },
  { name: "Pronto", position: 7, color: "#111a16", status: "READY" },
  { name: "Entregue", position: 8, color: "#66756d", status: "DELIVERED" },
] as const;

const EQUIPE = [
  { name: "Marina Prado", email: EMPRESA_TESTE.emailDono, role: "ADMIN", sector: "Direção", phone: "(41) 99988-7766" },
  { name: "Rafael Nunes", email: "gerente@costuraviva.com", role: "MANAGER", sector: "Operação", phone: "(41) 99977-6655" },
  { name: "Camila Torres", email: "producao@costuraviva.com", role: "PRODUCTION", sector: "Costura", phone: "(41) 99966-5544" },
  { name: "Bruno Alves", email: "financeiro@costuraviva.com", role: "FINANCE", sector: "Financeiro", phone: "(41) 99955-4433" },
  { name: "Leticia Ramos", email: "vendas@costuraviva.com", role: "SALES", sector: "Atendimento", phone: "(41) 99944-3322" },
] as const;

export type ResumoTeste = {
  companyId: string;
  /** Dono da demo: é com ele que o visitante entra. */
  emailDono: string;
  pedidos: number;
};

/**
 * Apaga a empresa de teste anterior e cria tudo de novo.
 *
 * A remoção é feita pelo e-mail do dono E pelo nome da empresa, os dois fixos
 * aqui em cima. É proposital: mesmo que alguém chame esta função por engano,
 * ela não tem como alcançar a empresa de um cliente de verdade.
 */
export async function recriarEmpresaTeste({ prisma, hashPassword, comFotos }: Dependencias): Promise<ResumoTeste> {
  const agora = new Date();
  const emDias = (d: number) => new Date(agora.getTime() + d * 86400000);
  const reais = (v: number) => Math.round(v * 100);

  const donoAnterior = await prisma.user.findUnique({
    where: { email: EMPRESA_TESTE.emailDono },
    select: { company: { select: { id: true, name: true } } },
  });
  // A conferência do nome é a segunda tranca: sem ela, um cadastro futuro que
  // reaproveitasse este e-mail levaria a empresa junto na exclusão.
  if (donoAnterior && donoAnterior.company.name === EMPRESA_TESTE.nome) {
    await prisma.company.delete({ where: { id: donoAnterior.company.id } });
  }

  const company = await prisma.company.create({
    data: {
      name: EMPRESA_TESTE.nome,
      document: "12.345.678/0001-90",
      phone: "(41) 3322-1100",
      email: "contato@costuraviva.com",
      address: "Rua das Agulhas, 245 - Curitiba/PR",
      features: ["producao", "estoque", "financeiro", "relatorios", "terceirizadas", "equipe", "portal", "bancada"],
    },
  });

  // ---- Etapas de produção ----
  const etapaPorNome: Record<string, { id: string; status: string }> = {};
  for (const e of ETAPAS) {
    const etapa = await prisma.productionStage.create({
      data: { companyId: company.id, name: e.name, position: e.position, color: e.color },
    });
    etapaPorNome[e.name] = { id: etapa.id, status: e.status };
  }

  // ---- Funcionários (um de cada cargo) ----
  const senhaEquipe = hashPassword(EMPRESA_TESTE.senhaEquipe);
  const usuarioPorCargo: Record<string, { id: string; name: string }> = {};
  for (const u of EQUIPE) {
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: u.name,
        email: u.email,
        password: senhaEquipe,
        role: u.role,
        sector: u.sector,
        phone: u.phone,
      },
    });
    usuarioPorCargo[u.role] = { id: user.id, name: user.name };
  }
  const camila = usuarioPorCargo.PRODUCTION;

  // ---- Terceirizada ----
  await prisma.partner.create({
    data: {
      companyId: company.id,
      name: "Estamparia Ponto Certo",
      service: "Estampa e bordado",
      contact: "Sr. Antônio",
      phone: "(41) 3011-2233",
      email: "contato@pontocerto.com",
    },
  });

  // ---- Clientes ----
  const clientes: Record<string, { id: string }> = {};
  for (const c of [
    { name: "Escola Municipal Girassol", contact: "Diretora Sônia", phone: "(41) 3212-0001", email: "compras@girassol.edu.br", document: "08.111.222/0001-33" },
    { name: "Academia Corpo em Movimento", contact: "Prof. Diego", phone: "(41) 3212-0002", email: "diego@corpomovimento.com" },
    { name: "Bar do Zé", contact: "José Carlos", phone: "(41) 3212-0003", email: "bardoze@gmail.com" },
    { name: "Igreja Batista Central", contact: "Secretária Rute", phone: "(41) 3212-0004", email: "eventos@ibcentral.org" },
  ]) {
    clientes[c.name] = await prisma.client.create({ data: { companyId: company.id, ...c } });
  }

  // Cliente com acesso ao PORTAL (login próprio).
  const marta = await prisma.client.create({
    data: {
      companyId: company.id,
      name: "Marta Confecções",
      contact: "Marta Siqueira",
      phone: "(41) 3212-0005",
      email: "marta@costuraviva.com",
      document: "10.222.333/0001-44",
      passwordHash: hashPassword(EMPRESA_TESTE.senhaPortal),
      portalEnabled: true,
    },
  });
  clientes["Marta Confecções"] = marta;

  // ---- Peças ----
  const pecas: Record<string, { id: string }> = {};
  for (const p of [
    { name: "Camiseta Gola Careca", category: "Camisetas", fabric: "Malha PV", standardPriceInCents: reais(29.9), costInCents: reais(12), averageProductionDays: 5 },
    { name: "Camisa Polo", category: "Polos", fabric: "Piquet", standardPriceInCents: reais(49.9), costInCents: reais(22), averageProductionDays: 7 },
    { name: "Moletom Canguru", category: "Moletons", fabric: "Moletom flanelado", standardPriceInCents: reais(89.9), costInCents: reais(40), averageProductionDays: 10 },
    { name: "Uniforme Escolar", category: "Uniformes", fabric: "Malha PV", standardPriceInCents: reais(39.9), costInCents: reais(16), averageProductionDays: 6 },
    { name: "Avental de Cozinha", category: "Aventais", fabric: "Brim", standardPriceInCents: reais(34.9), costInCents: reais(14), averageProductionDays: 4 },
  ]) {
    pecas[p.name] = await prisma.product.create({ data: { companyId: company.id, ...p } });
  }

  // ---- Materiais (um abaixo do mínimo, para o alerta aparecer) ----
  const materiais: Record<string, { id: string }> = {};
  for (const m of [
    { name: "Malha PV branca", category: "Tecido", unit: "kg", currentQuantity: 45, minimumQuantity: 20, supplier: "Malhas Sul" },
    { name: "Linha 120 preta", category: "Aviamento", unit: "cones", currentQuantity: 120, minimumQuantity: 30, supplier: "Aviatex" },
    { name: "Tinta serigrafia", category: "Estamparia", unit: "kg", currentQuantity: 8, minimumQuantity: 12, supplier: "InkPrint" },
    { name: "Ribana", category: "Tecido", unit: "m", currentQuantity: 60, minimumQuantity: 25, supplier: "Malhas Sul" },
    { name: "Botão 18mm", category: "Aviamento", unit: "un", currentQuantity: 3400, minimumQuantity: 500, supplier: "Aviatex" },
  ]) {
    const material = await prisma.material.create({ data: { companyId: company.id, ...m } });
    materiais[m.name] = material;
    await prisma.stockMovement.create({
      data: { materialId: material.id, type: "IN", quantity: m.currentQuantity, note: "Saldo inicial" },
    });
  }

  // ---- Ficha técnica ----
  await prisma.productMaterial.createMany({
    data: [
      { productId: pecas["Camiseta Gola Careca"].id, materialId: materiais["Malha PV branca"].id, quantityPerUnit: 0.25 },
      { productId: pecas["Camiseta Gola Careca"].id, materialId: materiais["Linha 120 preta"].id, quantityPerUnit: 0.02 },
      { productId: pecas["Camisa Polo"].id, materialId: materiais["Malha PV branca"].id, quantityPerUnit: 0.3 },
      { productId: pecas["Camisa Polo"].id, materialId: materiais["Ribana"].id, quantityPerUnit: 0.2 },
      { productId: pecas["Camisa Polo"].id, materialId: materiais["Botão 18mm"].id, quantityPerUnit: 3 },
    ],
  });

  // ---- Pedidos ----
  type ItemPedido = { productId: string; description: string; size: string; color: string; quantity: number; unitPriceInCents: number };
  type NovoPedido = {
    number: number;
    cliente: string;
    etapa: string;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    deliveryDate: Date;
    assignee?: string;
    paymentStatus: "PENDING" | "PARTIAL" | "PAID";
    paidRatio?: number;
    idade?: number;
    foto?: string;
    items: ItemPedido[];
  };

  async function criarPedido(o: NovoPedido) {
    const total = o.items.reduce((s, i) => s + i.unitPriceInCents * i.quantity, 0);
    const pago = o.paymentStatus === "PAID" ? total : o.paymentStatus === "PARTIAL" ? Math.round(total * (o.paidRatio ?? 0.5)) : 0;
    const etapa = etapaPorNome[o.etapa];

    return prisma.order.create({
      data: {
        companyId: company.id,
        clientId: clientes[o.cliente].id,
        number: o.number,
        orderDate: emDias(-(o.idade ?? 3)),
        deliveryDate: o.deliveryDate,
        status: etapa.status as never,
        priority: o.priority,
        assignee: o.assignee ?? null,
        paymentStatus: o.paymentStatus,
        totalAmountInCents: total,
        paidAmountInCents: pago,
        paymentMethod: "Pix",
        currentStageId: etapa.id,
        items: {
          create: o.items.map((i) => ({
            productId: i.productId,
            description: i.description,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            unitPriceInCents: i.unitPriceInCents,
            totalPriceInCents: i.unitPriceInCents * i.quantity,
          })),
        },
        payments: {
          create: {
            amountInCents: total,
            status: o.paymentStatus,
            method: "Pix",
            paidAt: o.paymentStatus === "PAID" ? emDias(-1) : null,
          },
        },
        attachments:
          comFotos && o.foto
            ? { create: { name: "Arte do pedido", url: `https://picsum.photos/seed/${o.foto}/800/600`, type: "image/jpeg" } }
            : undefined,
      },
    });
  }

  const pedidos = {
    p1: await criarPedido({ number: 1001, cliente: "Escola Municipal Girassol", etapa: "Costura", priority: "HIGH", deliveryDate: emDias(5), assignee: "Camila Torres", paymentStatus: "PARTIAL", paidRatio: 0.5, idade: 6, foto: "uniforme-escolar",
      items: [{ productId: pecas["Uniforme Escolar"].id, description: "Uniforme Escolar - camiseta azul", size: "12", color: "Azul", quantity: 120, unitPriceInCents: reais(39.9) }] }),
    p2: await criarPedido({ number: 1002, cliente: "Academia Corpo em Movimento", etapa: "Bordado/estampa", priority: "URGENT", deliveryDate: emDias(2), assignee: "Camila Torres", paymentStatus: "PENDING", idade: 4, foto: "regata-academia",
      items: [{ productId: pecas["Camiseta Gola Careca"].id, description: "Regata dry-fit com estampa", size: "M", color: "Preta", quantity: 80, unitPriceInCents: reais(34.9) }] }),
    p3: await criarPedido({ number: 1003, cliente: "Bar do Zé", etapa: "Corte", priority: "NORMAL", deliveryDate: emDias(8), paymentStatus: "PENDING", idade: 2,
      items: [{ productId: pecas["Camiseta Gola Careca"].id, description: "Camiseta do bar - estampa costas", size: "G", color: "Vermelha", quantity: 50, unitPriceInCents: reais(29.9) }] }),
    p4: await criarPedido({ number: 1004, cliente: "Igreja Batista Central", etapa: "Acabamento", priority: "HIGH", deliveryDate: emDias(3), assignee: "Camila Torres", paymentStatus: "PARTIAL", paidRatio: 0.6, idade: 9, foto: "camiseta-evento",
      items: [{ productId: pecas["Camiseta Gola Careca"].id, description: "Camiseta evento jovem", size: "Vários", color: "Branca", quantity: 200, unitPriceInCents: reais(27.5) }] }),
    p5: await criarPedido({ number: 1005, cliente: "Marta Confecções", etapa: "Pronto", priority: "NORMAL", deliveryDate: emDias(1), paymentStatus: "PAID", idade: 12,
      items: [{ productId: pecas["Avental de Cozinha"].id, description: "Avental brim com bolso", size: "Único", color: "Preto", quantity: 30, unitPriceInCents: reais(34.9) }] }),
    p6: await criarPedido({ number: 1006, cliente: "Escola Municipal Girassol", etapa: "Aguardando material", priority: "NORMAL", deliveryDate: emDias(14), paymentStatus: "PENDING", idade: 1,
      items: [{ productId: pecas["Moletom Canguru"].id, description: "Moletom canguru escolar", size: "10", color: "Marinho", quantity: 60, unitPriceInCents: reais(89.9) }] }),
    p7: await criarPedido({ number: 1007, cliente: "Bar do Zé", etapa: "Recebido", priority: "LOW", deliveryDate: emDias(20), paymentStatus: "PENDING", idade: 0,
      items: [{ productId: pecas["Camisa Polo"].id, description: "Polo garçom bordada", size: "Vários", color: "Preta", quantity: 40, unitPriceInCents: reais(49.9) }] }),
    p8: await criarPedido({ number: 1008, cliente: "Academia Corpo em Movimento", etapa: "Entregue", priority: "NORMAL", deliveryDate: emDias(-4), paymentStatus: "PAID", idade: 20,
      items: [{ productId: pecas["Camiseta Gola Careca"].id, description: "Camiseta dry treino", size: "Vários", color: "Cinza", quantity: 100, unitPriceInCents: reais(32) }] }),
    // Atrasado de propósito: é o cartão vermelho que o visitante precisa ver.
    p9: await criarPedido({ number: 1009, cliente: "Igreja Batista Central", etapa: "Costura", priority: "URGENT", deliveryDate: emDias(-1), assignee: "Camila Torres", paymentStatus: "PARTIAL", paidRatio: 0.3, idade: 7,
      items: [{ productId: pecas["Camiseta Gola Careca"].id, description: "Camiseta retiro (ATRASADA)", size: "Vários", color: "Verde", quantity: 25, unitPriceInCents: reais(30) }] }),
  };

  // ---- Mesas da bancada ----
  const mesas: Record<string, { id: string }> = {};
  for (const m of [
    { name: "Silk 1", position: 1 },
    { name: "Silk 2", position: 2 },
    { name: "Bordado", position: 3 },
  ]) {
    mesas[m.name] = await prisma.mesa.create({ data: { companyId: company.id, name: m.name, position: m.position } });
  }

  // Em andamento agora, para a bancada não abrir vazia.
  for (const emAndamento of [
    { pedido: pedidos.p2, mesa: "Silk 1" },
    { pedido: pedidos.p4, mesa: "Bordado" },
  ]) {
    await prisma.bancadaTask.create({
      data: {
        companyId: company.id,
        orderId: emAndamento.pedido.id,
        mesaId: mesas[emAndamento.mesa].id,
        pickedById: camila.id,
        pickedByName: camila.name,
        status: "PICKED",
        pickedAt: emDias(0),
      },
    });
  }

  // Concluídos, para o relatório de produtividade ter o que mostrar.
  for (const t of [
    { pedido: pedidos.p5, mesa: "Silk 1", noteKind: "NONE", note: null },
    { pedido: pedidos.p8, mesa: "Silk 1", noteKind: "SHORTAGE", note: "Faltaram 2 peças no lote, avisei o gerente." },
    { pedido: pedidos.p8, mesa: "Silk 2", noteKind: "NONE", note: null },
    { pedido: pedidos.p5, mesa: "Silk 2", noteKind: "SURPLUS", note: "Sobraram 3 camisetas de reposição." },
    { pedido: pedidos.p8, mesa: "Bordado", noteKind: "NONE", note: null },
  ]) {
    await prisma.bancadaTask.create({
      data: {
        companyId: company.id,
        orderId: t.pedido.id,
        mesaId: mesas[t.mesa].id,
        pickedById: camila.id,
        pickedByName: camila.name,
        status: "DONE",
        pickedAt: emDias(-2),
        doneAt: emDias(-1),
        noteKind: t.noteKind,
        note: t.note,
      },
    });
  }

  // ---- Solicitações esperando resposta no portal ----
  await prisma.orderRequest.create({
    data: {
      companyId: company.id,
      clientId: marta.id,
      kind: "NEW",
      description: "Quero 40 camisetas pretas com a logo estampada nas costas, tamanho G. Prazo pra daqui 2 semanas.",
      quantity: 40,
      photoUrl: comFotos ? "https://picsum.photos/seed/solicitacao-camiseta/800/600" : null,
      status: "PENDING",
    },
  });
  await prisma.orderRequest.create({
    data: {
      companyId: company.id,
      clientId: marta.id,
      kind: "REORDER",
      referenceOrderId: pedidos.p5.id,
      description: "Preciso de mais 20 aventais iguais ao último pedido (#1005).",
      quantity: 20,
      status: "PENDING",
    },
  });

  return {
    companyId: company.id,
    emailDono: EMPRESA_TESTE.emailDono,
    pedidos: Object.keys(pedidos).length,
  };
}
