import { describe, expect, it } from "vitest";
import { formatPhone, resolveSupportContact } from "@/lib/support";

describe("resolveSupportContact", () => {
  it("sem configuracao, nao mostra secao de suporte", () => {
    const contato = resolveSupportContact({});
    expect(contato.hasAny).toBe(false);
    expect(contato.whatsapp).toBeNull();
    expect(contato.email).toBeNull();
    expect(contato.whatsappLink).toBeNull();
  });

  it("monta o link de WhatsApp com a mensagem pronta", () => {
    const contato = resolveSupportContact({ SUPPORT_WHATSAPP: "(41) 99988-7766" });
    expect(contato.hasAny).toBe(true);
    expect(contato.whatsappLink).toContain("https://wa.me/5541999887766");
    expect(contato.whatsappLink).toContain(encodeURIComponent("ConfecControl"));
  });

  it("aceita mensagem propria", () => {
    const contato = resolveSupportContact({ SUPPORT_WHATSAPP: "41999887766" }, "Socorro");
    expect(contato.whatsappLink).toContain(encodeURIComponent("Socorro"));
  });

  it("telefone invalido some, em vez de virar link que nao atende", () => {
    const contato = resolveSupportContact({ SUPPORT_WHATSAPP: "0800" });
    expect(contato.whatsapp).toBeNull();
    expect(contato.hasAny).toBe(false);
  });

  it("e-mail invalido some pelo mesmo motivo", () => {
    expect(resolveSupportContact({ SUPPORT_EMAIL: "suporte@" }).email).toBeNull();
  });

  it("normaliza o e-mail e aceita so ele", () => {
    const contato = resolveSupportContact({ SUPPORT_EMAIL: "  Suporte@ConfecControl.com  " });
    expect(contato.email).toBe("suporte@confeccontrol.com");
    expect(contato.hasAny).toBe(true);
  });

  it("aceita os dois juntos", () => {
    const contato = resolveSupportContact({
      SUPPORT_WHATSAPP: "41999887766",
      SUPPORT_EMAIL: "suporte@confeccontrol.com",
    });
    expect(contato.whatsapp).toBe("41999887766");
    expect(contato.email).toBe("suporte@confeccontrol.com");
  });

  it("string vazia conta como nao configurado", () => {
    expect(resolveSupportContact({ SUPPORT_WHATSAPP: "   ", SUPPORT_EMAIL: "" }).hasAny).toBe(false);
  });
});

describe("formatPhone", () => {
  it("formata celular e fixo para leitura", () => {
    expect(formatPhone("41999887766")).toBe("(41) 99988-7766");
    expect(formatPhone("4132120001")).toBe("(41) 3212-0001");
  });

  it("tira o DDI antes de formatar", () => {
    expect(formatPhone("5541999887766")).toBe("(41) 99988-7766");
  });

  it("devolve como veio quando nao reconhece", () => {
    expect(formatPhone("0800 123")).toBe("0800 123");
  });
});
