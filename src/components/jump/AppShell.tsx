import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="app-bg min-h-screen px-5 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Link
            to="/menu"
            className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Voltar
          </Link>
        </header>
        <div className="animate-fade-in space-y-4">{children}</div>
      </div>
    </main>
  );
}
