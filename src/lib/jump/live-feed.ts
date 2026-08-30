/**
 * Live feed (PROTOTYPE ONLY).
 *
 * Generates fictional withdrawal/win activity to create social proof in the UI.
 * No real users or money involved. Swap this module for a realtime backend feed
 * later without touching UI code.
 */

import { useEffect, useState } from "react";

import { formatBRL } from "./rewards";

const NAMES = [
  "Marcos_99",
  "Ana Paula",
  "Pedro_Dev",
  "Camila S.",
  "Gabriel_Gamer",
  "Lucas.exe",
  "Bia Nunes",
  "Rafa_Turbo",
  "Juliana M.",
  "Thiago_Pix",
  "Larissa K.",
  "Vini_Neon",
  "Fernanda R.",
  "Diego_Jump",
  "Isa Martins",
  "Caio_Blitz",
];

export type FeedKind = "withdraw" | "win";

export type FeedItem = {
  id: string;
  name: string;
  kind: FeedKind;
  amountCents: number;
  createdAt: number;
};

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

/** Valor aleatório entre R$ 10,00 e R$ 350,00. */
function randomAmountCents(): number {
  return Math.floor(1000 + Math.random() * (35000 - 1000));
}

export function createFeedItem(): FeedItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: pick(NAMES),
    kind: Math.random() < 0.5 ? "withdraw" : "win",
    amountCents: randomAmountCents(),
    createdAt: Date.now(),
  };
}

export function feedMessage(item: FeedItem): string {
  const value = formatBRL(item.amountCents);
  return item.kind === "withdraw"
    ? `⚡ ${item.name} acabou de sacar ${value} via PIX`
    : `🎉 ${item.name} ganhou ${value} no JumpCoins`;
}

export function relativeTime(createdAt: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (seconds < 3) return "agora mesmo";
  if (seconds < 60) return `há ${seconds} seg`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)} h`;
}

/** Intervalo aleatório entre 3 e 6 segundos. */
export function nextDelayMs(): number {
  return 3000 + Math.random() * 3000;
}

/** Stream de itens fictícios, novos entrando no topo. */
export function useLiveFeed(max = 8): { items: FeedItem[]; now: number } {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setItems(
      Array.from({ length: Math.min(max, 5) }, (_, i) => {
        const item = createFeedItem();
        return { ...item, createdAt: Date.now() - (i + 1) * 9000 };
      }),
    );

    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setItems((prev) => [createFeedItem(), ...prev].slice(0, max));
        schedule();
      }, nextDelayMs());
    };
    schedule();

    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(tick);
    };
  }, [max]);

  return { items, now };
}
