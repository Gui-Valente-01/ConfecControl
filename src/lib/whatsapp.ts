// Monta link de conversa no WhatsApp a partir do telefone cadastrado.
// Os telefones são digitados de todo jeito ((41) 99999-8888, 41999998888...),
// então limpamos tudo que não é dígito e completamos o DDI do Brasil quando o
// número veio só com DDD + linha (até 11 dígitos).

export function whatsappPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  const number = whatsappPhone(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
