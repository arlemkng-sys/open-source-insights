import { useEffect, useState } from "react";

import { createFeedItem, feedMessage, nextDelayMs, type FeedItem } from "@/lib/jump/live-feed";

const VISIBLE_MS = 4500;

/** Toasts flutuantes de atividade fictícia — visíveis em todas as telas. */
export function LiveFeedToasts() {
  const [toasts, setToasts] = useState<FeedItem[]>([]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        const item = createFeedItem();
        setToasts((prev) => [...prev, item].slice(-3));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== item.id));
        }, VISIBLE_MS);
        schedule();
      }, nextDelayMs());
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          className="glass animate-in fade-in slide-in-from-right-6 rounded-2xl border border-primary/20 px-4 py-3 text-xs leading-snug duration-500"
        >
          <p className="text-foreground">{feedMessage(item)}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">agora mesmo</p>
        </div>
      ))}
    </div>
  );
}
