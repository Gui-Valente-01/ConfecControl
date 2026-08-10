// Miniaturas fiéis da UI real do produto (mesmos tokens de cor, tipografia e
// raio do app), usadas como visual da landing. Dados ilustrativos.

type MiniOrder = {
  number: string;
  client: string;
  meta: string;
  tone?: "late" | "ok";
};

type MiniColumn = {
  stage: string;
  orders: MiniOrder[];
};

const boardColumns: MiniColumn[] = [
  {
    stage: "Corte",
    orders: [
      { number: "#1042", client: "Malharia Duas Irmãs", meta: "120 un. para 14 jul" },
      { number: "#1044", client: "Rosa Norte", meta: "60 un. para 18 jul" },
    ],
  },
  {
    stage: "Costura",
    orders: [{ number: "#1039", client: "Vale Sul Uniformes", meta: "200 un. para 30 jun", tone: "late" }],
  },
  {
    stage: "Acabamento",
    orders: [{ number: "#1037", client: "Cecília Ateliê", meta: "45 un. para 12 jul", tone: "ok" }],
  },
];

function OrderCard({ order }: { order: MiniOrder }) {
  return (
    <div className="rounded-lg border border-[#d9e1dd] bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-[#63736b]">{order.number}</span>
        {order.tone === "late" ? (
          <span className="rounded-md bg-[#fff0f2] px-1.5 py-0.5 text-[10px] font-semibold text-[#9f2f42]">
            Atrasado
          </span>
        ) : null}
        {order.tone === "ok" ? (
          <span className="rounded-md bg-[#e8f6f3] px-1.5 py-0.5 text-[10px] font-semibold text-[#0f696b]">
            No prazo
          </span>
        ) : null}
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-[#1c2420]">{order.client}</p>
      <p className="mt-0.5 text-[11px] text-[#63736b]">{order.meta}</p>
    </div>
  );
}

// Quadro de produção em miniatura (o mesmo kanban da tela /producao).
export function MiniBoard() {
  return (
    <div className="rounded-2xl border border-[#d9e1dd] bg-[#f8faf9] p-3 shadow-[0_16px_40px_rgba(17,26,22,0.10)]">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-xs font-semibold text-[#405047]">Quadro de produção</p>
        <p className="text-[11px] text-[#8a9890]">hoje</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {boardColumns.map((column) => (
          <div key={column.stage} className="rounded-xl bg-[#eef4f1] p-2">
            <div className="flex items-center justify-between px-0.5 pb-1.5">
              <span className="text-[11px] font-semibold text-[#405047]">{column.stage}</span>
              <span className="rounded bg-white px-1 text-[10px] font-semibold text-[#63736b]">
                {column.orders.length}
              </span>
            </div>
            <div className="space-y-2">
              {column.orders.map((order) => (
                <OrderCard key={order.number} order={order} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Estoque com alerta de mínimo (como na tela /estoque).
export function MiniStock() {
  const rows = [
    { name: "Camiseta gola careca", qty: "12 un.", low: true },
    { name: "Camisa polo", qty: "84 un.", low: false },
    { name: "Boné trucker", qty: "340 un.", low: false },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-[#d9e1dd] bg-white shadow-sm">
      {rows.map((row, i) => (
        <div
          key={row.name}
          className={`flex items-center justify-between gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[#edf2ef]" : ""}`}
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#1c2420]">{row.name}</p>
            <p className="text-[11px] text-[#63736b]">{row.qty} em estoque</p>
          </div>
          {row.low ? (
            <span className="shrink-0 rounded-md bg-[#fff0f2] px-2 py-0.5 text-[10px] font-semibold text-[#9f2f42]">
              Repor
            </span>
          ) : (
            <span className="shrink-0 rounded-md bg-[#e8f6f3] px-2 py-0.5 text-[10px] font-semibold text-[#0f696b]">
              Ok
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Contas a receber por pedido (como na tela /financeiro).
export function MiniFinance() {
  const rows = [
    { order: "#1039 Vale Sul", value: "saldo R$ 1.850", tone: "due" as const },
    { order: "#1042 Duas Irmãs", value: "entrada R$ 900", tone: "partial" as const },
    { order: "#1036 Cecília Ateliê", value: "Pago", tone: "paid" as const },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-[#d9e1dd] bg-white shadow-sm">
      {rows.map((row, i) => (
        <div
          key={row.order}
          className={`flex items-center justify-between gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[#edf2ef]" : ""}`}
        >
          <p className="truncate text-xs font-semibold text-[#1c2420]">{row.order}</p>
          {row.tone === "due" ? (
            <span className="shrink-0 text-[11px] font-semibold text-[#9f2f42]">{row.value}</span>
          ) : row.tone === "partial" ? (
            <span className="shrink-0 text-[11px] font-medium text-[#63736b]">{row.value}</span>
          ) : (
            <span className="shrink-0 rounded-md bg-[#e8f6f3] px-2 py-0.5 text-[10px] font-semibold text-[#0f696b]">
              {row.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Mensagem de status pronta para o WhatsApp (recurso real do detalhe do pedido).
export function MiniChat() {
  return (
    <div className="space-y-2">
      <div className="max-w-[240px] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
        Oi, Marta! O pedido <span className="font-semibold">#1042</span> entrou no acabamento. A entrega
        segue para 14 jul.
      </div>
      <p className="text-[11px] text-[#9eb1a8]">Mensagem montada pelo sistema. Um clique e abre no WhatsApp.</p>
    </div>
  );
}

// Tela compacta no formato celular (a mesma produção, na mão do encarregado).
export function MiniPhone() {
  return (
    <div className="mx-auto w-[260px] rounded-[2rem] border-[6px] border-[#111a16] bg-[#f4f6f5] p-3 shadow-[0_24px_60px_rgba(17,26,22,0.18)]">
      <p className="px-1 text-[11px] font-semibold text-[#405047]">Produção</p>
      <div className="mt-2 space-y-2">
        <OrderCard order={{ number: "#1039", client: "Vale Sul Uniformes", meta: "200 un. para 30 jun", tone: "late" }} />
        <OrderCard order={{ number: "#1042", client: "Malharia Duas Irmãs", meta: "120 un. para 14 jul" }} />
        <OrderCard order={{ number: "#1037", client: "Cecília Ateliê", meta: "45 un. para 12 jul", tone: "ok" }} />
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none mt-3 flex h-9 w-full items-center justify-center rounded-lg bg-[#087f7d] text-xs font-semibold text-white"
      >
        Avançar etapa
      </button>
    </div>
  );
}
