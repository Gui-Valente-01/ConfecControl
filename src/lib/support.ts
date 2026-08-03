// Contato de suporte, lido de variável de ambiente.
//
// A tela de login mandava "entre em contato com o suporte" sem dizer com quem.
// Quem mais precisa dessa frase é justamente quem não consegue entrar — então
// o contato tem que aparecer ali, antes do login, e não dentro do sistema.
//
// Vem de configuração, e não fixo no código, porque quem revende o sistema
// coloca o próprio contato sem precisar de um build novo.

import { isValidEmail, isValidPhone } from "@/lib/validation";
import { whatsappUrl } from "@/lib/whatsapp";

export type SupportContact = {
  whatsapp: string | null;
  whatsappLink: string | null;
  email: string | null;
  hasAny: boolean;
};

const MENSAGEM_PADRAO = "Olá! Preciso de ajuda com o acesso ao ConfecControl.";

/**
 * Lê o contato do ambiente. Valor inválido é tratado como ausente: melhor a
 * seção sumir do que mostrar um telefone que não atende.
 */
export function resolveSupportContact(
  env: Record<string, string | undefined>,
  message: string = MENSAGEM_PADRAO,
): SupportContact {
  const phoneRaw = env.SUPPORT_WHATSAPP?.trim() || null;
  const emailRaw = env.SUPPORT_EMAIL?.trim().toLowerCase() || null;

  const whatsapp = phoneRaw && isValidPhone(phoneRaw) ? phoneRaw : null;
  const email = emailRaw && isValidEmail(emailRaw) ? emailRaw : null;

  return {
    whatsapp,
    whatsappLink: whatsapp ? whatsappUrl(whatsapp, message) : null,
    email,
    hasAny: Boolean(whatsapp || email),
  };
}

/** Formata o telefone para leitura: (41) 99988-7766. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^55/, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}
