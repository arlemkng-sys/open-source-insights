import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Novo Projeto — Comece do Zero" },
      {
        name: "description",
        content:
          "Base limpa pronta para construir sua próxima aplicação web do zero.",
      },
      { property: "og:title", content: "Novo Projeto — Comece do Zero" },
      {
        property: "og:description",
        content:
          "Base limpa pronta para construir sua próxima aplicação web do zero.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        Projeto zerado
      </h1>
      <p className="max-w-md text-muted-foreground">
        Tudo limpo. Me conte o que você quer construir e eu começo daqui.
      </p>
    </main>
  );
}
