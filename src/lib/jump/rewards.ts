/**
 * Reward engine (PROTOTYPE ONLY).
 *
 * All values here are simulated and stored in localStorage. This module is the
 * single place where balance changes happen, so it can later be swapped for a
 * secure backend/API without touching UI code. Never treat these values as
 * real money.
 */

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

/** Ganho (em centavos) de uma partida com N pulos. */
export function rewardForJumps(jumps: number): number {
  return Math.max(0, Math.floor(jumps)) * REWARD_PER_JUMP_CENTS;
}
