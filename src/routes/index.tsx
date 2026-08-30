import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signIn, signUp } from "@/lib/jump/store";
import { useSession } from "@/hooks/use-jump-account";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JumpCoins — Jogue. Pule. Acumule." },
      {
        name: "description",
        content:
          "JumpCoins é um runner rítmico neon: pule obstáculos, acumule pontos e veja seu saldo de protótipo crescer a cada pulo.",
      },
      { property: "og:title", content: "JumpCoins — Jogue. Pule. Acumule." },
      {
        property: "og:description",
        content: "Runner rítmico neon com saldo simulado a cada pulo. Crie sua conta e jogue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) navigate({ to: "/menu", replace: true });
  }, [ready, user, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        if (username.trim().length < 2) throw new Error("Informe um nome de usuário.");
        if (password.length < 4) throw new Error("A senha precisa ter ao menos 4 caracteres.");
        signUp(username, email, password);
      } else {
        signIn(email, password);
      }
      navigate({ to: "/menu", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível continuar.");
    }
  };

  return (
    <main className="app-bg flex min-h-screen items-center justify-center px-5 py-12">
      <div className="grid w-full max-w-5xl items-center gap-12 md:grid-cols-2">
        <section className="animate-fade-in text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs tracking-widest text-muted-foreground uppercase">
            Protótipo jogável
          </span>
          <h1 className="mt-5 font-display text-5xl leading-none font-bold sm:text-6xl">
            Jump<span className="text-neon">Coins</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">Jogue. Pule. Acumule.</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Um runner rítmico neon com identidade própria. Cada pulo válido soma R$ 0,50 ao
            seu saldo de demonstração — valores simulados, sem dinheiro real.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-3 text-left">
            {[
              ["1 toque", "Space, clique ou toque"],
              ["+R$ 0,50", "por pulo válido"],
              ["100%", "local, sem cadastro real"],
            ].map(([k, v]) => (
              <div key={k} className="glass rounded-xl px-3 py-3">
                <dt className="font-display text-base font-semibold text-neon">{k}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="glass neon-ring animate-scale-in rounded-3xl p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
            {(["signup", "login"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signup" ? "Criar conta" : "Já tenho uma conta"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field
                label="Nome de usuário"
                value={username}
                onChange={setUsername}
                placeholder="neonrunner"
                autoComplete="username"
              />
            )}
            <Field
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="voce@email.com"
              autoComplete="email"
            />
            <Field
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />

            {error && (
              <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
            >
              {mode === "signup" ? "Criar conta" : "Entrar"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Autenticação simulada e armazenada apenas neste navegador.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
