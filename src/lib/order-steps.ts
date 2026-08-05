// Etapas do cadastro de pedido. Sem React e sem banco, para permitir teste.
//
// O formulário mostrava tudo de uma vez: cliente, itens, serviços, prazo,
// pagamento e observações numa tela só. Quem nunca usou um sistema de gestão
// olha aquilo e não sabe por onde começar — e, quando erra, o aviso vem depois
// de rolar a página inteira.
//
// Dividido em cinco passos, cada tela pergunta uma coisa. E, principalmente:
// quando não dá para avançar, o sistema diz o motivo, em vez de só travar.

export const ETAPAS_PEDIDO = [
  { chave: "cliente", titulo: "Cliente", ajuda: "Para quem é este pedido." },
  { chave: "itens", titulo: "Peças e serviços", ajuda: "O que será feito, quanto e por quanto." },
  { chave: "prazo", titulo: "Prazo", ajuda: "Para quando o cliente espera." },
  { chave: "pagamento", titulo: "Pagamento", ajuda: "Quanto já entrou e como." },
  { chave: "revisao", titulo: "Revisão", ajuda: "Confira antes de salvar." },
] as const;

export type EtapaPedido = (typeof ETAPAS_PEDIDO)[number]["chave"];

export const TOTAL_ETAPAS = ETAPAS_PEDIDO.length;

export type DadosPedido = {
  clientId: string;
  itens: { descricao: string; productId: string; quantidade: number }[];
  prazo: string; // yyyy-mm-dd, vazio = sem prazo
  dataPedido: string; // yyyy-mm-dd
  totalInCents: number;
  entradaInCents: number;
};

export type Impedimento = {
  /** O que falta, em linguagem de oficina. */
  motivo: string;
  /** Onde resolver: o name do campo, para a tela levar o cursor até lá. */
  campo?: string;
};

/**
 * O que impede de sair desta etapa. Null = pode seguir.
 *
 * Só barra o que o servidor também barraria, mais o que gera pedido errado sem
 * ninguém perceber (quantidade zero). Prazo em branco passa: confecção fecha
 * pedido sem data combinada o tempo todo, e travar aqui só faria a pessoa
 * inventar uma data para o sistema deixar continuar.
 */
export function impedimentoDaEtapa(etapa: number, dados: DadosPedido): Impedimento | null {
  const chave = ETAPAS_PEDIDO[etapa]?.chave;

  if (chave === "cliente") {
    if (!dados.clientId) {
      return { motivo: "Escolha o cliente do pedido para continuar.", campo: "clientId" };
    }
    return null;
  }

  if (chave === "itens") {
    // A linha preenchida com quantidade zerada vem primeiro de propósito: é o
    // caso mais comum (digitação pela metade) e a mensagem consegue dizer QUAL
    // peça está errada. A frase genérica só entra quando não há o que apontar.
    const semQuantidade = dados.itens.find(
      (i) => (i.productId !== "" || i.descricao.trim() !== "") && i.quantidade <= 0,
    );
    if (semQuantidade) {
      const nome = semQuantidade.descricao.trim() || "uma das peças";
      return { motivo: `A quantidade de ${nome} está zerada. Informe quantas peças serão feitas.` };
    }

    const validos = dados.itens.filter(
      (i) => i.quantidade > 0 && (i.productId !== "" || i.descricao.trim() !== ""),
    );
    if (validos.length === 0) {
      return { motivo: "Adicione ao menos uma peça, com quantidade e descrição." };
    }
    return null;
  }

  if (chave === "prazo") {
    // Prazo antes da data do pedido é quase sempre erro de digitação no ano.
    if (dados.prazo && dados.dataPedido && dados.prazo < dados.dataPedido) {
      return {
        motivo: "O prazo está antes da data do pedido. Confira o dia e o ano.",
        campo: "deliveryDate",
      };
    }
    return null;
  }

  if (chave === "pagamento") {
    if (dados.entradaInCents < 0) {
      return { motivo: "A entrada não pode ser negativa.", campo: "paidAmount" };
    }
    if (dados.entradaInCents > dados.totalInCents) {
      return {
        motivo: "A entrada está maior que o total do pedido. Confira o valor.",
        campo: "paidAmount",
      };
    }
    return null;
  }

  return null;
}

/** Até onde a pessoa pode ir, dado o que já preencheu. */
export function ultimaEtapaLiberada(dados: DadosPedido): number {
  for (let i = 0; i < TOTAL_ETAPAS; i++) {
    if (impedimentoDaEtapa(i, dados)) return i;
  }
  return TOTAL_ETAPAS - 1;
}

/** "Etapa 2 de 5" — a pessoa precisa saber quanto falta. */
export function rotuloProgresso(etapa: number): string {
  return `Etapa ${Math.min(etapa + 1, TOTAL_ETAPAS)} de ${TOTAL_ETAPAS}`;
}
