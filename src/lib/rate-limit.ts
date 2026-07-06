// Limitador de tentativas em memória (janela deslizante), usado no login para
// frear força bruta. Em serverless o estado vale por instância — não é garantia
// absoluta, mas encarece muito o ataque sem precisar de tabela no banco.

type Entry = { count: number; windowStart: number };

const attempts = new Map<string, Entry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function prune(now: number) {
  // Evita crescimento sem limite em instâncias de vida longa.
  if (attempts.size < 1000) return;
  for (const [key, entry] of attempts) {
    if (now - entry.windowStart > WINDOW_MS) attempts.delete(key);
  }
}

// Registra uma tentativa e diz se a chave estourou o limite.
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  prune(now);

  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

// Zera o contador (ex.: login bem-sucedido).
export function clearRateLimit(key: string) {
  attempts.delete(key);
}
