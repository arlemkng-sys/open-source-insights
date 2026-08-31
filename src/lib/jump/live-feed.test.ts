import { describe, expect, it } from "vitest";

import { createFeedItem, feedMessage, nextDelayMs, relativeTime } from "./live-feed";

describe("createFeedItem", () => {
  it("gera itens válidos dentro da faixa de valores", () => {
    for (let i = 0; i < 200; i++) {
      const item = createFeedItem();
      expect(item.id).toBeTruthy();
      expect(item.name.length).toBeGreaterThan(0);
      expect(["withdraw", "win"]).toContain(item.kind);
      expect(item.amountCents).toBeGreaterThanOrEqual(1000);
      expect(item.amountCents).toBeLessThanOrEqual(35000);
    }
  });
});

describe("feedMessage", () => {
  const base = { id: "1", name: "Ana Paula", amountCents: 5000, createdAt: 0 };

  it("descreve saques via PIX", () => {
    const msg = feedMessage({ ...base, kind: "withdraw" });
    expect(msg).toContain("Ana Paula");
    expect(msg).toContain("sacar");
    expect(msg).toContain("PIX");
  });

  it("descreve ganhos no jogo", () => {
    const msg = feedMessage({ ...base, kind: "win" });
    expect(msg).toContain("ganhou");
    expect(msg).toContain("JumpCoins");
  });
});

describe("relativeTime", () => {
  it("mostra 'agora mesmo' nos primeiros segundos", () => {
    expect(relativeTime(1000, 1000)).toBe("agora mesmo");
    expect(relativeTime(0, 2000)).toBe("agora mesmo");
  });

  it("mostra segundos, minutos e horas", () => {
    expect(relativeTime(0, 10_000)).toBe("há 10 seg");
    expect(relativeTime(0, 120_000)).toBe("há 2 min");
    expect(relativeTime(0, 7_200_000)).toBe("há 2 h");
  });

  it("nunca retorna tempo negativo", () => {
    expect(relativeTime(5000, 0)).toBe("agora mesmo");
  });
});

describe("nextDelayMs", () => {
  it("fica entre 3 e 6 segundos", () => {
    for (let i = 0; i < 100; i++) {
      const delay = nextDelayMs();
      expect(delay).toBeGreaterThanOrEqual(3000);
      expect(delay).toBeLessThan(6000);
    }
  });
});
