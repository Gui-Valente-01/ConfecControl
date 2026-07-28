import Link from "next/link";
import { Phone, Users } from "lucide-react";
import { deleteClientAction, updateClientAction } from "@/app/clientes/actions";
import { ClientCreateForm } from "@/components/client-create-form";
import { ClientPortalInvite } from "@/components/client-portal-invite";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { InlineEdit } from "@/components/inline-edit";
import { MetricCard } from "@/components/metric-card";
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
  portalEnabled: boolean;
  inviteToken: string | null;
  _count: { orders: number };
  orders: { totalAmountInCents: number }[];
};

type DbClientsManagerProps = {
  clients: DbClient[];
  canEdit: boolean;
  hasPortal: boolean;
};

export function DbClientsManager({ clients, canEdit, hasPortal }: DbClientsManagerProps) {
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
        ].map(([label, value, note], index) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            note={note}
            icon={index === 2 ? undefined : Users}
            tone={index === 1 ? "neutral" : "primary"}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SectionCard eyebrow="Base comercial" title="Cadastro de clientes">
          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#c7d3ce] bg-[#f8faf9] p-8 text-center">
              <Users className="mx-auto text-[#087f7d]" size={28} aria-hidden="true" />
              <h3 className="mt-3 font-semibold">Nenhum cliente cadastrado</h3>
              <p className="mt-2 text-sm text-[#66756d]">Cadastre o primeiro cliente para iniciar os pedidos reais.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {clients.map((client) => {
                const total = client.orders.reduce((sum, order) => sum + order.totalAmountInCents, 0);
                return (
                  <article key={client.id} className="rounded-lg border border-[#d9e1dd] bg-white p-4 shadow-sm transition hover:border-[#c7d3ce]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg bg-[#e8f6f3] text-[#05605e]">
                          <Users size={20} aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            <Link href={`/clientes/${client.id}`} className="hover:text-[#05605e] hover:underline">
                              {client.name}
                            </Link>
                          </h3>
                          <p className="mt-1 text-sm text-[#66756d]">{client.contact || "Contato não informado"}</p>
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
                          message={`Excluir o cliente ${client.name}? Esta ação não pode ser desfeita.`}
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <p>
                        <span className="block text-[#63736b]">Pedidos</span>
                        <strong>{client._count.orders}</strong>
                      </p>
                      <p>
                        <span className="block text-[#63736b]">Total vendido</span>
                        <strong>{centsToCurrency(total)}</strong>
                      </p>
                      <p className="flex items-end gap-2 text-[#405047]">
                        <Phone size={15} aria-hidden="true" />
                        {client.phone || "(00) 00000-0000"}
                      </p>
                    </div>
                    {canEdit ? (
                      <InlineEdit
                        action={updateClientAction}
                        id={client.id}
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
                    {hasPortal ? (
                      <ClientPortalInvite
                        clientId={client.id}
                        hasEmail={Boolean(client.email)}
                        portalEnabled={client.portalEnabled}
                        inviteToken={client.inviteToken}
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
