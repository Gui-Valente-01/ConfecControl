import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimit, isRateLimited } from "@/lib/rate-limit";

describe("isRateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite até 5 tentativas e bloqueia a sexta", () => {
    const key = "user@teste.com|ip-1";
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(key)).toBe(false);
    }
    expect(isRateLimited(key)).toBe(true);
  });

  it("libera novamente depois da janela de 15 minutos", () => {
    const key = "user@teste.com|ip-2";
    for (let i = 0; i < 6; i++) isRateLimited(key);
    expect(isRateLimited(key)).toBe(true);

    vi.advanceTimersByTime(16 * 60 * 1000);
    expect(isRateLimited(key)).toBe(false);
  });

  it("clearRateLimit zera o contador (login bem-sucedido)", () => {
    const key = "user@teste.com|ip-3";
    for (let i = 0; i < 5; i++) isRateLimited(key);
    clearRateLimit(key);
    expect(isRateLimited(key)).toBe(false);
  });

  it("chaves diferentes não interferem entre si", () => {
    const key = "user@teste.com|ip-4";
    for (let i = 0; i < 6; i++) isRateLimited(key);
    expect(isRateLimited(key)).toBe(true);
    expect(isRateLimited("outro@teste.com|ip-4")).toBe(false);
  });
});
