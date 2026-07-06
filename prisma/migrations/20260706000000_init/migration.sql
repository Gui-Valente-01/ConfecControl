-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'PRODUCTION', 'FINANCE', 'SALES');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'WAITING_MATERIAL', 'CUTTING', 'SEWING', 'EMBROIDERY_PRINT', 'FINISHING', 'READY', 'DELIVERED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terceirizadas" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "service" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terceirizadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "sector" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "size" TEXT,
    "color" TEXT,
    "fabric" TEXT,
    "standardPriceInCents" INTEGER NOT NULL DEFAULT 0,
    "costInCents" INTEGER NOT NULL DEFAULT 0,
    "averageProductionDays" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_tecnica" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityPerUnit" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ficha_tecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "assignee" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmountInCents" INTEGER NOT NULL DEFAULT 0,
    "paidAmountInCents" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "internalNotes" TEXT,
    "currentStageId" TEXT,
    "partnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_itens" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceInCents" INTEGER NOT NULL DEFAULT 0,
    "totalPriceInCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedido_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_producao" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapas_producao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL,
    "currentQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minimumQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_estoque" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_document_key" ON "empresas"("document");

-- CreateIndex
CREATE INDEX "terceirizadas_companyId_idx" ON "terceirizadas"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_companyId_idx" ON "usuarios"("companyId");

-- CreateIndex
CREATE INDEX "clientes_companyId_idx" ON "clientes"("companyId");

-- CreateIndex
CREATE INDEX "produtos_companyId_idx" ON "produtos"("companyId");

-- CreateIndex
CREATE INDEX "ficha_tecnica_productId_idx" ON "ficha_tecnica"("productId");

-- CreateIndex
CREATE INDEX "ficha_tecnica_materialId_idx" ON "ficha_tecnica"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "ficha_tecnica_productId_materialId_key" ON "ficha_tecnica"("productId", "materialId");

-- CreateIndex
CREATE INDEX "pedidos_companyId_idx" ON "pedidos"("companyId");

-- CreateIndex
CREATE INDEX "pedidos_clientId_idx" ON "pedidos"("clientId");

-- CreateIndex
CREATE INDEX "pedidos_currentStageId_idx" ON "pedidos"("currentStageId");

-- CreateIndex
CREATE INDEX "pedidos_partnerId_idx" ON "pedidos"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_companyId_number_key" ON "pedidos"("companyId", "number");

-- CreateIndex
CREATE INDEX "pedido_itens_orderId_idx" ON "pedido_itens"("orderId");

-- CreateIndex
CREATE INDEX "pedido_itens_productId_idx" ON "pedido_itens"("productId");

-- CreateIndex
CREATE INDEX "etapas_producao_companyId_idx" ON "etapas_producao"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_producao_companyId_name_key" ON "etapas_producao"("companyId", "name");

-- CreateIndex
CREATE INDEX "historico_status_orderId_idx" ON "historico_status"("orderId");

-- CreateIndex
CREATE INDEX "historico_status_fromStageId_idx" ON "historico_status"("fromStageId");

-- CreateIndex
CREATE INDEX "historico_status_toStageId_idx" ON "historico_status"("toStageId");

-- CreateIndex
CREATE INDEX "materiais_companyId_idx" ON "materiais"("companyId");

-- CreateIndex
CREATE INDEX "movimentos_estoque_materialId_idx" ON "movimentos_estoque"("materialId");

-- CreateIndex
CREATE INDEX "movimentos_estoque_orderId_idx" ON "movimentos_estoque"("orderId");

-- CreateIndex
CREATE INDEX "pagamentos_orderId_idx" ON "pagamentos"("orderId");

-- CreateIndex
CREATE INDEX "anexos_orderId_idx" ON "anexos"("orderId");

-- AddForeignKey
ALTER TABLE "terceirizadas" ADD CONSTRAINT "terceirizadas_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica" ADD CONSTRAINT "ficha_tecnica_productId_fkey" FOREIGN KEY ("productId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica" ADD CONSTRAINT "ficha_tecnica_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "etapas_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "terceirizadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_productId_fkey" FOREIGN KEY ("productId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_producao" ADD CONSTRAINT "etapas_producao_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "etapas_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "etapas_producao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiais" ADD CONSTRAINT "materiais_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

