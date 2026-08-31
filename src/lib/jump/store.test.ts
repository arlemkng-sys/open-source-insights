// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { STARTING_BALANCE_CENTS } from "./rewards";
import {
  creditJump,
  deposit,
  getAccount,
  getSession,
  MIN_WITHDRAW_CENTS,
  placeBet,
  recordGame,
  requestWithdrawal,
  settleMatch,
  signIn,
  signOut,
  signUp,
} from "./store";

function newUser(email = "jogador@teste.com") {
  return signUp("Jogador", email, "senha123");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("autenticação", () => {
  it("cria conta com saldo inicial e sessão ativa", () => {
    const user = newUser();
    expect(getSession()?.id).toBe(user.id);
    expect(getAccount(user.id)?.balanceCents).toBe(STARTING_BALANCE_CENTS);
  });

  it("normaliza o e-mail e bloqueia duplicados", () => {
    newUser("Duplicado@Teste.com");
    expect(getSession()?.email).toBe("duplicado@teste.com");
    expect(() => newUser("duplicado@teste.com")).toThrow(/Já existe/);
  });

  it("faz login com credenciais corretas e recusa as erradas", () => {
    const user = newUser();
    signOut();
    expect(getSession()).toBeNull();
    expect(signIn("jogador@teste.com", "senha123").id).toBe(user.id);
    expect(() => signIn("jogador@teste.com", "errada")).toThrow(/incorretos/);
    expect(() => signIn("naoexiste@teste.com", "senha123")).toThrow(/incorretos/);
  });
});

describe("apostas", () => {
  it("debita a aposta do saldo", () => {
    const user = newUser();
    expect(placeBet(user.id, 2000)).toBe(true);
    expect(getAccount(user.id)?.balanceCents).toBe(STARTING_BALANCE_CENTS - 2000);
  });

  it("recusa aposta sem saldo ou com valor inválido", () => {
    const user = newUser();
    expect(placeBet(user.id, STARTING_BALANCE_CENTS + 1)).toBe(false);
    expect(placeBet(user.id, 0)).toBe(false);
    expect(getAccount(user.id)?.balanceCents).toBe(STARTING_BALANCE_CENTS);
  });
});

describe("partida", () => {
  it("conta pulos sem creditar saldo na hora", () => {
    const user = newUser();
    creditJump(user.id, 200);
    creditJump(user.id, 200);
    const account = getAccount(user.id)!;
    expect(account.totalJumps).toBe(2);
    expect(account.balanceCents).toBe(STARTING_BALANCE_CENTS);
  });

  it("na vitória devolve a aposta somada ao lucro", () => {
    const user = newUser();
    placeBet(user.id, 2000);
    const balance = settleMatch(user.id, { won: true, betCents: 2000, profitCents: 1500 });
    expect(balance).toBe(STARTING_BALANCE_CENTS + 1500);
    expect(getAccount(user.id)?.totalEarnedCents).toBe(1500);
  });

  it("na derrota perde aposta e lucro acumulado", () => {
    const user = newUser();
    placeBet(user.id, 2000);
    const balance = settleMatch(user.id, { won: false, betCents: 2000, profitCents: 5000 });
    expect(balance).toBe(STARTING_BALANCE_CENTS - 2000);
    expect(getAccount(user.id)?.totalEarnedCents).toBe(0);
  });

  it("registra o histórico e o melhor score (máx. 50 partidas)", () => {
    const user = newUser();
    for (let i = 0; i < 55; i++) {
      recordGame(user.id, { score: i, jumps: 1, earnedCents: 0, durationMs: 1000, betCents: 200 });
    }
    const account = getAccount(user.id)!;
    expect(account.gamesPlayed).toBe(55);
    expect(account.bestScore).toBe(54);
    expect(account.history).toHaveLength(50);
    expect(account.history[0]?.score).toBe(54);
  });
});

describe("depósitos", () => {
  it("credita o valor e guarda o registro", () => {
    const user = newUser();
    const record = deposit(user.id, 5000, "pix");
    expect(record?.status).toBe("confirmado");
    const account = getAccount(user.id)!;
    expect(account.balanceCents).toBe(STARTING_BALANCE_CENTS + 5000);
    expect(account.totalDepositedCents).toBe(5000);
    expect(account.deposits).toHaveLength(1);
  });

  it("rejeita valores inválidos", () => {
    const user = newUser();
    expect(deposit(user.id, 0, "pix")).toBeNull();
    expect(deposit(user.id, -100, "card")).toBeNull();
    expect(getAccount(user.id)?.balanceCents).toBe(STARTING_BALANCE_CENTS);
  });
});

describe("saques", () => {
  it("reserva o valor e deixa a solicitação em análise", () => {
    const user = newUser();
    const result = requestWithdrawal(user.id, {
      amountCents: 3000,
      pixKeyType: "email",
      pixKey: "jogador@teste.com",
    });
    expect(result.ok).toBe(true);
    const account = getAccount(user.id)!;
    expect(account.balanceCents).toBe(STARTING_BALANCE_CENTS - 3000);
    expect(account.totalWithdrawnCents).toBe(3000);
    expect(account.withdrawals?.[0]?.status).toBe("em análise");
  });

  it("valida mínimo, saldo e chave PIX", () => {
    const user = newUser();
    expect(
      requestWithdrawal(user.id, {
        amountCents: MIN_WITHDRAW_CENTS - 1,
        pixKeyType: "cpf",
        pixKey: "12345678900",
      }),
    ).toMatchObject({ ok: false });
    expect(
      requestWithdrawal(user.id, {
        amountCents: STARTING_BALANCE_CENTS + 1,
        pixKeyType: "cpf",
        pixKey: "12345678900",
      }),
    ).toMatchObject({ ok: false, error: "Saldo insuficiente." });
    expect(
      requestWithdrawal(user.id, { amountCents: 3000, pixKeyType: "random", pixKey: "abc" }),
    ).toMatchObject({ ok: false });
    expect(getAccount(user.id)?.balanceCents).toBe(STARTING_BALANCE_CENTS);
  });

  it("recusa saque de conta inexistente", () => {
    expect(
      requestWithdrawal("nao-existe", { amountCents: 3000, pixKeyType: "cpf", pixKey: "12345678900" }),
    ).toMatchObject({ ok: false, error: "Conta não encontrada." });
  });
});
