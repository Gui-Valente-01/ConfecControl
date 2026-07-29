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

// Serviços cobrados no pedido (silk, bordado, corte...). São digitados na hora,
// com nome e valor livres, porque o mesmo serviço raramente sai pelo mesmo preço
// em dois pedidos. Entram como receita: somam no total que o cliente paga.

export type RawService = {
  name?: string;
  price?: number | string;
};

export type ParsedService = {
  name: string;
  priceInCents: number;
};

export function parseServices(raw: string): ParsedService[] {
  let parsed: RawService[] = [];
  try {
    parsed = JSON.parse(raw) as RawService[];
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((service) => ({
      name: String(service.name ?? "").trim(),
      priceInCents:
        typeof service.price === "number"
          ? Math.round(service.price * 100)
          : currencyToCents(String(service.price ?? "")),
    }))
    // Linha em branco é descartada; serviço de cortesia (valor 0) é mantido.
    .filter((service) => service.name.length > 0 && service.priceInCents >= 0);
}

export function resolvePaymentStatus(paid: number, total: number): PaymentStatus {
  if (paid <= 0) return "PENDING";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}
