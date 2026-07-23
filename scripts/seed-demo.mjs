// Seed de demonstração: cria uma confecção fictícia completa para apresentação.
// Roda com: node --env-file=.env scripts/seed-demo.mjs
// Reexecutar é seguro: apaga a empresa demo anterior (pelo e-mail do dono) e recria.

import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mesmo formato de hash do app (src/lib/auth.ts) para o login funcionar.
function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const OWNER_EMAIL = "dono@costuraviva.com";
const STAFF_PASS = "costura123";
const PORTAL_PASS = "portal123";

const now = new Date();
const inDays = (d) => new Date(now.getTime() + d * 86400000);
const reais = (v) => Math.round(v * 100);

const STAGES = [
  { name: "Recebido", position: 1, color: "#5b68d8", status: "RECEIVED" },
  { name: "Aguardando material", position: 2, color: "#8a6fdb", status: "WAITING_MATERIAL" },
  { name: "Corte", position: 3, color: "#087f7d", status: "CUTTING" },
  { name: "Costura", position: 4, color: "#c88a2b", status: "SEWING" },
  { name: "Bordado/estampa", position: 5, color: "#c87941", status: "EMBROIDERY_PRINT" },
  { name: "Acabamento", position: 6, color: "#c43f54", status: "FINISHING" },
  { name: "Pronto", position: 7, color: "#111a16", status: "READY" },
  { name: "Entregue", position: 8, color: "#66756d", status: "DELIVERED" },
];

