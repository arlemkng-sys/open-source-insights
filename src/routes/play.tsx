import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "@/components/jump/GameCanvas";
import { useAccount, useSession } from "@/hooks/use-jump-account";
import {
  BET_OPTIONS_CENTS,
  MIN_BET_CENTS,
  formatBRL,
  rewardForJumps,
  rewardPerJump,
} from "@/lib/jump/rewards";
import { creditJump, placeBet, recordGame } from "@/lib/jump/store";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Partida — JumpCoins" },
      {
        name: "description",
        content:
          "Corra, pule obstáculos neon e acumule R$ 0,50 por pulo no runner rítmico JumpCoins.",
      },
      { property: "og:title", content: "Partida — JumpCoins" },
      {
        property: "og:description",
        content: "Runner rítmico neon: cada pulo vale R$ 0,50 de saldo simulado.",
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
  const [betCents, setBetCents] = useState<number>(MIN_BET_CENTS);
  const [inMatch, setInMatch] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const jumpsRef = useRef(0);

  const balance = account?.balanceCents ?? 0;

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  const onJump = useCallback(() => {
    jumpsRef.current += 1;
    setJumps(jumpsRef.current);
    if (user) creditJump(user.id, betCents);
  }, [user, betCents]);

  const onGameOver = useCallback(
    (r: NonNullable<Result>) => {
      setResult(r);
      if (user) {
        recordGame(user.id, {
          score: r.score,
          jumps: r.jumps,
          earnedCents: rewardForJumps(r.jumps, betCents),
          durationMs: r.durationMs,
          betCents,
        });
      }
    },
    [user, betCents],
  );

  const startMatch = (amountCents: number) => {
    if (!user) return;
    if (!placeBet(user.id, amountCents)) {
      setBetError("Saldo insuficiente para essa aposta.");
      return;
    }
    setBetError(null);
    setBetCents(amountCents);
    jumpsRef.current = 0;
    setJumps(0);
    setScore(0);
    setResult(null);
    setPaused(false);
    setInMatch(true);
    setRunId((n) => n + 1);
  };

  const backToBet = () => {
    setInMatch(false);
    setResult(null);
    setPaused(false);
  };

  if (!user) return null;

  if (!inMatch) {
    return (
      <main className="app-bg flex min-h-[100dvh] items-center justify-center p-5">
        <div className="glass neon-ring animate-scale-in w-full max-w-md rounded-3xl p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Entrada da partida
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold">Escolha sua aposta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aposta mínima de {formatBRL(MIN_BET_CENTS)}. O valor é debitado do seu saldo
            simulado ao entrar na partida.
          </p>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">Saldo disponível</span>
            <span className="font-display font-semibold text-neon">{formatBRL(balance)}</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {BET_OPTIONS_CENTS.map((option) => {
              const disabled = option > balance;
              const active = option === betCents;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setBetCents(option);
                    setBetError(null);
                  }}
                  className={`rounded-xl border px-2 py-3 font-display text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary/15 text-neon"
                      : "border-border text-muted-foreground hover:text-foreground"
                  } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {formatBRL(option)}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-center text-sm text-muted-foreground">
            Ganho por pulo nesta aposta:{" "}
            <span className="font-display font-semibold text-neon">
              {formatBRL(rewardPerJump(betCents))}
            </span>
          </p>

          {betError && <p className="mt-3 text-sm text-destructive">{betError}</p>}

          <div className="mt-6 grid gap-2">
            <button
              type="button"
              disabled={betCents > balance}
              onClick={() => startMatch(betCents)}
              className="rounded-xl bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apostar {formatBRL(betCents)} e jogar
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
      </main>
    );
  }

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
                <Row label="Aposta" value={`- ${formatBRL(betCents)}`} />
                <Row
                  label="Ganho nesta partida"
                  value={formatBRL(rewardForJumps(result.jumps, betCents))}
                  highlight
                />
                <Row label="Saldo total" value={formatBRL(balance)} />
              </dl>
              <div className="mt-6 grid gap-2">
                <button
                  type="button"
                  disabled={betCents > balance}
                  onClick={() => startMatch(betCents)}
                  className="rounded-xl bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Jogar novamente ({formatBRL(betCents)})
                </button>
                <button
                  type="button"
                  onClick={backToBet}
                  className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Mudar aposta
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
