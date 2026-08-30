import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/jump/AppShell";
import { useAccount, useSession } from "@/hooks/use-jump-account";
import { formatBRL } from "@/lib/jump/rewards";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Histórico de partidas — JumpCoins" },
      {
        name: "description",
        content:
          "Veja suas partidas anteriores no JumpCoins: data, pulos, duração e ganhos.",
      },
      { property: "og:title", content: "Histórico de partidas — JumpCoins" },
      {
        property: "og:description",
        content: "Partidas anteriores com pulos, duração e ganhos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function groupLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Hoje";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function HistoryPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const { account } = useAccount(user?.id);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!user) return null;
  const history = account?.history ?? [];

  const groups = history.reduce<Record<string, typeof history>>((acc, game) => {
    const key = groupLabel(game.playedAt);
    (acc[key] ??= []).push(game);
    return acc;
  }, {});

  return (
    <AppShell title="Histórico" subtitle="Suas últimas partidas neste navegador">
      {history.length === 0 && (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Nenhuma partida ainda. Jogue uma rodada para começar seu histórico.
        </p>
      )}

      {Object.entries(groups).map(([label, games]) => (
        <section key={label}>
          <h2 className="mt-4 mb-2 text-xs tracking-widest text-muted-foreground uppercase">
            {label}
          </h2>
          <ul className="space-y-2">
            {games.map((g) => (
              <li key={g.id} className="glass flex items-center justify-between rounded-2xl px-4 py-3">
                <div>
                  <p className="font-display text-base font-semibold text-neon">
                    {formatBRL(g.earnedCents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.jumps} pulos · {g.score} pts ·{" "}
                    {new Date(g.playedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(g.durationMs / 1000)}s
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </AppShell>
  );
}