async function main() {
  // Limpa uma execução anterior (cascata remove tudo da empresa demo).
  const existingOwner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL }, select: { companyId: true } });
  if (existingOwner) {
    await prisma.company.delete({ where: { id: existingOwner.companyId } });
    console.log("Empresa demo anterior removida.");
  }

  const company = await prisma.company.create({
    data: {
      name: "Costura Viva Confecções",
      document: "12.345.678/0001-90",
      phone: "(41) 3322-1100",
      email: "contato@costuraviva.com",
      address: "Rua das Agulhas, 245 - Curitiba/PR",
      features: ["producao", "estoque", "financeiro", "relatorios", "terceirizadas", "equipe", "portal", "bancada"],
    },
  });
  console.log("Empresa criada:", company.name);

  // ---- Etapas de produção ----
  const stageByName = {};
  for (const s of STAGES) {
    const stage = await prisma.productionStage.create({
      data: { companyId: company.id, name: s.name, position: s.position, color: s.color },
    });
    stageByName[s.name] = { ...stage, status: s.status };
  }

  // ---- Funcionários (um de cada cargo) ----
  const staff = [
    { name: "Marina Prado", email: OWNER_EMAIL, role: "ADMIN", sector: "Direção", phone: "(41) 99988-7766" },
    { name: "Rafael Nunes", email: "gerente@costuraviva.com", role: "MANAGER", sector: "Operação", phone: "(41) 99977-6655" },
    { name: "Camila Torres", email: "producao@costuraviva.com", role: "PRODUCTION", sector: "Costura", phone: "(41) 99966-5544" },
    { name: "Bruno Alves", email: "financeiro@costuraviva.com", role: "FINANCE", sector: "Financeiro", phone: "(41) 99955-4433" },
    { name: "Leticia Ramos", email: "vendas@costuraviva.com", role: "SALES", sector: "Atendimento", phone: "(41) 99944-3322" },
  ];
  const userByRole = {};
  for (const u of staff) {
    const user = await prisma.user.create({
      data: { companyId: company.id, name: u.name, email: u.email, password: hashPassword(STAFF_PASS), role: u.role, sector: u.sector, phone: u.phone },
    });
    userByRole[u.role] = user;
  }
  const camila = userByRole.PRODUCTION;

  // ---- Terceirizada ----
  await prisma.partner.create({
    data: { companyId: company.id, name: "Estamparia Ponto Certo", service: "Estampa e bordado", contact: "Sr. Antônio", phone: "(41) 3011-2233", email: "contato@pontocerto.com" },
  });

  // ---- Clientes (um com portal ativo) ----
  const clientsData = [
    { name: "Escola Municipal Girassol", contact: "Diretora Sônia", phone: "(41) 3212-0001", email: "compras@girassol.edu.br", document: "08.111.222/0001-33" },
    { name: "Academia Corpo em Movimento", contact: "Prof. Diego", phone: "(41) 3212-0002", email: "diego@corpomovimento.com" },
    { name: "Bar do Zé", contact: "José Carlos", phone: "(41) 3212-0003", email: "bardoze@gmail.com" },
    { name: "Igreja Batista Central", contact: "Secretária Rute", phone: "(41) 3212-0004", email: "eventos@ibcentral.org" },
  ];
  const clients = {};
  for (const c of clientsData) {
    const client = await prisma.client.create({ data: { companyId: company.id, ...c } });
    clients[c.name] = client;
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
      passwordHash: hashPassword(PORTAL_PASS),
      portalEnabled: true,
    },
  });
  clients["Marta Confecções"] = marta;

  // ---- Produtos ----
  const productsData = [
    { name: "Camiseta Gola Careca", category: "Camisetas", fabric: "Malha PV", standardPriceInCents: reais(29.9), costInCents: reais(12), averageProductionDays: 5 },
    { name: "Camisa Polo", category: "Polos", fabric: "Piquet", standardPriceInCents: reais(49.9), costInCents: reais(22), averageProductionDays: 7 },
    { name: "Moletom Canguru", category: "Moletons", fabric: "Moletom flanelado", standardPriceInCents: reais(89.9), costInCents: reais(40), averageProductionDays: 10 },
    { name: "Uniforme Escolar", category: "Uniformes", fabric: "Malha PV", standardPriceInCents: reais(39.9), costInCents: reais(16), averageProductionDays: 6 },
    { name: "Avental de Cozinha", category: "Aventais", fabric: "Brim", standardPriceInCents: reais(34.9), costInCents: reais(14), averageProductionDays: 4 },
  ];
  const products = {};
  for (const p of productsData) {
    const product = await prisma.product.create({ data: { companyId: company.id, ...p } });
    products[p.name] = product;
  }

  // ---- Materiais (um abaixo do mínimo para alertar) ----
  const materialsData = [
    { name: "Malha PV branca", category: "Tecido", unit: "kg", currentQuantity: 45, minimumQuantity: 20, supplier: "Malhas Sul" },
    { name: "Linha 120 preta", category: "Aviamento", unit: "cones", currentQuantity: 120, minimumQuantity: 30, supplier: "Aviatex" },
    { name: "Tinta serigrafia", category: "Estamparia", unit: "kg", currentQuantity: 8, minimumQuantity: 12, supplier: "InkPrint" },
    { name: "Ribana", category: "Tecido", unit: "m", currentQuantity: 60, minimumQuantity: 25, supplier: "Malhas Sul" },
    { name: "Botão 18mm", category: "Aviamento", unit: "un", currentQuantity: 3400, minimumQuantity: 500, supplier: "Aviatex" },
  ];
  const materials = {};
  for (const m of materialsData) {
    const material = await prisma.material.create({ data: { companyId: company.id, ...m } });
    materials[m.name] = material;
    if (m.currentQuantity > 0) {
      await prisma.stockMovement.create({ data: { materialId: material.id, type: "IN", quantity: m.currentQuantity, note: "Saldo inicial" } });
    }
  }

  // ---- Ficha técnica (BOM) ----
  await prisma.productMaterial.createMany({
    data: [
      { productId: products["Camiseta Gola Careca"].id, materialId: materials["Malha PV branca"].id, quantityPerUnit: 0.25 },
      { productId: products["Camiseta Gola Careca"].id, materialId: materials["Linha 120 preta"].id, quantityPerUnit: 0.02 },
      { productId: products["Camisa Polo"].id, materialId: materials["Malha PV branca"].id, quantityPerUnit: 0.3 },
      { productId: products["Camisa Polo"].id, materialId: materials["Ribana"].id, quantityPerUnit: 0.2 },
      { productId: products["Camisa Polo"].id, materialId: materials["Botão 18mm"].id, quantityPerUnit: 3 },
    ],
  });

  // ---- Pedidos ----
  async function createOrder(o) {
    const total = o.items.reduce((s, i) => s + i.unitPriceInCents * i.quantity, 0);
    const paid = o.paymentStatus === "PAID" ? total : o.paymentStatus === "PARTIAL" ? Math.round(total * (o.paidRatio ?? 0.5)) : 0;
    const stage = stageByName[o.stage];
    return prisma.order.create({
      data: {
        companyId: company.id,
        clientId: o.client.id,
        number: o.number,
        orderDate: inDays(-(o.age ?? 3)),
        deliveryDate: o.deliveryDate,
        status: stage.status,
        priority: o.priority ?? "NORMAL",
        assignee: o.assignee ?? null,
        paymentStatus: o.paymentStatus,
        totalAmountInCents: total,
        paidAmountInCents: paid,
        paymentMethod: "Pix",
        currentStageId: stage.id,
        items: {
          create: o.items.map((i) => ({
            productId: i.productId ?? null,
            description: i.description,
            size: i.size ?? null,
            color: i.color ?? null,
            quantity: i.quantity,
            unitPriceInCents: i.unitPriceInCents,
            totalPriceInCents: i.unitPriceInCents * i.quantity,
          })),
        },
        payments: { create: { amountInCents: total, status: o.paymentStatus, method: "Pix", paidAt: o.paymentStatus === "PAID" ? inDays(-1) : null } },
        attachments: o.photo ? { create: { name: "Arte do pedido", url: `https://picsum.photos/seed/${o.photo}/800/600`, type: "image/jpeg" } } : undefined,
      },
    });
  }

  const p = products;
  const orders = {};
  orders.o1 = await createOrder({ number: 1001, client: clients["Escola Municipal Girassol"], stage: "Costura", priority: "HIGH", deliveryDate: inDays(5), assignee: "Camila Torres", paymentStatus: "PARTIAL", paidRatio: 0.5, age: 6, photo: "uniforme-escolar",
    items: [{ productId: p["Uniforme Escolar"].id, description: "Uniforme Escolar - camiseta azul", size: "12", color: "Azul", quantity: 120, unitPriceInCents: reais(39.9) }] });
  orders.o2 = await createOrder({ number: 1002, client: clients["Academia Corpo em Movimento"], stage: "Bordado/estampa", priority: "URGENT", deliveryDate: inDays(2), assignee: "Camila Torres", paymentStatus: "PENDING", age: 4, photo: "regata-academia",
    items: [{ productId: p["Camiseta Gola Careca"].id, description: "Regata dry-fit com estampa", size: "M", color: "Preta", quantity: 80, unitPriceInCents: reais(34.9) }] });
  orders.o3 = await createOrder({ number: 1003, client: clients["Bar do Zé"], stage: "Corte", priority: "NORMAL", deliveryDate: inDays(8), paymentStatus: "PENDING", age: 2,
    items: [{ productId: p["Camiseta Gola Careca"].id, description: "Camiseta do bar - estampa costas", size: "G", color: "Vermelha", quantity: 50, unitPriceInCents: reais(29.9) }] });
  orders.o4 = await createOrder({ number: 1004, client: clients["Igreja Batista Central"], stage: "Acabamento", priority: "HIGH", deliveryDate: inDays(3), assignee: "Camila Torres", paymentStatus: "PARTIAL", paidRatio: 0.6, age: 9, photo: "camiseta-evento",
    items: [{ productId: p["Camiseta Gola Careca"].id, description: "Camiseta evento jovem", size: "Vários", color: "Branca", quantity: 200, unitPriceInCents: reais(27.5) }] });
  orders.o5 = await createOrder({ number: 1005, client: clients["Marta Confecções"], stage: "Pronto", priority: "NORMAL", deliveryDate: inDays(1), paymentStatus: "PAID", age: 12,
    items: [{ productId: p["Avental de Cozinha"].id, description: "Avental brim com bolso", size: "Único", color: "Preto", quantity: 30, unitPriceInCents: reais(34.9) }] });
  orders.o6 = await createOrder({ number: 1006, client: clients["Escola Municipal Girassol"], stage: "Aguardando material", priority: "NORMAL", deliveryDate: inDays(14), paymentStatus: "PENDING", age: 1,
    items: [{ productId: p["Moletom Canguru"].id, description: "Moletom canguru escolar", size: "10", color: "Marinho", quantity: 60, unitPriceInCents: reais(89.9) }] });
  orders.o7 = await createOrder({ number: 1007, client: clients["Bar do Zé"], stage: "Recebido", priority: "LOW", deliveryDate: inDays(20), paymentStatus: "PENDING", age: 0,
    items: [{ productId: p["Camisa Polo"].id, description: "Polo garçom bordada", size: "Vários", color: "Preta", quantity: 40, unitPriceInCents: reais(49.9) }] });
  orders.o8 = await createOrder({ number: 1008, client: clients["Academia Corpo em Movimento"], stage: "Entregue", priority: "NORMAL", deliveryDate: inDays(-4), paymentStatus: "PAID", age: 20,
    items: [{ productId: p["Camiseta Gola Careca"].id, description: "Camiseta dry treino", size: "Vários", color: "Cinza", quantity: 100, unitPriceInCents: reais(32) }] });
  orders.o9 = await createOrder({ number: 1009, client: clients["Igreja Batista Central"], stage: "Costura", priority: "URGENT", deliveryDate: inDays(-1), assignee: "Camila Torres", paymentStatus: "PARTIAL", paidRatio: 0.3, age: 7,
    items: [{ productId: p["Camiseta Gola Careca"].id, description: "Camiseta retiro (ATRASADA)", size: "Vários", color: "Verde", quantity: 25, unitPriceInCents: reais(30) }] });

  // ---- Mesas (bancada) ----
  const mesasData = [
    { name: "Silk 1", position: 1 },
    { name: "Silk 2", position: 2 },
    { name: "Bordado", position: 3 },
  ];
  const mesas = {};
  for (const m of mesasData) {
    const mesa = await prisma.mesa.create({ data: { companyId: company.id, name: m.name, position: m.position } });
    mesas[m.name] = mesa;
  }

  // Em andamento agora (PICKED) + concluídos (DONE) para a contagem por mesa.
  await prisma.bancadaTask.create({ data: { companyId: company.id, orderId: orders.o2.id, mesaId: mesas["Silk 1"].id, pickedById: camila.id, pickedByName: camila.name, status: "PICKED", pickedAt: inDays(0) } });
  await prisma.bancadaTask.create({ data: { companyId: company.id, orderId: orders.o4.id, mesaId: mesas["Bordado"].id, pickedById: camila.id, pickedByName: camila.name, status: "PICKED", pickedAt: inDays(0) } });

  const doneTasks = [
    { order: orders.o5, mesa: "Silk 1", noteKind: "NONE", note: null },
    { order: orders.o8, mesa: "Silk 1", noteKind: "SHORTAGE", note: "Faltaram 2 peças no lote, avisei o gerente." },
    { order: orders.o8, mesa: "Silk 2", noteKind: "NONE", note: null },
    { order: orders.o5, mesa: "Silk 2", noteKind: "SURPLUS", note: "Sobraram 3 camisetas de reposição." },
    { order: orders.o8, mesa: "Bordado", noteKind: "NONE", note: null },
  ];
  for (const t of doneTasks) {
    await prisma.bancadaTask.create({
      data: { companyId: company.id, orderId: t.order.id, mesaId: mesas[t.mesa].id, pickedById: camila.id, pickedByName: camila.name, status: "DONE", pickedAt: inDays(-2), doneAt: inDays(-1), noteKind: t.noteKind, note: t.note },
    });
  }

  // ---- Solicitações do portal (cliente Marta) ----
  await prisma.orderRequest.create({
    data: { companyId: company.id, clientId: marta.id, kind: "NEW", description: "Quero 40 camisetas pretas com a logo estampada nas costas, tamanho G. Prazo pra daqui 2 semanas.", quantity: 40, photoUrl: "https://picsum.photos/seed/solicitacao-camiseta/800/600", status: "PENDING" },
  });
  await prisma.orderRequest.create({
    data: { companyId: company.id, clientId: marta.id, kind: "REORDER", referenceOrderId: orders.o5.id, description: "Preciso de mais 20 aventais iguais ao último pedido (#1005).", quantity: 20, status: "PENDING" },
  });

  console.log("\n=== CENÁRIO DE DEMONSTRAÇÃO CRIADO ===");
  console.log("Empresa:", company.name);
  console.log("\nLogins da equipe (senha:", STAFF_PASS + "):");
  for (const u of staff) console.log(`  ${u.role.padEnd(11)} ${u.email}`);
  console.log("\nPortal do cliente:");
  console.log(`  E-mail: ${marta.email}  |  Senha: ${PORTAL_PASS}  |  URL: /portal/entrar`);
  console.log("\nPedidos:", Object.keys(orders).length, "| Clientes: 5 | Produtos: 5 | Mesas: 3 | Solicitações: 2 pendentes");
}

main()
  .then(() => console.log("\nOK."))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
