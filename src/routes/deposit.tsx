import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAccount, useSession } from "@/hooks/use-jump-account";
import { formatBRL } from "@/lib/jump/rewards";
import { deposit } from "@/lib/jump/store";

export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { title: "Depósito — JumpCoins" },
      {
        name: "description",
        content:
          "Adicione saldo simulado à sua conta JumpCoins para entrar nas partidas apostadas.",
      },
      { property: "og:title", content: "Depósito — JumpCoins" },
      {
        property: "og:description",
        content: "Depósito de demonstração para recarregar o saldo simulado do JumpCoins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepositPage,
});

const PRESETS = [1000, 2000, 5000, 10000, 20000, 50000];
const MIN_DEPOSIT_CENTS = 500;

function DepositPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const { account } = useAccount(user?.id);

  const [amountCents, setAmountCents] = useState(PRESETS[1]);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!user) return null;

  const submit = () => {
    setError(null);
    let cents = amountCents;
    if (custom.trim()) {
      const parsed = Number(custom.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("Informe um valor válido.");
        return;
      }
      cents = Math.round(parsed * 100);
    }
    if (cents < MIN_DEPOSIT_CENTS) {
      setError(`Depósito mínimo de ${formatBRL(MIN_DEPOSIT_CENTS)}.`);
      return;
    }
    const record = deposit(user.id, cents, method);
    if (!record) {
      setError("Não foi possível concluir o depósito.");
      return;
    }
    setCustom("");
    setDone(record.amountCents);
  };

  const deposits = account?.deposits ?? [];

  return (
    <main className="app-bg min-h-screen px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Depósito</h1>
            <p className="text-sm text-muted-foreground">
              Recarga simulada — nenhum pagamento real é processado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/menu" })}
            className="glass rounded-xl px-4 py-2 text-sm"
          >
            Voltar
          </button>
        </div>

        <section className="glass neon-ring mt-6 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Saldo atual
          </p>
          <p className="mt-1 font-display text-4xl font-bold text-neon">
            {formatBRL(account?.balanceCents ?? 0)}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {PRESETS.map((value) => {
              const active = !custom.trim() && value === amountCents;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmountCents(value);
                    setCustom("");
                    setDone(null);
                    setError(null);
                  }}
                  className={`rounded-xl border px-2 py-3 font-display text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary/15 text-neon"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {formatBRL(value)}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-sm">
            <span className="text-muted-foreground">Outro valor (R$)</span>
            <input
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setDone(null);
                setError(null);
              }}
              inputMode="decimal"
              placeholder="Ex.: 35,00"
              className="mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 outline-none focus:border-primary"
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["pix", "card"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                  method === m
                    ? "border-primary bg-primary/15 text-neon"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "pix" ? "Pix (simulado)" : "Cartão (simulado)"}
              </button>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {done !== null && (
            <p className="mt-3 text-sm text-neon">
              Depósito de {formatBRL(done)} confirmado no saldo simulado.
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]"
          >
            Depositar
          </button>
        </section>

        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            Últimos depósitos
          </h2>
          {deposits.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum depósito ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {deposits.map((d) => (
                <li
                  key={d.id}
                  className="glass flex items-center justify-between rounded-2xl px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-display font-semibold text-neon">
                      + {formatBRL(d.amountCents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.method === "pix" ? "Pix" : "Cartão"} ·{" "}
                      {new Date(d.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{d.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
