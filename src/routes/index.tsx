import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas, type RunResult } from "@/components/game/GameCanvas";
import { MissionsModal } from "@/components/game/MissionsModal";
import { sfx, setMuted } from "@/lib/jump-audio";
import {
  MISSIONS,
  emptySave,
  formatBRL,
  loadSave,
  persistSave,
  type JumpCoinsSave,
  type MissionId,
} from "@/lib/jump-storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JumpCoins — Endless Runner Neon 2D" },
      {
        name: "description",
        content:
          "JumpCoins é um endless runner neon em Canvas 2D com missões diárias, conquistas e ranking local. Protótipo arcade, sem apostas reais.",
      },
      { property: "og:title", content: "JumpCoins — Endless Runner Neon 2D" },
      {
        property: "og:description",
        content:
          "Corra, pule e colete moedas neon. Missões diárias, conquistas e estatísticas salvas no seu navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JumpCoinsPage,
});

const FEED_NAMES = [
  "Pedro_Dev",
  "NeonRay",
  "Ana.Jump",
  "Lu_Runner",
  "MK_Turbo",
  "Bia_Neon",
  "Zeca99",
];
const FEED_EVENTS = [
  "acabou de alcançar 500 pontos",
  "completou a missão Sobrevivente",
  "coletou 40 moedas em uma corrida",
  "venceu uma partida completa",
  "bateu o recorde pessoal",
  "resgatou uma recompensa diária",
];

type Feed = { id: number; text: string };

