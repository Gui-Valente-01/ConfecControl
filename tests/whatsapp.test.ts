import { describe, expect, it } from "vitest";
import { whatsappPhone, whatsappUrl } from "@/lib/whatsapp";

describe("whatsappPhone", () => {
  it("limpa a formatacao e completa o DDI do Brasil", () => {
    expect(whatsappPhone("(41) 99988-7766")).toBe("5541999887766");
    expect(whatsappPhone("41 3212-0001")).toBe("554132120001");
  });

  it("nao duplica o DDI em numero que ja veio completo", () => {
    expect(whatsappPhone("5541999887766")).toBe("5541999887766");
    expect(whatsappPhone("+55 (41) 99988-7766")).toBe("5541999887766");
  });

  it("retorna null quando nao ha telefone", () => {
    expect(whatsappPhone("")).toBeNull();
    expect(whatsappPhone(null)).toBeNull();
    expect(whatsappPhone(undefined)).toBeNull();
    expect(whatsappPhone("sem numero")).toBeNull();
  });

  it("numero impossivel nao vira link, para o botao Cobrar sumir", () => {
    expect(whatsappPhone("999")).toBeNull();
    expect(whatsappPhone("(10) 99988-7766")).toBeNull();
    expect(whatsappPhone("419998877669")).toBeNull();
  });
});

describe("whatsappUrl", () => {
  it("monta o link com a mensagem codificada", () => {
    const url = whatsappUrl("(41) 99988-7766", "Olá Bar do Zé! Saldo de R$ 525,00.");
    expect(url).toBe(
      "https://wa.me/5541999887766?text=" +
        encodeURIComponent("Olá Bar do Zé! Saldo de R$ 525,00."),
    );
  });

  it("escapa caracteres que quebrariam a URL", () => {
    const url = whatsappUrl("41999887766", "Pedido #1009 & saldo?");
    expect(url).toContain("%231009");
    expect(url).toContain("%26");
    expect(url).not.toContain("#1009");
  });

  it("retorna null sem telefone, para a tela poder esconder o botao", () => {
    expect(whatsappUrl(null, "oi")).toBeNull();
  });
});
