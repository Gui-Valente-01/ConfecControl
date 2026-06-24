import { OrderPriority, OrderStatus, PaymentStatus } from "@prisma/client";

export const orderStatusLabels: Record<OrderStatus, string> = {
  RECEIVED: "Recebido",
  WAITING_MATERIAL: "Aguardando material",
  CUTTING: "Corte",
  SEWING: "Costura",
  EMBROIDERY_PRINT: "Bordado/estampa",
  FINISHING: "Acabamento",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PARTIAL: "Parcial",
  PAID: "Pago",
  OVERDUE: "Atrasado",
};

export const orderPriorityLabels: Record<OrderPriority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

// Considera atrasado: tem prazo vencido e ainda não saiu da produção.
export function isOrderLate(deliveryDate: Date | null, status: OrderStatus, reference = new Date()) {
  if (!deliveryDate) return false;
  if (status === "DELIVERED" || status === "CANCELED") return false;
  return deliveryDate < reference;
}

export function stageNameToOrderStatus(stageName: string): OrderStatus {
  const normalized = stageName.toLowerCase();
  if (normalized.includes("material")) return "WAITING_MATERIAL";
  if (normalized.includes("corte")) return "CUTTING";
  if (normalized.includes("costura")) return "SEWING";
  if (normalized.includes("bordado") || normalized.includes("estampa")) return "EMBROIDERY_PRINT";
  if (normalized.includes("acabamento")) return "FINISHING";
  if (normalized.includes("pronto")) return "READY";
  if (normalized.includes("entregue")) return "DELIVERED";
  return "RECEIVED";
}
