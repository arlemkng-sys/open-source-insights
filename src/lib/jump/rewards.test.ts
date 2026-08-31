import { describe, expect, it } from "vitest";

import {
  BET_OPTIONS_CENTS,
  formatBRL,
  MIN_BET_CENTS,
  REWARD_PER_JUMP_CENTS,
  rewardForJumps,
  rewardPerJump,
} from "./rewards";

describe("formatBRL", () => {
  it("formata centavos em reais", () => {
    expect(formatBRL(50).replace(/\u00a0/g, " ")).toBe("R$ 0,50");
    expect(formatBRL(10000).replace(/\u00a0/g, " ")).toBe("R$ 100,00");
  });
});

describe("rewardPerJump", () => {
  it("usa a aposta mínima como padrão", () => {
    expect(rewardPerJump()).toBe(REWARD_PER_JUMP_CENTS);
  });

  it("escala proporcionalmente à aposta", () => {
    expect(rewardPerJump(200)).toBe(50);
    expect(rewardPerJump(500)).toBe(125);
    expect(rewardPerJump(1000)).toBe(250);
    expect(rewardPerJump(2000)).toBe(500);
    expect(rewardPerJump(5000)).toBe(1250);
    expect(rewardPerJump(10000)).toBe(2500);
  });

  it("nunca fica abaixo da aposta mínima", () => {
    expect(rewardPerJump(0)).toBe(REWARD_PER_JUMP_CENTS);
    expect(rewardPerJump(-500)).toBe(REWARD_PER_JUMP_CENTS);
    expect(rewardPerJump(Number.NaN)).toBe(REWARD_PER_JUMP_CENTS);
  });

  it("cobre todas as opções de aposta", () => {
    for (const bet of BET_OPTIONS_CENTS) {
      expect(rewardPerJump(bet)).toBe((bet / MIN_BET_CENTS) * REWARD_PER_JUMP_CENTS);
    }
  });
});

describe("rewardForJumps", () => {
  it("multiplica o ganho por pulo", () => {
    expect(rewardForJumps(10, 200)).toBe(500);
    expect(rewardForJumps(4, 10000)).toBe(10000);
  });

  it("trata pulos inválidos como zero", () => {
    expect(rewardForJumps(0, 500)).toBe(0);
    expect(rewardForJumps(-3, 500)).toBe(0);
  });

  it("ignora frações de pulo", () => {
    expect(rewardForJumps(2.9, 200)).toBe(100);
  });
});
