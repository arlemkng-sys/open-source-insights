import { useEffect, useState } from "react";
import { sfx } from "@/lib/jump-audio";
import {
  MISSIONS,
  formatCountdown,
  msUntilReset,
  type JumpCoinsSave,
  type MissionId,
} from "@/lib/jump-storage";

type Props = {
  open: boolean;
  onClose: () => void;
  save: JumpCoinsSave;
  onClaim: (id: MissionId) => void;
};

export function MissionsModal({ open, onClose, save, onClaim }: Props) {
  const [left, setLeft] = useState(msUntilReset());

  useEffect(() => {
    if (!open) return;
    setLeft(msUntilReset());
    const t = setInterval(() => setLeft(msUntilReset()), 1000);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Missões e recompensas"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl neon-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-neon-pink neon-text">🎯 Missões Diárias</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Renova em: {formatCountdown(left)}
            </p>
          </div>
          <button
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Fechar
          </button>
        </div>

        <ul className="mt-6 space-y-4">
          {MISSIONS.map((m) => {
            const st = save.missions[m.id];
            const pct = Math.min(100, (st.progress / m.goal) * 100);
            const done = pct >= 100;
            return (
              <li key={m.id} className="rounded-xl border border-border bg-surface/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-neon-cyan">
                    +{m.reward} 🪙
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        done ? "bg-neon-green neon-glow" : "bg-neon-purple"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 text-right font-mono text-xs text-muted-foreground">
                    {Math.min(st.progress, m.goal)}/{m.goal} {m.unit}
                  </span>
                </div>
                <button
                  disabled={!done || st.claimed}
                  onClick={() => onClaim(m.id)}
                  className="mt-3 w-full rounded-lg bg-neon-green px-4 py-2 text-sm font-bold text-primary-foreground transition enabled:neon-glow enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
                >
                  {st.claimed ? "RECOMPENSA RESGATADA" : done ? "RESGATAR RECOMPENSA" : "EM PROGRESSO"}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Protótipo arcade casual. Moedas e valores são fictícios — não há apostas, depósitos ou
          saques reais.
        </p>
      </div>
    </div>
  );
}
