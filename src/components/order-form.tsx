"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useActionFeedback } from "@/components/toast";
import { centsToCurrency, centsToInput, moneyToCents, priceExpressionToCents } from "@/lib/format";
import { emptyFormState, type FormState } from "@/lib/form-state";
import { useUnsavedWarning } from "@/components/use-unsaved-warning";

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

export type OrderFormService = {
  name: string;
  priceInCents: number;
};

type EditableService = {
  key: string;
  name: string;
  price: string; // em reais
};

// Serviços já cadastrados: servem só de sugestão ao digitar o nome.
type ServiceSuggestion = { name: string; defaultPriceInCents: number };

type OrderFormDefaults = {
  clientId?: string;
  deliveryDate?: string; // yyyy-mm-dd
  paymentMethod?: string;
  paidReais?: string;
  internalNotes?: string;
  items?: OrderFormItem[];
  services?: OrderFormService[];
};

type OrderFormProps = {
  clients: ClientOption[];
  products: ProductOption[];
  serviceSuggestions?: ServiceSuggestion[];
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

let serviceSeq = 0;
function newService(partial?: Partial<EditableService>): EditableService {
  serviceSeq += 1;
  return { key: `srv-${serviceSeq}`, name: "", price: "", ...partial };
}

export function OrderForm({
  clients,
  products,
  serviceSuggestions = [],
  action,
  submitLabel,
  orderId,
  defaults,
}: OrderFormProps) {
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
          // Campo <input type="number">: exige ponto e envia número ao servidor,
          // então não passa pela leitura de texto. Formato brasileiro aqui quebraria o campo.
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

  const [services, setServices] = useState<EditableService[]>(() =>
    defaults?.services?.length
      ? defaults.services.map((service) =>
          newService({ name: service.name, price: centsToInput(service.priceInCents) }),
        )
      : [],
  );

  const updateService = (key: string, patch: Partial<EditableService>) =>
    setServices((prev) => prev.map((service) => (service.key === key ? { ...service, ...patch } : service)));

  const addService = () => setServices((prev) => [...prev, newService()]);
  const removeService = (key: string) => setServices((prev) => prev.filter((service) => service.key !== key));

  // Ao digitar um nome que já existe no catálogo, sugere o valor de sempre —
  // sem travar: o dono pode digitar outro, que é o motivo de o campo ser livre.
  const onServiceName = (key: string, name: string) => {
    const known = serviceSuggestions.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    setServices((prev) =>
      prev.map((service) => {
        if (service.key !== key) return service;
        const next = { ...service, name };
        if (known && !service.price.trim() && known.defaultPriceInCents > 0) {
          next.price = centsToInput(known.defaultPriceInCents);
        }
        return next;
      }),
    );
  };

  const itemsInCents = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
        const unit = Math.round((Number(item.unitPrice) || 0) * 100);
        return sum + qty * unit;
      }, 0),
    [items],
  );

  const servicesInCents = useMemo(
    () => services.reduce((sum, service) => sum + priceExpressionToCents(service.price), 0),
    [services],
  );

  // Serviço é receita: entra no total que o cliente paga.
  const totalInCents = itemsInCents + servicesInCents;

  // A entrada é controlada para o saldo acompanhar o que está sendo digitado.
  // Usa o mesmo moneyToCents do servidor, então a conta na tela é a que será salva.
  const [paid, setPaid] = useState(defaults?.paidReais ?? "");
  const paidInCents = moneyToCents(paid);
  const balanceInCents = totalInCents - paidInCents;

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

  const servicesJson = JSON.stringify(
    services
      .map((service) => ({ name: service.name.trim(), price: service.price }))
      .filter((service) => service.name.length > 0),
  );

  // "Tem trabalho a perder?" é comparar com o último estado que já está salvo —
  // não com um formulário vazio. Na edição o pedido chega preenchido, e depois
  // de salvar o formulário continua na tela com os mesmos valores: nos dois
  // casos não há nada a perder, e avisar seria falso alarme.
  const snapshot = `${itemsJson}|${servicesJson}|${paid}`;
  const [saved, setSaved] = useState({ snapshot, at: state.success });
  if (state.success && state.success !== saved.at) {
    // Padrão do React de ajustar estado durante o render ao ver algo mudar.
    setSaved({ snapshot, at: state.success });
  }
  useUnsavedWarning(
    snapshot !== saved.snapshot,
    "Você preencheu este pedido e ainda não salvou. Sair agora descarta o que digitou.",
  );

  return (
    <form className="space-y-4" action={formAction}>
      {orderId ? <input type="hidden" name="id" value={orderId} /> : null}
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="services" value={servicesJson} />
      <datalist id="servicos-sugeridos">
        {serviceSuggestions.map((service) => (
          <option key={service.name} value={service.name} />
        ))}
      </datalist>

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

      {/* Serviços cobrados neste pedido: dois campos, digitados na hora. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#405047]">Serviços cobrados</span>
          <button
            type="button"
            onClick={addService}
            className="inline-flex items-center gap-1 rounded-lg border border-[#c7d3ce] bg-white px-3 py-1.5 text-xs font-semibold text-[#405047] transition hover:bg-[#eef4f1]"
          >
            <Plus size={13} aria-hidden="true" />
            Adicionar serviço
          </button>
        </div>

        {services.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] px-3 py-2.5 text-xs text-[#66756d]">
            Silk, bordado, corte... Some no total do pedido. Deixe vazio se este pedido não tem serviço.
          </p>
        ) : (
          services.map((service) => (
            <div key={service.key} className="flex flex-wrap items-end gap-2">
              <label className="min-w-36 flex-1">
                <span className="text-xs font-medium text-[#63736b]">Serviço</span>
                <input
                  list="servicos-sugeridos"
                  value={service.name}
                  onChange={(e) => onServiceName(service.key, e.target.value)}
                  placeholder="Ex.: Silk 3 cores"
                  className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                />
              </label>
              <label className="w-28">
                <span className="text-xs font-medium text-[#63736b]">Valor (R$)</span>
                <input
                  value={service.price}
                  onChange={(e) => updateService(service.key, { price: e.target.value })}
                  placeholder="400,00 ou 4x100"
                  className="mt-1 h-9 w-full rounded-lg border border-[#c7d3ce] px-2 text-sm outline-none ring-[#087f7d]/20 transition focus:border-[#087f7d] focus:ring-4"
                />
              </label>
              <button
                type="button"
                onClick={() => removeService(service.key)}
                title="Remover serviço"
                aria-label="Remover serviço"
                className="mb-0.5 inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3ce] bg-white text-[#9f2f42] transition hover:bg-[#fff0f2]"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))
        )}
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
          value={paid}
          onChange={(event) => setPaid(event.target.value)}
          inputMode="decimal"
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

      <div className="rounded-lg bg-[#eef4f1] px-3 py-2.5 text-sm">
        {servicesInCents > 0 ? (
          <>
            <div className="flex items-center justify-between text-[#66756d]">
              <span>Peças</span>
              <span className="tabular-nums">{centsToCurrency(itemsInCents)}</span>
            </div>
            <div className="flex items-center justify-between text-[#66756d]">
              <span>Serviços</span>
              <span className="tabular-nums">{centsToCurrency(servicesInCents)}</span>
            </div>
          </>
        ) : null}
        <div className={`flex items-center justify-between ${servicesInCents > 0 ? "mt-1 border-t border-[#d5e0da] pt-1" : ""}`}>
          <span className="font-medium text-[#405047]">Total do pedido</span>
          <span className="font-semibold tabular-nums">{centsToCurrency(totalInCents)}</span>
        </div>
        {paidInCents > 0 ? (
          <div className="mt-1 flex items-center justify-between text-[#66756d]">
            <span>Entrada paga</span>
            <span className="tabular-nums">- {centsToCurrency(paidInCents)}</span>
          </div>
        ) : null}
        <div className="mt-1.5 flex items-center justify-between border-t border-[#d5e0da] pt-1.5">
          <span className="font-medium text-[#405047]">
            {balanceInCents < 0 ? "Troco / pago a mais" : "Saldo a receber"}
          </span>
          <span className={`font-semibold tabular-nums ${balanceInCents > 0 ? "text-[#9f2f42]" : "text-[#05605e]"}`}>
            {centsToCurrency(Math.abs(balanceInCents))}
          </span>
        </div>
        {balanceInCents === 0 && totalInCents > 0 ? (
          <p className="mt-1.5 text-xs font-medium text-[#05605e]">Pedido quitado na entrada.</p>
        ) : null}
        {balanceInCents < 0 ? (
          <p className="mt-1.5 text-xs font-medium text-[#7b5a0b]">
            A entrada está maior que o total do pedido. Confira os valores.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-sm font-medium text-[#9f2f42]">{state.error}</p>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
