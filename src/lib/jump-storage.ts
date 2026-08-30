/** Local-only persistence for JumpCoins (no backend, no real money). */

export type MissionId = "first-jump" | "survivor" | "jump-master";

export type MissionState = {
  progress: number;
  claimed: boolean;
};

export type RunRecord = {
  id: string;
  date: number;
  score: number;
  coins: number;
  jumps: number;
  progress: number;
  completed: boolean;
};

export type JumpCoinsSave = {
  balance: number; // fictional coins
  earnings: number; // simulated R$ (cosmetic only)
  totalJumps: number;
  totalGames: number;
  bestScore: number;
  history: RunRecord[];
  missions: Record<MissionId, MissionState>;
  dayStamp: string;
};

export const MISSIONS: {
  id: MissionId;
  title: string;
  description: string;
  goal: number;
  reward: number;
  unit: string;
}[] = [
  {
    id: "first-jump",
    title: "Primeiro Pulo",
    description: "Faça 10 pulos em qualquer partida",
    goal: 10,
    reward: 50,
    unit: "pulos",
  },
  {
    id: "survivor",
    title: "Sobrevivente",
    description: "Alcance 50% de progresso em uma partida",
    goal: 50,
    reward: 120,
    unit: "%",
  },
  {
    id: "jump-master",
    title: "Mestre do Jump",
    description: "Vença 1 partida completa (100%)",
    goal: 1,
    reward: 300,
    unit: "partida",
  },
];

const KEY = "jumpcoins:save:v1";

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function emptySave(): JumpCoinsSave {
  return {
    balance: 0,
    earnings: 0,
    totalJumps: 0,
    totalGames: 0,
    bestScore: 0,
    history: [],
    missions: {
      "first-jump": { progress: 0, claimed: false },
      survivor: { progress: 0, claimed: false },
      "jump-master": { progress: 0, claimed: false },
    },
    dayStamp: todayStamp(),
  };
}

export function loadSave(): JumpCoinsSave {
  if (typeof window === "undefined") return emptySave();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const parsed = { ...emptySave(), ...(JSON.parse(raw) as Partial<JumpCoinsSave>) };
    const save: JumpCoinsSave = {
      ...parsed,
      missions: { ...emptySave().missions, ...parsed.missions },
      history: parsed.history ?? [],
    } as JumpCoinsSave;
    if (save.dayStamp !== todayStamp()) {
      save.dayStamp = todayStamp();
      save.missions = emptySave().missions;
    }
    return save;
  } catch {
    return emptySave();
  }
}

export function persistSave(save: JumpCoinsSave) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable — progress stays in memory */
  }
}

export function msUntilReset() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
