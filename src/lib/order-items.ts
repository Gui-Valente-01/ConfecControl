// Regras puras de itens do pedido e status de pagamento (sem banco, sem Next),
// extraídas das server actions para permitir teste unitário.

import type { PaymentStatus } from "@prisma/client";
import { currencyToCents } from "@/lib/format";

export type RawItem = {
  productId?: string | null;
  description?: string;
  size?: string;
  color?: string;
  quantity?: number | string;
  unitPrice?: number | string;
};

export type ParsedItem = {
  productId: string | null;
  description: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPriceInCents: number;
  totalPriceInCents: number;
};

export function parseItems(raw: string): ParsedItem[] {
  let parsed: RawItem[] = [];
  try {
    parsed = JSON.parse(raw) as RawItem[];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const unitPriceInCents =
        typeof item.unitPrice === "number"
          ? Math.round(item.unitPrice * 100)
          : currencyToCents(String(item.unitPrice ?? ""));
      const description = String(item.description ?? "").trim();
      return {
        productId: item.productId ? String(item.productId) : null,
        description,
        size: item.size ? String(item.size).trim() : null,
        color: item.color ? String(item.color).trim() : null,
        quantity,
        unitPriceInCents,
        totalPriceInCents: unitPriceInCents * quantity,
      };
    })
    .filter((item) => item.quantity > 0 && (item.productId || item.description));
}

export function resolvePaymentStatus(paid: number, total: number): PaymentStatus {
  if (paid <= 0) return "PENDING";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}
