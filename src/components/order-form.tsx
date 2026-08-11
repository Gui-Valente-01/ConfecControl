"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useActionFeedback } from "@/components/toast";
import { centsToCurrency, centsToInput, moneyToCents, priceExpressionToCents } from "@/lib/format";
import { describeAtypicalPrices, findAtypicalPrices } from "@/lib/price-check";
import { emptyFormState, type FormState } from "@/lib/form-state";
import {
  ETAPAS_PEDIDO,
  TOTAL_ETAPAS,
  impedimentoDaEtapa,
  rotuloProgresso,
  ultimaEtapaLiberada as liberadoAte,
  type DadosPedido,
} from "@/lib/order-steps";
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
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
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

  // Valor muito longe do preço cadastrado é quase sempre vírgula no lugar
  // errado. Só compara com peça que tem preço padrão: sem referência, cala.
  const atypical = useMemo(() => {
    // A chave da linha entra no label para o aviso saber em qual campo pousar,
    // e sai de novo na hora de montar o texto: duas peças podem ter o mesmo nome.
    const entradas = items.flatMap((item) => {
      const product = products.find((option) => option.id === item.productId);
      if (!product) return [];
      return [
        {
          label: `${item.key} ${item.description.trim() || product.name}`,
          typedInCents: Math.round((Number(item.unitPrice) || 0) * 100),
          referenceInCents: product.standardPriceInCents,
        },
      ];
    });

    return findAtypicalPrices(entradas).map((achado) => {
      // A chave é "row-N", sem espaço; a descrição tem. Corta no primeiro só.
      const corte = achado.label.indexOf(" ");
      return { ...achado, key: achado.label.slice(0, corte), label: achado.label.slice(corte + 1) };
    });
  }, [items, products]);

  const atypicalKeys = new Set(atypical.map((item) => item.key));

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

  // ---- Etapas ----
  //
  // Nenhum campo é desmontado ao trocar de etapa: as seções escondidas ficam no
  // formulário com display:none. Se fossem removidas da tela, o que a pessoa
  // digitou sumiria do envio — e voltar uma etapa perderia o trabalho.
  const [etapa, setEtapa] = useState(0);
  const [tentouAvancar, setTentouAvancar] = useState(false);

  const [clientId, setClientId] = useState(defaults?.clientId ?? "");
  const [prazo, setPrazo] = useState(defaults?.deliveryDate ?? "");
  const hoje = new Date();
  const dataPedidoISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const dadosEtapas: DadosPedido = {
    clientId,
    itens: items.map((item) => ({
      descricao: item.description,
      productId: item.productId,
      quantidade: Math.floor(Number(item.quantity) || 0),
    })),
    prazo,
    // Na edição o pedido já existe; comparar com hoje acusaria prazo antigo à toa.
    dataPedido: orderId ? "" : dataPedidoISO,
    totalInCents,
    entradaInCents: paidInCents,
  };

  const impedimento = impedimentoDaEtapa(etapa, dadosEtapas);
  const ehUltima = etapa === TOTAL_ETAPAS - 1;
  const clienteEscolhido = clients.find((c) => c.id === clientId);

  // Num pedido que já existe, tudo está preenchido e válido: obrigar a passar
  // pelas cinco etapas para trocar uma data seria pior do que antes. Aqui a
  // pessoa pula direto para a etapa que quer — até onde os dados permitem.
  const liberadaAte = liberadoAte(dadosEtapas);
  const podeIrPara = (indice: number) => indice <= etapa || indice <= liberadaAte;

  const avancar = () => {
    if (impedimento) {
      setTentouAvancar(true);
      if (impedimento.campo) {
        const alvo = document.querySelector<HTMLElement>(`[name="${impedimento.campo}"]`);
        alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
        alvo?.focus({ preventScroll: true });
      }
      return;
    }
    setTentouAvancar(false);
    setEtapa((n) => Math.min(n + 1, TOTAL_ETAPAS - 1));
  };

  const voltar = () => {
    setTentouAvancar(false);
    setEtapa((n) => Math.max(n - 1, 0));
  };

  // Só a seção da etapa atual aparece. A classe fica num invólucro próprio, e
  // não no elemento que já tem grid/flex, para as duas regras de display não
  // brigarem — foi assim que um botão continuou visível quando devia sumir.
  const secao = (indice: number, classe = "space-y-4") =>
    etapa === indice ? classe : "hidden";

  const itensValidos = items.filter(
    (i) => Math.floor(Number(i.quantity) || 0) > 0 && (i.productId || i.description.trim()),
  );
  const servicosValidos = services.filter((s) => s.name.trim().length > 0);

  return (
    <form
      className="space-y-4"
      action={formAction}
      onSubmit={(event) => {
        // Enter no meio do formulário não pode salvar um pedido pela metade:
        // só a última etapa envia de verdade.
        if (!ehUltima) {
          event.preventDefault();
          avancar();
          return;
        }
        // Não bloqueia: o preço fora da curva pode ser proposital. Só obriga a
        // olhar uma vez, que é o que falta para a vírgula errada não passar.
        const aviso = describeAtypicalPrices(atypical);
        if (aviso && !window.confirm(aviso)) event.preventDefault();
      }}
    >
      {/* Onde estou e quanto falta. */}
      <nav aria-label="Etapas do pedido" className="rounded-xl border border-line bg-surface p-3">
        <ol className="flex flex-wrap items-center gap-1.5">
          {ETAPAS_PEDIDO.map((passo, indice) => {
            const feita = indice < etapa;
            const atual = indice === etapa;
            return (
              <li key={passo.chave} className="flex items-center gap-1.5">
                <button
                  type="button"
                  // Voltar sempre pode. Pular para frente só até onde os dados
                  // já preenchidos permitem — senão driblaria a conferência.
                  onClick={() => podeIrPara(indice) && setEtapa(indice)}
                  disabled={!podeIrPara(indice)}
                  aria-current={atual ? "step" : undefined}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition ${
                    atual
                      ? "bg-primary font-semibold text-white"
                      : feita
                        ? "text-primary-dark hover:bg-primary-soft"
                        : "cursor-not-allowed text-faint"
                  }`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      atual ? "bg-surface text-primary" : feita ? "bg-primary text-white" : "bg-tint text-soft"
                    }`}
                  >
                    {feita ? <Check size={12} aria-hidden="true" /> : indice + 1}
                  </span>
                  <span className={atual ? "" : "hidden sm:inline"}>{passo.titulo}</span>
                </button>
                {indice < TOTAL_ETAPAS - 1 ? (
                  <span className="text-line-strong" aria-hidden="true">
                    ›
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-muted">
          <strong className="font-semibold text-body">{rotuloProgresso(etapa)}</strong>
          {" — "}
          {ETAPAS_PEDIDO[etapa].ajuda}
        </p>
      </nav>
      {orderId ? <input type="hidden" name="id" value={orderId} /> : null}
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="services" value={servicesJson} />
      <datalist id="servicos-sugeridos">
        {serviceSuggestions.map((service) => (
          <option key={service.name} value={service.name} />
        ))}
      </datalist>

      {/* ETAPA 1 — Cliente */}
      <div className={secao(0)}>
        <label className="block">
          <span className="text-sm font-medium text-body">
            Cliente <span className="text-danger-dark">*</span>
          </span>
          <select
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:h-10 sm:text-sm"
          >
            <option value="">Selecione o cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs text-muted">
            O cliente precisa estar cadastrado antes. Se não estiver na lista, cadastre em Mais → Clientes.
          </span>
        </label>
      </div>

      {/* ETAPA 2 — Peças e serviços */}
      <div className={secao(1)}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-body">Itens do pedido</span>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-body transition hover:bg-tint"
          >
            <Plus size={14} aria-hidden="true" />
            Adicionar item
          </button>
        </div>

        {items.map((item) => (
          <div key={item.key} className="rounded-lg border border-line bg-canvas p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-muted">Produto</span>
                <select
                  value={item.productId}
                  onChange={(e) => onProductChange(item.key, e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-line-strong bg-surface px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                >
                  <option value="">Produto avulso</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Descrição</span>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                  placeholder="Ex.: Camiseta polo branca"
                />
              </label>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium text-muted">Tam.</span>
                <input
                  value={item.size}
                  onChange={(e) => updateItem(item.key, { size: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                  placeholder="M"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Cor</span>
                <input
                  value={item.color}
                  onChange={(e) => updateItem(item.key, { color: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                  placeholder="Branca"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Qtd.</span>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Preço un. (R$)</span>
                {/* Sem aria-invalid neste campo: preço fora da curva é aviso, não
                    recusa. O valor continua válido e salvável, então não pode usar
                    a marcação (nem o vermelho) de campo errado. */}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })}
                  data-cc-atypical={atypicalKeys.has(item.key) ? "true" : undefined}
                  className={`mt-1 h-9 w-full rounded-lg border px-2 text-sm outline-none transition focus:ring-4 ${
                    atypicalKeys.has(item.key)
                      ? "border-[#d9a03a] bg-warning-soft ring-[#d9a03a]/20 focus:border-warning"
                      : "border-line-strong ring-primary/20 focus:border-primary"
                  }`}
                  placeholder="45,00"
                />
              </label>
            </div>
            {atypicalKeys.has(item.key) ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning-soft px-2.5 py-2 text-xs leading-5 text-warning-ink">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Esse preço está bem longe do cadastrado para a peça (
                  {centsToCurrency(products.find((option) => option.id === item.productId)?.standardPriceInCents ?? 0)}).
                  Confira a vírgula. Se for esse mesmo, pode salvar.
                </span>
              </p>
            ) : null}
            {items.length > 1 ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-danger-dark"
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
          <span className="text-sm font-semibold text-body">Serviços cobrados</span>
          <button
            type="button"
            onClick={addService}
            className="inline-flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-body transition hover:bg-tint"
          >
            <Plus size={13} aria-hidden="true" />
            Adicionar serviço
          </button>
        </div>

        {services.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-canvas px-3 py-2.5 text-xs text-muted">
            Silk, bordado, corte... Some no total do pedido. Deixe vazio se este pedido não tem serviço.
          </p>
        ) : (
          services.map((service) => (
            <div key={service.key} className="flex flex-wrap items-end gap-2">
              <label className="min-w-36 flex-1">
                <span className="text-xs font-medium text-muted">Serviço</span>
                <input
                  list="servicos-sugeridos"
                  value={service.name}
                  onChange={(e) => onServiceName(service.key, e.target.value)}
                  placeholder="Ex.: Silk 3 cores"
                  className="mt-1 h-9 w-full rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                />
              </label>
              <label className="w-28">
                <span className="text-xs font-medium text-muted">Valor (R$)</span>
                <input
                  value={service.price}
                  onChange={(e) => updateService(service.key, { price: e.target.value })}
                  placeholder="400,00 ou 4x100"
                  className="mt-1 h-9 w-full rounded-lg border border-line-strong px-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                />
              </label>
              <button
                type="button"
                onClick={() => removeService(service.key)}
                title="Remover serviço"
                aria-label="Remover serviço"
                className="mb-0.5 inline-flex size-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-danger-dark transition hover:bg-danger-soft"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))
        )}
      </div>

      </div>

      {/* ETAPA 3 — Prazo e produção */}
      <div className={secao(2)}>
        <label className="block">
          <span className="text-sm font-medium text-body">Prazo de entrega</span>
          <input
            name="deliveryDate"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-line-strong px-3 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:h-10 sm:text-sm"
          />
          <span className="mt-1.5 block text-xs text-muted">
            Pode ficar em branco se ainda não combinou a data. É esse prazo que faz o pedido aparecer
            como atrasado no Início.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-body">Observações internas</span>
          <textarea
            name="notes"
            defaultValue={defaults?.internalNotes ?? ""}
            className="mt-1 min-h-24 w-full rounded-lg border border-line-strong px-3 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:text-sm"
            placeholder="Ex.: arte aprovada em 28/07; entregar em duas remessas."
          />
          <span className="mt-1.5 block text-xs text-muted">
            Só a sua equipe vê. O cliente não enxerga isso no portal.
          </span>
        </label>
      </div>

      {/* ETAPA 4 — Pagamento */}
      <div className={secao(3)}>
        <label className="block">
          <span className="text-sm font-medium text-body">Entrada / valor já pago (R$)</span>
          <input
            name="paid"
            value={paid}
            onChange={(event) => setPaid(event.target.value)}
            inputMode="decimal"
            className="mt-1 h-11 w-full rounded-lg border border-line-strong px-3 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:h-10 sm:text-sm"
            placeholder="1.000,00"
          />
          <span className="mt-1.5 block text-xs text-muted">
            Quanto o cliente já pagou agora. Deixe em branco se não pagou nada ainda — o saldo aparece
            no Financeiro para você cobrar depois.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-body">Forma de pagamento</span>
          <input
            name="paymentMethod"
            defaultValue={defaults?.paymentMethod ?? ""}
            className="mt-1 h-11 w-full rounded-lg border border-line-strong px-3 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:h-10 sm:text-sm"
            placeholder="Pix, cartão, boleto..."
          />
        </label>
      </div>

      {/* ETAPA 5 — Revisão: o resumo do que será salvo. */}
      <div className={secao(4)}>
        <div className="rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold text-fg">Confira antes de salvar</h3>

          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Cliente</dt>
              <dd className="text-right font-medium">{clienteEscolhido?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Prazo</dt>
              <dd className="text-right font-medium">
                {prazo ? prazo.split("-").reverse().join("/") : "sem prazo combinado"}
              </dd>
            </div>
          </dl>

          <div className="mt-3 border-t border-divider pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-soft">
              {itensValidos.length === 1 ? "1 peça" : `${itensValidos.length} peças`}
            </p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {itensValidos.map((item) => (
                <li key={item.key} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {item.description.trim() || products.find((p) => p.id === item.productId)?.name || "Peça"}
                    <span className="text-soft"> × {Math.floor(Number(item.quantity) || 0)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {centsToCurrency(Math.round((Number(item.unitPrice) || 0) * 100) * Math.floor(Number(item.quantity) || 0))}
                  </span>
                </li>
              ))}
            </ul>

            {servicosValidos.length > 0 ? (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-soft">Serviços</p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {servicosValidos.map((s) => (
                    <li key={s.key} className="flex justify-between gap-3">
                      <span className="min-w-0">{s.name}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {centsToCurrency(priceExpressionToCents(s.price))}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* O total acompanha em todas as etapas: é o número que a pessoa confere
          o tempo todo enquanto monta o pedido. */}
      <div className="rounded-lg bg-tint px-3 py-2.5 text-sm">
        {servicesInCents > 0 ? (
          <>
            <div className="flex items-center justify-between text-muted">
              <span>Peças</span>
              <span className="tabular-nums">{centsToCurrency(itemsInCents)}</span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span>Serviços</span>
              <span className="tabular-nums">{centsToCurrency(servicesInCents)}</span>
            </div>
          </>
        ) : null}
        <div className={`flex items-center justify-between ${servicesInCents > 0 ? "mt-1 border-t border-line pt-1" : ""}`}>
          <span className="font-medium text-body">Total do pedido</span>
          <span className="font-semibold tabular-nums">{centsToCurrency(totalInCents)}</span>
        </div>
        {paidInCents > 0 ? (
          <div className="mt-1 flex items-center justify-between text-muted">
            <span>Entrada paga</span>
            <span className="tabular-nums">- {centsToCurrency(paidInCents)}</span>
          </div>
        ) : null}
        <div className="mt-1.5 flex items-center justify-between border-t border-line pt-1.5">
          <span className="font-medium text-body">
            {balanceInCents < 0 ? "Troco / pago a mais" : "Saldo a receber"}
          </span>
          <span className={`font-semibold tabular-nums ${balanceInCents > 0 ? "text-danger-dark" : "text-primary-dark"}`}>
            {centsToCurrency(Math.abs(balanceInCents))}
          </span>
        </div>
        {balanceInCents === 0 && totalInCents > 0 ? (
          <p className="mt-1.5 text-xs font-medium text-primary-dark">Pedido quitado na entrada.</p>
        ) : null}
        {balanceInCents < 0 ? (
          <p className="mt-1.5 text-xs font-medium text-warning-ink">
            A entrada está maior que o total do pedido. Confira os valores.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-dark">{state.error}</p>
      ) : null}

      {/* Por que não dá para continuar. Aparece só depois de tentar: avisar
          antes da pessoa fazer nada é reclamar de um erro que ainda não houve. */}
      {impedimento && tentouAvancar ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2.5 text-sm text-warning-ink"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {impedimento.motivo}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-4">
        {etapa > 0 ? (
          <button
            type="button"
            onClick={voltar}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-body transition hover:bg-canvas"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar
          </button>
        ) : null}

        <div className="flex-1" />

        {ehUltima ? (
          <SubmitButton label={submitLabel} />
        ) : (
          <button
            type="button"
            onClick={avancar}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            Continuar
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
