import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "@/components/jump/GameCanvas";
import { useAccount, useSession } from "@/hooks/use-jump-account";
import { formatBRL, rewardForJumps } from "@/lib/jump/rewards";
import { creditJump, recordGame } from "@/lib/jump/store";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Partida — JumpCoins" },
      {
        name: "description",
        content:
          "Corra, pule obstáculos neon e acumule R$ 0,01 por pulo no runner rítmico JumpCoins.",
      },
      { property: "og:title", content: "Partida — JumpCoins" },
      {
        property: "og:description",
        content: "Runner rítmico neon: cada pulo vale R$ 0,01 de saldo simulado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});

type Result = { score: number; jumps: number; durationMs: number } | null;

function PlayPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const { account } = useAccount(user?.id);

  const [runId, setRunId] = useState(1);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [jumps, setJumps] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const jumpsRef = useRef(0);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  const onJump = useCallback(() => {
    jumpsRef.current += 1;
    setJumps(jumpsRef.current);
    if (user) creditJump(user.id);
  }, [user]);

  const onGameOver = useCallback(
    (r: NonNullable<Result>) => {
      setResult(r);
      if (user) {
        recordGame(user.id, {
          score: r.score,
          jumps: r.jumps,
          earnedCents: rewardForJumps(r.jumps),
          durationMs: r.durationMs,
        });
      }
    },
    [user],
  );

  const restart = () => {
    jumpsRef.current = 0;
    setJumps(0);
    setScore(0);
    setResult(null);
    setPaused(false);
    setRunId((n) => n + 1);
  };

  if (!user) return null;

  return (
    <main className="app-bg flex min-h-[100dvh] flex-col p-3 sm:p-5">
      <div className="relative mx-auto w-full max-w-5xl flex-1 overflow-hidden rounded-3xl border border-border">
        <GameCanvas
          runId={runId}
          paused={paused || !!result}
          handlers={{ onJump, onScore: setScore, onGameOver }}
        />

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
          <div className="glass rounded-xl px-3 py-2 text-xs sm:text-sm">
            <p className="font-display text-base font-semibold sm:text-lg">{score}</p>
            <p className="text-muted-foreground">{jumps} pulos</p>
          </div>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="glass pointer-events-auto rounded-xl px-4 py-2 text-sm font-medium"
          >
            {paused ? "▶ Continuar" : "⏸ Pausar"}
          </button>
          <div className="glass rounded-xl px-3 py-2 text-right">
            <p className="font-display text-base font-semibold text-neon sm:text-lg">
              💰 {formatBRL(account?.balanceCents ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">saldo simulado</p>
          </div>
        </div>

        {!result && !paused && jumps === 0 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-sm text-muted-foreground">
            Toque na tela, clique ou pressione ESPAÇO para pular
          </p>
        )}

        {paused && !result && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="glass animate-scale-in rounded-2xl px-8 py-6 text-center">
              <p className="font-display text-2xl font-bold">Pausado</p>
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 px-5 backdrop-blur-md">
            <div className="glass neon-ring animate-scale-in w-full max-w-sm rounded-3xl p-6 text-center">
              <p className="font-display text-3xl font-bold">FIM DE JOGO</p>
              <dl className="mt-6 space-y-2 text-sm">
                <Row label="Pontuação" value={String(result.score)} />
                <Row label="Total de pulos" value={String(result.jumps)} />
                <Row
                  label="Ganho nesta partida"
                  value={formatBRL(rewardForJumps(result.jumps))}
                  highlight
                />
                <Row label="Saldo total" value={formatBRL(account?.balanceCents ?? 0)} />
              </dl>
              <div className="mt-6 grid gap-2">
                <button
                  type="button"
                  onClick={restart}
                  className="rounded-xl bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                >
                  Jogar novamente
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/menu" })}
                  className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Voltar ao menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={highlight ? "font-semibold text-neon" : "font-medium"}>{value}</dd>
    </div>
  );
}
