/**
 * Reward engine (PROTOTYPE ONLY).
 *
 * All values here are simulated and stored in localStorage. This module is the
 * single place where balance changes happen, so it can later be swapped for a
 * secure backend/API without touching UI code. Never treat these values as
 * real money.
 */

/** Ganho por pulo na aposta mínima (R$ 2,00) → R$ 0,50. */
export const REWARD_PER_JUMP_CENTS = 50; // R$ 0,50

/** Valores de aposta disponíveis para entrar em uma partida (em centavos). */
export const BET_OPTIONS_CENTS = [200, 500, 1000, 2000, 5000, 10000] as const;

/** Aposta mínima para entrar em uma partida: R$ 2,00. */
export const MIN_BET_CENTS = BET_OPTIONS_CENTS[0];

/** Saldo simulado de boas-vindas para o protótipo. */
export const STARTING_BALANCE_CENTS = 10000; // R$ 100,00

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Ganho por pulo (em centavos) proporcional à aposta.
 * R$ 2 → R$ 0,50 | R$ 5 → R$ 1,25 | R$ 10 → R$ 2,50 | R$ 20 → R$ 5,00
 * R$ 50 → R$ 12,50 | R$ 100 → R$ 25,00
 */
export function rewardPerJump(betCents: number = MIN_BET_CENTS): number {
  const bet = Math.max(MIN_BET_CENTS, Math.floor(betCents || MIN_BET_CENTS));
  return Math.round((bet / MIN_BET_CENTS) * REWARD_PER_JUMP_CENTS);
}

/** Ganho (em centavos) de uma partida com N pulos para uma dada aposta. */
export function rewardForJumps(jumps: number, betCents: number = MIN_BET_CENTS): number {
  return Math.max(0, Math.floor(jumps)) * rewardPerJump(betCents);
}
