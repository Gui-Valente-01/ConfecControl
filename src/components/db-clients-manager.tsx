import { Phone, Users } from "lucide-react";
import { deleteClientAction, updateClientAction } from "@/app/clientes/actions";
import { ClientCreateForm } from "@/components/client-create-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { InlineEdit } from "@/components/inline-edit";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { centsToCurrency } from "@/lib/format";

type DbClient = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  _count: { orders: number };
  orders: { totalAmountInCents: number }[];
};

type DbClientsManagerProps = {
  clients: DbClient[];
  canEdit: boolean;
};

export function DbClientsManager({ clients, canEdit }: DbClientsManagerProps) {
  const activeClients = clients.filter((client) => client._count.orders > 0).length;
  const newClients = clients.length - activeClients;
  const totalValue = clients.reduce(
    (sum, client) => sum + client.orders.reduce((clientSum, order) => clientSum + order.totalAmountInCents, 0),
    0,
  );

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Clientes ativos", String(activeClients), "já possuem pedidos"],
          ["Clientes novos", String(newClients), "sem pedido cadastrado"],
          ["Total vendido", centsToCurrency(totalValue), "somando pedidos reais"],
        ].map(([label, value, note]) => (
          <article key={label} className="rounded-lg border border-[#ded7ca] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#766d5d]">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
            <p className="mt-4 text-sm text-[#6f675b]">{note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SectionCard eyebrow="Base comercial" title="Cadastro de clientes">
          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d8cfbf] bg-[#fbf8f1] p-8 text-center">
              <Users className="mx-auto text-[#0f8b8d]" size={28} aria-hidden="true" />
              <h3 className="mt-3 font-semibold">Nenhum cliente cadastrado</h3>
              <p className="mt-2 text-sm text-[#6f675b]">Cadastre o primeiro cliente para iniciar os pedidos reais.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {clients.map((client) => {
                const total = client.orders.reduce((sum, order) => sum + order.totalAmountInCents, 0);
                return (
                  <article key={client.id} className="rounded-lg border border-[#e3dbcd] bg-[#fbf8f1] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg bg-white text-[#0f8b8d]">
                          <Users size={20} aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{client.name}</h3>
                          <p className="mt-1 text-sm text-[#6f675b]">{client.contact || "Contato não informado"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={client._count.orders > 0 ? "good" : "dark"}>
                          {client._count.orders > 0 ? "Ativo" : "Novo"}
                        </StatusBadge>
                        <ConfirmDeleteButton
                          action={deleteClientAction}
                          id={client.id}
                          title="Remover cliente"
                          message={`Excluir o cliente ${client.name}? Esta acao não pode ser desfeita.`}
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <p>
                        <span className="block text-[#766d5d]">Pedidos</span>
                        <strong>{client._count.orders}</strong>
                      </p>
                      <p>
                        <span className="block text-[#766d5d]">Total vendido</span>
                        <strong>{centsToCurrency(total)}</strong>
                      </p>
                      <p className="flex items-end gap-2 text-[#544d43]">
                        <Phone size={15} aria-hidden="true" />
                        {client.phone || "(00) 00000-0000"}
                      </p>
                    </div>
                    {canEdit ? (
                      <InlineEdit
                        action={updateClientAction}
                        id={client.id}
                        message="Cliente atualizado."
                        fields={[
                          { name: "name", label: "Nome", defaultValue: client.name, required: true },
                          { name: "contact", label: "Contato", defaultValue: client.contact ?? "" },
                          { name: "phone", label: "WhatsApp", defaultValue: client.phone ?? "" },
                          { name: "email", label: "E-mail", defaultValue: client.email ?? "", type: "email" },
                          { name: "document", label: "CPF/CNPJ", defaultValue: client.document ?? "" },
                          { name: "address", label: "Endereço", defaultValue: client.address ?? "" },
                          { name: "notes", label: "Observações", defaultValue: client.notes ?? "", textarea: true },
                        ]}
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard eyebrow="Novo cadastro" title="Adicionar cliente">
          <ClientCreateForm />
        </SectionCard>
      </section>
    </>
  );
}
