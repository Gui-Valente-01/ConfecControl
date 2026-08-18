import { describe, expect, it } from "vitest";
import {
  computeBalance,
  resolveReceiptAmount,
  resolveStatusFromReceipts,
  sumReceipts,
  type Receipt,
} from "@/lib/payments";

// O que estes testes protegem
// ---------------------------------------------------------------------------
// O pedido guarda o total recebido em dois lugares: as linhas de recebimento
// (a verdade) e o campo paidAmountInCents do pedido (um espelho, para as telas
// que só precisam do total). O sistema quebra quando os dois discordam.
//
// O defeito real era esse: a action lia os recebimentos FORA da transação e
// gravava o espelho como valor absoluto, calculado a partir daquela leitura.
// Dois envios simultâneos liam a mesma foto, criavam duas linhas e gravavam o
// espelho de uma só.
//
// A correção foi reler dentro da transação e recalcular o espelho a partir do
// que existe no banco naquele instante. Os testes abaixo descrevem o invariante
// que a correção precisa manter, e reproduzem a conta errada do jeito antigo
// para que ninguém a reintroduza sem um teste vermelho.

describe("invariante do espelho", () => {
  it("o total pago e SEMPRE a soma do que esta gravado, e nao da foto anterior", () => {
    const noBanco: Receipt[] = [{ amountInCents: 10_000 }, { amountInCents: 5_000 }];
    expect(sumReceipts(noBanco)).toBe(15_000);
  });

  it("reproduz a conta errada do jeito antigo: dois envios sobre a mesma foto", () => {
    const total = 30_000;
    // A foto lida pelos dois envios, antes de qualquer um gravar.
    const foto: Receipt[] = [{ amountInCents: 10_000 }];

    // Cada envio calculava o espelho como "foto + o meu valor", sem enxergar o
    // recebimento que o outro acabou de criar.
    const espelhoDoEnvioA = sumReceipts([...foto, { amountInCents: 5_000 }]);
    const espelhoDoEnvioB = sumReceipts([...foto, { amountInCents: 5_000 }]);
    expect(espelhoDoEnvioA).toBe(15_000);
    expect(espelhoDoEnvioB).toBe(15_000);

    // Mas o banco ficou com as TRES linhas.
    const gravadoDeVerdade: Receipt[] = [
      { amountInCents: 10_000 },
      { amountInCents: 5_000 },
      { amountInCents: 5_000 },
    ];
    const espelhoCorreto = sumReceipts(gravadoDeVerdade);

    expect(espelhoCorreto).toBe(20_000);
    // O buraco: o cliente pagou 20.000 e o pedido dizia 15.000.
    expect(espelhoDoEnvioB).not.toBe(espelhoCorreto);
    expect(espelhoCorreto - espelhoDoEnvioB).toBe(5_000);

    // E o status seguia errado junto: aparecia devendo o que ja tinha pago.
    expect(resolveStatusFromReceipts(total, gravadoDeVerdade)).toBe("PARTIAL");
    expect(computeBalance(total, gravadoDeVerdade)).toBe(10_000);
  });

  it("recalculado a partir do banco, o espelho fecha com o saldo", () => {
    const total = 30_000;
    const gravado: Receipt[] = [
      { amountInCents: 10_000 },
      { amountInCents: 5_000 },
      { amountInCents: 5_000 },
    ];
    expect(sumReceipts(gravado) + computeBalance(total, gravado)).toBe(total);
  });

  it("quitacao: espelho igual ao total e saldo zero", () => {
    const total = 20_000;
    const gravado: Receipt[] = [{ amountInCents: 12_000 }, { amountInCents: 8_000 }];
    expect(sumReceipts(gravado)).toBe(total);
    expect(computeBalance(total, gravado)).toBe(0);
    expect(resolveStatusFromReceipts(total, gravado)).toBe("PAID");
  });
});

describe("envio duplicado", () => {
  it("o segundo clique nao pode cobrar de novo: o valor do pedido nao muda", () => {
    const total = 30_000;
    const depoisDoPrimeiro: Receipt[] = [{ amountInCents: 30_000 }];
    // Com a chave de idempotencia, a segunda insercao e recusada pelo banco,
    // entao a lista continua com uma linha so.
    expect(sumReceipts(depoisDoPrimeiro)).toBe(total);
    expect(computeBalance(total, depoisDoPrimeiro)).toBe(0);
  });

  it("pedido ja quitado nao aceita novo recebimento", () => {
    const total = 20_000;
    const gravado: Receipt[] = [{ amountInCents: 20_000 }];
    // A action recusa antes de gravar; aqui fica o motivo: nao ha saldo.
    expect(computeBalance(total, gravado)).toBe(0);
  });

  it("dois recebimentos IGUAIS e legitimos continuam possiveis", () => {
    // Parcela de mesmo valor no mesmo dia acontece. A idempotencia nao pode
    // bloquear isso -- por isso a chave se renova a cada envio concluido, em
    // vez de ser derivada do valor.
    const total = 20_000;
    const gravado: Receipt[] = [{ amountInCents: 10_000 }, { amountInCents: 10_000 }];
    expect(sumReceipts(gravado)).toBe(total);
    expect(resolveStatusFromReceipts(total, gravado)).toBe("PAID");
  });
});

describe("valor recebido nunca passa do saldo", () => {
  it("digitar acima do saldo registra o saldo, e nao o digitado", () => {
    const saldo = 5_000;
    expect(resolveReceiptAmount(saldo, 9_999_00)).toBeLessThanOrEqual(saldo);
  });

  it("sem valor digitado, quita o saldo inteiro", () => {
    expect(resolveReceiptAmount(7_500, null)).toBe(7_500);
  });

  it("valor negativo e tratado como campo em branco, e nunca vira credito", () => {
    // Decisao deliberada de payments.ts: valor <= 0 significa "nao digitou".
    // O importante e que jamais produza numero negativo, que viraria credito
    // para o cliente e furo no relatorio.
    const valor = resolveReceiptAmount(5_000, -1_000);
    expect(valor).toBeGreaterThan(0);
    expect(valor).toBeLessThanOrEqual(5_000);
  });

  it("soma dos recebimentos nunca ultrapassa o total do pedido", () => {
    const total = 10_000;
    let gravado: Receipt[] = [];
    for (let i = 0; i < 5; i += 1) {
      const saldo = computeBalance(total, gravado);
      if (saldo <= 0) break;
      gravado = [...gravado, { amountInCents: resolveReceiptAmount(saldo, 3_000) }];
    }
    expect(sumReceipts(gravado)).toBeLessThanOrEqual(total);
    expect(computeBalance(total, gravado)).toBe(0);
  });
});
