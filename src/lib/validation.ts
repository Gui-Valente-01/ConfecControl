// Validação de telefone, documento e e-mail. Sem banco e sem Next, para teste.
//
// Dado inválido custa caro depois: telefone impossível gera botão de cobrança
// que abre conversa inexistente, e CPF errado só aparece na hora de emitir
// nota. Barrar na entrada é muito mais barato do que descobrir meses depois.

const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * Telefone brasileiro com DDD: 10 dígitos (fixo) ou 11 (celular).
 * Aceita o 55 na frente, que é como muitos cadastros vêm.
 */
export function isValidPhone(value: string | null | undefined): boolean {
  let digits = onlyDigits(value);
  if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith("55")) return false;
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (!DDDS_VALIDOS.has(Number(digits.slice(0, 2)))) return false;
  // Celular no Brasil começa com 9 depois do DDD; fixo começa de 2 a 5.
  const primeiro = digits[2];
  if (digits.length === 11) return primeiro === "9";
  return primeiro >= "2" && primeiro <= "5";
}

function digitosIguais(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

export function isValidCPF(value: string | null | undefined): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || digitosIguais(cpf)) return false;

  for (const [tamanho, posicao] of [[9, 10], [10, 11]] as const) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (posicao - i);
    const resto = (soma * 10) % 11;
    const digito = resto === 10 || resto === 11 ? 0 : resto;
    if (digito !== Number(cpf[tamanho])) return false;
  }
  return true;
}

export function isValidCNPJ(value: string | null | undefined): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || digitosIguais(cnpj)) return false;

  const calcular = (tamanho: number) => {
    let soma = 0;
    let peso = tamanho - 7;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cnpj[i]) * peso;
      peso = peso - 1 < 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcular(12) === Number(cnpj[12]) && calcular(13) === Number(cnpj[13]);
}

/** Aceita CPF ou CNPJ; decide pelo tamanho. */
export function isValidDocument(value: string | null | undefined): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

export function isValidEmail(value: string | null | undefined): boolean {
  const email = (value ?? "").trim();
  if (!email || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  const partes = email.split("@");
  if (partes.length !== 2) return false;
  const [local, dominio] = partes;
  if (!local || local.length > 64) return false;
  if (!dominio.includes(".") || dominio.startsWith(".") || dominio.endsWith(".")) return false;
  if (dominio.includes("..")) return false;
  return /^[^@\s]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

/**
 * Valida campos opcionais: em branco passa, preenchido tem que estar certo.
 * Devolve a mensagem do primeiro erro e o campo, para a tela destacar onde é.
 */
export function validateContactFields(input: {
  phone?: string | null;
  document?: string | null;
  email?: string | null;
}): { field: "phone" | "document" | "email"; message: string } | null {
  if (input.phone?.trim() && !isValidPhone(input.phone)) {
    return { field: "phone", message: "Telefone inválido. Use DDD + número, como (41) 99988-7766." };
  }
  if (input.document?.trim() && !isValidDocument(input.document)) {
    return { field: "document", message: "CPF ou CNPJ inválido. Confira os números digitados." };
  }
  if (input.email?.trim() && !isValidEmail(input.email)) {
    return { field: "email", message: "E-mail inválido. Confira o endereço digitado." };
  }
  return null;
}
