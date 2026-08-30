/**
 * Local persistence layer (PROTOTYPE).
 * Simulated auth + account data in localStorage. Designed to be replaced by
 * Lovable Cloud (auth + database) later: keep all reads/writes going through
 * the functions exported here.
 */
import { REWARD_PER_JUMP_CENTS, STARTING_BALANCE_CENTS } from "./rewards";

export type JumpUser = {
  id: string;
  username: string;
  email: string;
};

export type GameRecord = {
  id: string;
  playedAt: number;
  score: number;
  jumps: number;
  earnedCents: number;
  durationMs: number;
  betCents?: number;
};

export type Account = {
  user: JumpUser;
  balanceCents: number;
  totalJumps: number;
  totalEarnedCents: number;
  gamesPlayed: number;
  bestScore: number;
  history: GameRecord[];
};

const USERS_KEY = "jumpcoins:users";
const SESSION_KEY = "jumpcoins:session";
const ACCOUNT_KEY = "jumpcoins:account:";
export const AUTH_EVENT = "jumpcoins:auth-change";
export const ACCOUNT_EVENT = "jumpcoins:account-change";

type StoredUser = JumpUser & { password: string };

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

function emit(event: string) {
  if (isBrowser()) window.dispatchEvent(new Event(event));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyAccount(user: JumpUser): Account {
  return {
    user,
    balanceCents: STARTING_BALANCE_CENTS,
    totalJumps: 0,
    totalEarnedCents: 0,
    gamesPlayed: 0,
    bestScore: 0,
    history: [],
  };
}

/* ── auth ────────────────────────────────────────────────── */

export function signUp(username: string, email: string, password: string): JumpUser {
  const normalized = email.trim().toLowerCase();
  const users = read<StoredUser[]>(USERS_KEY, []);
  if (users.some((u) => u.email === normalized)) {
    throw new Error("Já existe uma conta com esse e-mail.");
  }
  const user: JumpUser = { id: uid(), username: username.trim(), email: normalized };
  users.push({ ...user, password });
  write(USERS_KEY, users);
  write(ACCOUNT_KEY + user.id, emptyAccount(user));
  write(SESSION_KEY, user);
  emit(AUTH_EVENT);
  return user;
}

export function signIn(email: string, password: string): JumpUser {
  const normalized = email.trim().toLowerCase();
  const users = read<StoredUser[]>(USERS_KEY, []);
  const found = users.find((u) => u.email === normalized);
  if (!found || found.password !== password) {
    throw new Error("E-mail ou senha incorretos.");
  }
  const user: JumpUser = { id: found.id, username: found.username, email: found.email };
  if (!read<Account | null>(ACCOUNT_KEY + user.id, null)) {
    write(ACCOUNT_KEY + user.id, emptyAccount(user));
  }
  write(SESSION_KEY, user);
  emit(AUTH_EVENT);
  return user;
}

export function signOut() {
  if (isBrowser()) window.localStorage.removeItem(SESSION_KEY);
  emit(AUTH_EVENT);
}

export function getSession(): JumpUser | null {
  return read<JumpUser | null>(SESSION_KEY, null);
}

/* ── account ─────────────────────────────────────────────── */

export function getAccount(userId: string): Account | null {
  return read<Account | null>(ACCOUNT_KEY + userId, null);
}

function saveAccount(account: Account) {
  write(ACCOUNT_KEY + account.user.id, account);
  emit(ACCOUNT_EVENT);
}

/** Credita um pulo válido. Retorna o novo saldo em centavos. */
export function creditJump(userId: string): number {
  const account = getAccount(userId);
  if (!account) return 0;
  account.balanceCents += REWARD_PER_JUMP_CENTS;
  account.totalEarnedCents += REWARD_PER_JUMP_CENTS;
  account.totalJumps += 1;
  saveAccount(account);
  return account.balanceCents;
}

export function recordGame(
  userId: string,
  data: { score: number; jumps: number; earnedCents: number; durationMs: number },
) {
  const account = getAccount(userId);
  if (!account) return;
  account.gamesPlayed += 1;
  account.bestScore = Math.max(account.bestScore, data.score);
  account.history.unshift({ id: uid(), playedAt: Date.now(), ...data });
  account.history = account.history.slice(0, 50);
  saveAccount(account);
}
