import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAccount, useSession } from "@/hooks/use-jump-account";
import { formatBRL } from "@/lib/jump/rewards";
import {
  MIN_WITHDRAW_CENTS,
  requestWithdrawal,
  type PixKeyType,
} from "@/lib/jump/store";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Solicitar saque — JumpCoins" },
      {
        name: "description",
        content:
          "Solicite o saque do seu saldo JumpCoins via PIX escolhendo o tipo de chave e o valor desejado.",
      },
      { property: "og:title", content: "Solicitar saque — JumpCoins" },
      {
        property: "og:description",
        content: "Saque seu saldo JumpCoins via PIX a partir de R$ 20,00.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WithdrawPage,
});

const KEY_TYPES: { value: PixKeyType; label: string; placeholder: string }[] = [
  { value: "cpf", label: "CPF", placeholder: "000.000.000-00" },
  { value: "email", label: "E-mail", placeholder: "voce@email.com" },
  { value: "phone", label: "Telefone", placeholder: "(11) 99999-9999" },
  { value: "random", label: "Chave aleatória", placeholder: "chave-aleatoria-uuid" },
];

function WithdrawPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const { account } = useAccount(user?.id);

  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [pixKey, setPixKey] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<number | null>(null);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!user) return null;

  const balance = account?.balanceCents ?? 0;
  const withdrawals = account?.withdrawals ?? [];
  const active = KEY_TYPES.find((k) => k.value === pixKeyType)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmed(null);
    setStatus("loading");

    const parsed = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus("error");
      setError("Informe um valor válido.");
      return;
    }
    const cents = Math.round(parsed * 100);

    // Ponto de integração com o gateway de pagamento / API.
    const result = requestWithdrawal(user.id, { amountCents: cents, pixKeyType, pixKey });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setStatus("success");
    setConfirmed(result.record.amountCents);
    setAmount("");
  };

  return (
    <main className="app-bg min-h-screen px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Solicitar saque</h1>
            <p className="text-sm text-muted-foreground">
              Transferência via PIX a partir de {formatBRL(MIN_WITHDRAW_CENTS)}.
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
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Saldo disponível
          </p>
          <p className="mt-1 font-display text-4xl font-bold text-neon">{formatBRL(balance)}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <span className="mb-1.5 block text-xs tracking-wide text-muted-foreground uppercase">
                Tipo de chave PIX
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {KEY_TYPES.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setPixKeyType(k.value)}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${
                      pixKeyType === k.value
                        ? "border-primary bg-primary/15 text-neon"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs tracking-wide text-muted-foreground uppercase">
                Chave PIX
              </span>
              <input
                required
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                maxLength={140}
                placeholder={active.placeholder}
                className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs tracking-wide text-muted-foreground uppercase">
                Valor do saque (R$)
              </span>
              <input
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Ex.: 50,00"
                className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Mínimo {formatBRL(MIN_WITHDRAW_CENTS)} · disponível {formatBRL(balance)}
              </span>
            </label>

            {error && (
              <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {status === "success" && confirmed !== null && (
              <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-neon">
                Saque de {formatBRL(confirmed)} solicitado. Você receberá na chave informada
                após a análise.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-xl bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {status === "loading" ? "Enviando..." : "Confirmar solicitação de saque"}
            </button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="text-xs tracking-widest text-muted-foreground uppercase">
            Últimos saques
          </h2>
          {withdrawals.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum saque solicitado ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {withdrawals.map((w) => (
                <li
                  key={w.id}
                  className="glass flex items-center justify-between rounded-2xl px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-display font-semibold">- {formatBRL(w.amountCents)}</p>
                    <p className="text-xs text-muted-foreground">
                      {KEY_TYPES.find((k) => k.value === w.pixKeyType)?.label} · {w.pixKey} ·{" "}
                      {new Date(w.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{w.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
