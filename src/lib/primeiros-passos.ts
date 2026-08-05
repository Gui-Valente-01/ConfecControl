// Lista de primeiros passos. Sem React e sem banco, para permitir teste.
//
// Empresa recém-criada abre o sistema num painel vazio: sem peça, sem material,
// sem pedido. A pessoa não sabe se está funcionando ou se ela é que não achou
// onde mexer. Esta lista diz a ordem, e cada passo marca sozinho quando o dado
// aparece — não há "concluir" para clicar, porque o que vale é o cadastro
// existir, não alguém dizer que fez.
//
// Cinco passos e acabou. Tutorial longo ninguém termina.

export type ContagensIniciais = {
  pecas: number;
  materiais: number;
  pedidos: number;
  pedidosMovidos: number;
  recebimentos: number;
};

export type Passo = {
  chave: "pecas" | "materiais" | "pedido" | "producao" | "pagamento";
  titulo: string;
  /** Por que fazer isso, em uma linha. */
  porque: string;
  href: string;
  feito: boolean;
};

export function montarPassos(c: ContagensIniciais): Passo[] {
  return [
    {
      chave: "pecas",
      titulo: "Cadastre suas peças",
      porque: "O que você produz: boné, camiseta, uniforme. Sem isso não dá para montar um pedido.",
      href: "/produtos",
      feito: c.pecas > 0,
    },
    {
      chave: "materiais",
      titulo: "Cadastre os materiais",
      porque: "Malha, linha, aba. É o que permite o sistema avisar quando algo está acabando.",
      href: "/estoque",
      feito: c.materiais > 0,
    },
    {
      chave: "pedido",
      titulo: "Crie o primeiro pedido",
      porque: "Escolha o cliente, as peças e o prazo. O sistema guia em cinco etapas.",
      href: "/pedidos",
      feito: c.pedidos > 0,
    },
    {
      chave: "producao",
      titulo: "Avance a produção",
      porque: "Mova o pedido de etapa e veja o quadro andar junto.",
      href: "/producao",
      feito: c.pedidosMovidos > 0,
    },
    {
      chave: "pagamento",
      titulo: "Registre um pagamento",
      porque: "Lance a entrada ou o saldo e acompanhe o que falta receber.",
      href: "/financeiro",
      feito: c.recebimentos > 0,
    },
  ];
}

export function quantosFeitos(passos: Passo[]): number {
  return passos.filter((p) => p.feito).length;
}

/** O próximo passo a fazer. Null quando acabou tudo. */
export function proximoPasso(passos: Passo[]): Passo | null {
  return passos.find((p) => !p.feito) ?? null;
}

/**
 * A lista deve aparecer?
 *
 * Some sozinha quando tudo está feito — e também quando a pessoa mandou
 * esconder. Quem já usa o sistema há meses não precisa ver isso todo dia.
 */
export function deveMostrar(passos: Passo[], escondidoPeloUsuario: boolean): boolean {
  if (escondidoPeloUsuario) return false;
  return quantosFeitos(passos) < passos.length;
}

/** "3 de 5 concluídos" */
export function rotuloProgresso(passos: Passo[]): string {
  return `${quantosFeitos(passos)} de ${passos.length} concluídos`;
}
