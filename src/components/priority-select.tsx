"use client";

import { useActionState, useRef } from "react";
import type { OrderPriority } from "@prisma/client";
import { setOrderPriorityAction } from "@/app/pedidos/actions";
import { useActionFeedback } from "@/components/toast";
import { emptyFormState } from "@/lib/form-state";
import { orderPriorityBadge, orderPriorityLabels } from "@/lib/status";

const options: OrderPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

// Seletor de prioridade que salva sozinho ao mudar (gerente/dono).
export function PrioritySelect({ orderId, value }: { orderId: string; value: OrderPriority }) {
  const [state, formAction] = useActionState(setOrderPriorityAction, emptyFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useActionFeedback(state);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="id" value={orderId} />
      <select
        name="priority"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Prioridade do pedido"
        className={`h-8 rounded-md border px-2 text-xs font-semibold outline-none ring-primary/20 transition focus:ring-4 ${orderPriorityBadge[value]}`}
      >
        {options.map((priority) => (
          <option key={priority} value={priority}>
            {orderPriorityLabels[priority]}
          </option>
        ))}
      </select>
    </form>
  );
}
