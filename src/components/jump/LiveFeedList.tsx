import { formatBRL } from "@/lib/jump/rewards";
import { relativeTime, useLiveFeed } from "@/lib/jump/live-feed";

/** Lista de atividade recente em loop (novos itens entram no topo). */
export function LiveFeedList() {
  const { items, now } = useLiveFeed(8);

  return (
    <section className="glass mt-6 rounded-3xl p-5">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Atividade em tempo real
        </h2>
      </div>

      <ul className="mt-4 max-h-64 space-y-2 overflow-hidden">
        {items.map((item) => (
          <li
            key={item.id}
            className="animate-in fade-in slide-in-from-top-3 flex items-center justify-between gap-3 rounded-2xl border border-white/5 px-3 py-2 duration-500"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">
                <span className="font-medium">{item.name}</span>{" "}
                <span className="text-muted-foreground">
                  {item.kind === "withdraw" ? "sacou via PIX" : "ganhou jogando"}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {relativeTime(item.createdAt, now)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-neon">
              {formatBRL(item.amountCents)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
