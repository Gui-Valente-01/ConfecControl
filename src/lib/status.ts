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

// Peso para ordenar "mais importantes em cima" (maior = mais no topo).
export const orderPriorityRank: Record<OrderPriority, number> = {
  URGENT: 3,
  HIGH: 2,
  NORMAL: 1,
  LOW: 0,
};

export const orderPriorityBadge: Record<OrderPriority, string> = {
  URGENT: "border-[#f1c0c9] bg-[#fff0f2] text-[#9f2f42]",
  HIGH: "border-[#ead49c] bg-[#fff7dd] text-[#7b5a0b]",
  NORMAL: "border-[#d9e1dd] bg-[#eef4f1] text-[#405047]",
  LOW: "border-[#e0e6e2] bg-[#f3f6f4] text-[#8a9890]",
};

// Observação que o funcionário registra ao concluir um trabalho na bancada.
export const bancadaNoteLabels: Record<string, string> = {
  NONE: "Sem observação",
  SHORTAGE: "Faltando peça",
  SURPLUS: "Sobrando peça",
  INFO: "Observação",
};

// Só as que merecem destaque; "NONE" não vira etiqueta.
export const bancadaNoteBadge: Record<string, string> = {
  SHORTAGE: "border-[#f1c0c9] bg-[#fff0f2] text-[#9f2f42]",
  SURPLUS: "border-[#ead49c] bg-[#fff7dd] text-[#7b5a0b]",
  INFO: "border-[#d9e1dd] bg-[#eef4f1] text-[#405047]",
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
