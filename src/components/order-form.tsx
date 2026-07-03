"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useActionFeedback } from "@/components/toast";
import { centsToCurrency } from "@/lib/format";
import { emptyFormState, type FormState } from "@/lib/form-state";

type ClientOption = { id: string; name: string };
type ProductOption = { id: string; name: string; standardPriceInCents: number };

export type OrderFormItem = {
  productId: string | null;
  description: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unitPriceInCents: number;
};

type EditableItem = {
  key: string;
  productId: string;
  description: string;
  size: string;
  color: string;
  quantity: string;
  unitPrice: string; // em reais
};

type OrderFormDefaults = {
  clientId?: string;
  deliveryDate?: string; // yyyy-mm-dd
  paymentMethod?: string;
  paidReais?: string;
  internalNotes?: string;
  items?: OrderFormItem[];
};

type OrderFormProps = {
  clients: ClientOption[];
  products: ProductOption[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  orderId?: string;
  defaults?: OrderFormDefaults;
};

let rowSeq = 0;
function newRow(partial?: Partial<EditableItem>): EditableItem {
  rowSeq += 1;
  return {
    key: `row-${rowSeq}`,
    productId: "",
    description: "",
    size: "",
    color: "",
    quantity: "1",
    unitPrice: "",
    ...partial,
  };
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#087f7d] px-4 text-sm font-semibold text-white transition hover:bg-[#05605e] disabled:opacity-60"
    >
      <Plus size={17} aria-hidden="true" />
      {pending ? "Salvando..." : label}
    </button>
  );
}

export function OrderForm({ clients, products, action, submitLabel, orderId, defaults }: OrderFormProps) {
  const [state, formAction] = useActionState(action, emptyFormState);
  useActionFeedback(state);

  const [items, setItems] = useState<EditableItem[]>(() => {
    if (defaults?.items?.length) {
      return defaults.items.map((item) =>
        newRow({
          productId: item.productId ?? "",
          description: item.description,
          size: item.size ?? "",
          color: item.color ?? "",
          quantity: String(item.quantity),
          unitPrice: (item.unitPriceInCents / 100).toString(),
        }),
      );
    }
    return [newRow()];
  });

  const updateItem = (key: string, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const onProductChange = (key: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, productId };
        if (product) {
          if (!item.description.trim()) next.description = product.name;
          if (!item.unitPrice.trim() && product.standardPriceInCents > 0) {
            next.unitPrice = (product.standardPriceInCents / 100).toString();
          }
        }
        return next;
      }),
    );
  };

  const addItem = () => setItems((prev) => [...prev, newRow()]);
  const removeItem = (key: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));

  const totalInCents = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
        const unit = Math.round((Number(item.unitPrice) || 0) * 100);
        return sum + qty * unit;
      }, 0),
    [items],
  );

  const itemsJson = JSON.stringify(
    items
      .map((item) => ({
        productId: item.productId || null,
        description: item.description.trim(),
        size: item.size.trim() || null,
        color: item.color.trim() || null,
        quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
        unitPrice: Number(item.unitPrice) || 0,
      }))
      .filter((item) => item.quantity > 0 && (item.productId || item.description)),
  );

  return (
    <form className="space-y-4" action={formAction}>
      {orderId ? <input type="hidden" name="id" value={orderId} /> : null}
      <input type="hidden" name="items" value={itemsJson} />

      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Cliente</span>
        <select
          name="clientId"
          required
          defaultValue={defaults?.clientId ?? ""}
          className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] bg-white px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
        >
          <option value="">Selecione</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#405047]">Itens do pedido</span>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-lg border border-[#c7d3ce] bg-white px-3 py-1.5 text-xs font-semibold text-[#405047] transition hover:bg-[#eef4f1]"
          >
            <Plus size={14} aria-hidden="true" />
            Adicionar item
          </button>
        </div>

        {items.map((item) => (
          <div key={item.key} className="rounded-lg border border-[#d9e1dd] bg-[#f8faf9] p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-[#63736b]">Produto</span>
                <select
                  value={item.productId}
                  onChange={(e) => onProductChange(item.key, e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] bg-white px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                >
                  <option value="">Produto avulso</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#63736b]">Descrição</span>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                  placeholder="Ex.: Camiseta polo branca"
                />
              </label>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium text-[#63736b]">Tam.</span>
                <input
                  value={item.size}
                  onChange={(e) => updateItem(item.key, { size: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                  placeholder="M"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#63736b]">Cor</span>
                <input
                  value={item.color}
                  onChange={(e) => updateItem(item.key, { color: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                  placeholder="Branca"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#63736b]">Qtd.</span>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#63736b]">Preço un. (R$)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                  placeholder="45,00"
                />
              </label>
            </div>
            {items.length > 1 ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#9f2f42]"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Remover item
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-[#405047]">Prazo de entrega</span>
          <input
            name="deliveryDate"
            type="date"
            defaultValue={defaults?.deliveryDate ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[#405047]">Forma de pagamento</span>
          <input
            name="paymentMethod"
            defaultValue={defaults?.paymentMethod ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
            placeholder="Pix, cartão, boleto..."
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Entrada / valor pago (R$)</span>
        <input
          name="paid"
          defaultValue={defaults?.paidReais ?? ""}
          className="mt-1 h-10 w-full rounded-lg border border-[#c7d3ce] px-3 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
          placeholder="1.000,00"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#405047]">Observações internas</span>
        <textarea
          name="notes"
          defaultValue={defaults?.internalNotes ?? ""}
          className="mt-1 min-h-24 w-full rounded-lg border border-[#c7d3ce] px-3 py-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
        />
      </label>

      <div className="flex items-center justify-between rounded-lg bg-[#eef4f1] px-3 py-2 text-sm">
        <span className="font-medium text-[#405047]">Total do pedido</span>
        <span className="font-semibold">{centsToCurrency(totalInCents)}</span>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
