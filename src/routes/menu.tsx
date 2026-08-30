import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAccount, useSession } from "@/hooks/use-jump-account";
import { formatBRL } from "@/lib/jump/rewards";
import { signOut } from "@/lib/jump/store";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — JumpCoins" },
      {
        name: "description",
        content: "Seu painel JumpCoins: saldo simulado, acesso ao jogo, perfil e histórico.",
      },
      { property: "og:title", content: "Menu — JumpCoins" },
      {
        property: "og:description",
        content: "Painel do jogador com saldo simulado, jogo, perfil e histórico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const { account } = useAccount(user?.id);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!user) return null;

  return (
    <main className="app-bg min-h-screen px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-muted-foreground">Bem-vindo de volta,</p>
        <h1 className="font-display text-3xl font-bold">{user.username}</h1>

        <section className="glass neon-ring mt-8 rounded-3xl p-6">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Saldo simulado
          </p>
          <p className="mt-2 font-display text-5xl font-bold text-neon">
            {formatBRL(account?.balanceCents ?? 0)}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Valor de demonstração. Sem depósitos, saques ou dinheiro real.
          </p>
        </section>

        <Link
          to="/play"
          className="mt-6 block rounded-3xl bg-primary px-6 py-6 text-center font-display text-2xl font-bold text-primary-foreground transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
        >
          JOGAR
        </Link>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            to="/profile"
            className="glass rounded-2xl px-4 py-4 text-center text-sm font-medium transition-colors hover:text-neon"
          >
            Perfil
          </Link>
          <Link
            to="/history"
            className="glass rounded-2xl px-4 py-4 text-center text-sm font-medium transition-colors hover:text-neon"
          >
            Histórico
          </Link>
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate({ to: "/", replace: true });
            }}
            className="glass rounded-2xl px-4 py-4 text-center text-sm font-medium transition-colors hover:text-destructive"
          >
            Sair
          </button>
        </div>
      </div>
    </main>
  );
}
