import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/jump/AppShell";
import { useAccount, useSession } from "@/hooks/use-jump-account";
import { formatBRL } from "@/lib/jump/rewards";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Perfil do jogador — JumpCoins" },
      {
        name: "description",
        content:
          "Perfil JumpCoins com saldo simulado, total de pulos, partidas jogadas e melhor pontuação.",
      },
      { property: "og:title", content: "Perfil do jogador — JumpCoins" },
      {
        property: "og:description",
        content: "Estatísticas do jogador: saldo, pulos, partidas e recorde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const { account } = useAccount(user?.id);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!user) return null;

  const stats = [
    ["Saldo", formatBRL(account?.balanceCents ?? 0)],
    ["Total ganho", formatBRL(account?.totalEarnedCents ?? 0)],
    ["Total de pulos", String(account?.totalJumps ?? 0)],
    ["Partidas", String(account?.gamesPlayed ?? 0)],
    ["Melhor pontuação", String(account?.bestScore ?? 0)],
  ];

  return (
    <AppShell title="Perfil" subtitle="Dados do protótipo salvos localmente">
      <section className="glass neon-ring flex items-center gap-4 rounded-3xl p-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-display text-xl font-semibold">{user.username}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map(([label, value]) => (
          <div key={label} className="glass rounded-2xl px-5 py-4">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-neon">{value}</p>
          </div>
        ))}
      </div>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Protótipo sem dinheiro real: nenhum depósito, saque ou pagamento está disponível.
      </p>
    </AppShell>
  );
}
