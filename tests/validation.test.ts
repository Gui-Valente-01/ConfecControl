import { describe, expect, it } from "vitest";
import {
  isValidCNPJ,
  isValidCPF,
  isValidDocument,
  isValidEmail,
  isValidPhone,
  problemaDaSenha,
  validateContactFields,
} from "@/lib/validation";

describe("isValidPhone", () => {
  it("aceita celular e fixo com DDD", () => {
    expect(isValidPhone("(41) 99988-7766")).toBe(true);
    expect(isValidPhone("41999887766")).toBe(true);
    expect(isValidPhone("(41) 3212-0001")).toBe(true);
  });

  it("aceita com o 55 na frente, como muitos cadastros vem", () => {
    expect(isValidPhone("5541999887766")).toBe(true);
    expect(isValidPhone("+55 (41) 99988-7766")).toBe(true);
  });

  it("recusa DDD que nao existe", () => {
    expect(isValidPhone("(10) 99988-7766")).toBe(false);
    expect(isValidPhone("(00) 99988-7766")).toBe(false);
    expect(isValidPhone("(20) 99988-7766")).toBe(false);
  });

  it("recusa quantidade de digitos impossivel", () => {
    expect(isValidPhone("419998877")).toBe(false);
    expect(isValidPhone("419998877669")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
  });

  it("recusa celular que nao comeca com 9", () => {
    expect(isValidPhone("41899887766")).toBe(false);
  });

  it("recusa fixo comecando com 0, 1, 8 ou 9", () => {
    expect(isValidPhone("4132120001")).toBe(true);
    expect(isValidPhone("4112120001")).toBe(false);
    expect(isValidPhone("4192120001")).toBe(false);
  });

  it("vazio nao e telefone valido", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone(null)).toBe(false);
  });
});

describe("isValidCPF", () => {
  it("aceita CPF com digito verificador correto", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
  });

  it("recusa digito verificador errado", () => {
    expect(isValidCPF("529.982.247-26")).toBe(false);
    expect(isValidCPF("12345678900")).toBe(false);
  });

  it("recusa numeros repetidos, que passam na conta mas nao existem", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
  });

  it("recusa tamanho errado", () => {
    expect(isValidCPF("5299822472")).toBe(false);
  });
});

describe("isValidCNPJ", () => {
  it("aceita CNPJ valido", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
  });

  it("recusa digito errado e repetidos", () => {
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
    expect(isValidCNPJ("11111111111111")).toBe(false);
  });
});

describe("isValidDocument", () => {
  it("decide pelo tamanho", () => {
    expect(isValidDocument("529.982.247-25")).toBe(true);
    expect(isValidDocument("11.222.333/0001-81")).toBe(true);
  });

  it("recusa tamanho que nao e nem CPF nem CNPJ", () => {
    expect(isValidDocument("1234567")).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("aceita endereco comum", () => {
    expect(isValidEmail("dono@costuraviva.com")).toBe(true);
    expect(isValidEmail("maria.souza+pedidos@empresa.com.br")).toBe(true);
  });

  it("recusa formato quebrado", () => {
    expect(isValidEmail("dono@")).toBe(false);
    expect(isValidEmail("@empresa.com")).toBe(false);
    expect(isValidEmail("dono costuraviva.com")).toBe(false);
    expect(isValidEmail("dono@empresa")).toBe(false);
    expect(isValidEmail("dono@empresa..com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("validateContactFields", () => {
  it("campo em branco passa: sao todos opcionais", () => {
    expect(validateContactFields({ phone: "", document: "", email: "" })).toBeNull();
    expect(validateContactFields({})).toBeNull();
  });

  it("aponta qual campo esta errado, para a tela destacar", () => {
    expect(validateContactFields({ phone: "123" })?.field).toBe("phone");
    expect(validateContactFields({ document: "111" })?.field).toBe("document");
    expect(validateContactFields({ email: "quebrado@" })?.field).toBe("email");
  });

  it("dado correto passa", () => {
    expect(
      validateContactFields({
        phone: "(41) 99988-7766",
        document: "529.982.247-25",
        email: "dono@costuraviva.com",
      }),
    ).toBeNull();
  });
});

describe("problemaDaSenha", () => {
  it("recusa senha curta: 6 caracteres se quebram offline em minutos", () => {
    expect(problemaDaSenha("abc123")).toContain("10 caracteres");
    expect(problemaDaSenha("123456789")).toContain("10 caracteres");
  });

  it("aceita senha com o tamanho minimo", () => {
    expect(problemaDaSenha("malhapv2026")).toBeNull();
    expect(problemaDaSenha("costura viva 2026")).toBeNull();
  });

  it("nao exige simbolo nem maiuscula: regra de composicao empurra para Senha@123", () => {
    expect(problemaDaSenha("minhasenhalonga")).toBeNull();
  });

  it("recusa caractere unico repetido, mesmo longo", () => {
    expect(problemaDaSenha("aaaaaaaaaaaa")).not.toBeNull();
  });

  it("recusa sequencia obvia", () => {
    expect(problemaDaSenha("0123456789")).not.toBeNull();
    expect(problemaDaSenha("abcdefghij")).not.toBeNull();
  });

  it("entrada vazia ou nula nao passa", () => {
    expect(problemaDaSenha("")).not.toBeNull();
  });
});