function JumpCoinsPage() {
  const [save, setSave] = useState<JumpCoinsSave>(() => emptySave());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<"jogo" | "stats">("jogo");
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [feed, setFeed] = useState<Feed[]>([]);
  const feedId = useRef(0);
  const runJumps = useRef(0);

  useEffect(() => {
    setSave(loadSave());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistSave(save);
  }, [save, hydrated]);

  useEffect(() => {
    const push = () => {
      const text = `${FEED_NAMES[Math.floor(Math.random() * FEED_NAMES.length)]} ${
        FEED_EVENTS[Math.floor(Math.random() * FEED_EVENTS.length)]
      }`;
      feedId.current += 1;
      setFeed((f) => [{ id: feedId.current, text }, ...f].slice(0, 4));
    };
    push();
    const t = setInterval(push, 5200);
    return () => clearInterval(t);
  }, []);

  const handleJump = useCallback(() => {
    runJumps.current += 1;
    const jumps = runJumps.current;
    setSave((s) => ({
      ...s,
      balance: s.balance + 1,
      earnings: +(s.earnings + 0.01).toFixed(2),
      totalJumps: s.totalJumps + 1,
      missions: {
        ...s.missions,
        "first-jump": {
          ...s.missions["first-jump"],
          progress: Math.max(s.missions["first-jump"].progress, Math.min(10, jumps)),
        },
      },
    }));
  }, []);

  const handleCoin = useCallback(() => {
    setSave((s) => ({
      ...s,
      balance: s.balance + 1,
      earnings: +(s.earnings + 0.01).toFixed(2),
    }));
  }, []);

  const handleFinish = useCallback((r: RunResult) => {
    runJumps.current = 0;
    setSave((s) => ({
      ...s,
      totalGames: s.totalGames + 1,
      bestScore: Math.max(s.bestScore, r.score),
      history: [
        {
          id: `${Date.now()}`,
          date: Date.now(),
          score: r.score,
          coins: r.coins,
          jumps: r.jumps,
          progress: r.progress,
          completed: r.completed,
        },
        ...s.history,
      ].slice(0, 20),
      missions: {
        ...s.missions,
        survivor: {
          ...s.missions.survivor,
          progress: Math.max(s.missions.survivor.progress, Math.min(50, Math.round(r.progress))),
        },
        "jump-master": {
          ...s.missions["jump-master"],
          progress: Math.max(s.missions["jump-master"].progress, r.completed ? 1 : 0),
        },
      },
    }));
  }, []);

  const claim = useCallback((id: MissionId) => {
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission) return;
    setSave((s) => {
      const st = s.missions[id];
      if (st.claimed || st.progress < mission.goal) return s;
      return {
        ...s,
        balance: s.balance + mission.reward,
        missions: { ...s.missions, [id]: { ...st, claimed: true } },
      };
    });
    sfx.reward();
  }, []);

  const readyMissions = useMemo(
    () =>
      MISSIONS.filter((m) => {
        const st = save.missions[m.id];
        return !st.claimed && st.progress >= m.goal;
      }).length,
    [save.missions],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl neon-panel px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-neon-green/15 text-xl neon-glow">
            🪙
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-neon-green neon-text">
              JumpCoins
            </h1>
            <p className="text-[11px] text-muted-foreground">Endless Runner Neon • Protótipo</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-border bg-surface/70 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo</p>
            <p className="font-mono font-bold text-neon-cyan">{save.balance} 🪙</p>
          </div>
          <div className="rounded-xl border border-border bg-surface/70 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Fictício
            </p>
            <p className="font-mono font-bold text-neon-pink">{formatBRL(save.earnings)}</p>
          </div>
          <button
            onClick={() => {
              const next = !muted;
              setMutedState(next);
              setMuted(next);
              if (!next) sfx.click();
            }}
            className="rounded-xl border border-border px-3 py-2 text-sm"
            aria-label={muted ? "Ativar som" : "Silenciar"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2">
            <span className="grid size-7 place-items-center rounded-full bg-neon-purple/30 text-xs">
              AK
            </span>
            <span className="text-sm">Arlem</span>
          </div>
        </div>
      </header>

      <nav className="mt-5 flex gap-2">
        {(["jogo", "stats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              sfx.click();
              setTab(t);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t
                ? "bg-neon-green text-primary-foreground neon-glow"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "jogo" ? "🎮 Jogar" : "📊 Estatísticas"}
          </button>
        ))}
        <button
          onClick={() => {
            sfx.click();
            setMissionsOpen(true);
          }}
          className="relative ml-auto rounded-xl bg-neon-pink px-5 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110"
        >
          🎯 Missões / Recompensas
          {readyMissions > 0 && (
            <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-neon-green text-[11px] font-black text-primary-foreground">
              {readyMissions}
            </span>
          )}
        </button>
      </nav>

      {tab === "jogo" ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
          <GameCanvas onJump={handleJump} onCoin={handleCoin} onFinish={handleFinish} />

          <aside className="space-y-4">
            <section className="rounded-2xl neon-panel p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neon-cyan">
                Live Feed
              </h2>
              <ul className="space-y-2">
                {feed.map((f) => (
                  <li
                    key={f.id}
                    className="feed-in rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span className="text-foreground">{f.text.split(" ")[0]}</span>{" "}
                    {f.text.split(" ").slice(1).join(" ")}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl neon-panel p-4 text-sm">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neon-purple">
                Resumo
              </h2>
              <Row label="Pulos totais" value={save.totalJumps} />
              <Row label="Partidas" value={save.totalGames} />
              <Row label="Maior pontuação" value={save.bestScore} />
            </section>
          </aside>
        </div>
      ) : (
        <section className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Pulos totais" value={save.totalJumps} color="text-neon-green" />
            <Stat label="Partidas jogadas" value={save.totalGames} color="text-neon-cyan" />
            <Stat label="Maior pontuação" value={save.bestScore} color="text-neon-pink" />
            <Stat label="Saldo" value={`${save.balance} 🪙`} color="text-neon-purple" />
          </div>

          <div className="rounded-2xl neon-panel p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Histórico de partidas
            </h2>
            {save.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma partida registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2">Data</th>
                      <th>Pontos</th>
                      <th>Moedas</th>
                      <th>Pulos</th>
                      <th>Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {save.history.map((h) => (
                      <tr key={h.id} className="border-t border-border">
                        <td className="py-2 text-muted-foreground">
                          {new Date(h.date).toLocaleString("pt-BR")}
                        </td>
                        <td className="font-mono">{h.score}</td>
                        <td className="font-mono">{h.coins}</td>
                        <td className="font-mono">{h.jumps}</td>
                        <td className={h.completed ? "text-neon-green" : "font-mono"}>
                          {h.completed ? "100% ✔" : `${h.progress}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      <p className="mx-auto mt-8 max-w-2xl text-center text-[11px] leading-relaxed text-muted-foreground">
        JumpCoins é um protótipo de jogo casual gamificado. Moedas, saldo e valores em reais são
        puramente fictícios e decorativos — não existem depósitos, apostas, saques via PIX ou
        qualquer integração bancária. Todo o progresso fica salvo apenas neste navegador.
      </p>

      <MissionsModal
        open={missionsOpen}
        onClose={() => setMissionsOpen(false)}
        save={save}
        onClaim={claim}
      />
    </main>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-2xl neon-panel p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-black ${color} neon-text`}>{value}</p>
    </div>
  );
}
