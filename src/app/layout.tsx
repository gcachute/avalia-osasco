import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Animacoes } from "@/components/Animacoes";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { NovaAba } from "@/components/NovaAba";
import { BotaoTema, SCRIPT_TEMA } from "@/components/Tema";
import { dados, dataBR } from "@/lib/dados";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "De Olh OZ — de olho nos políticos de Osasco", template: "%s · De Olh OZ" },
  description: "Notas e indicadores dos vereadores e do prefeito de Osasco, calculados a partir de dados oficiais da Câmara Municipal.",
};

const NAV = [
  { href: "/", nome: "Painel" },
  { href: "/prefeito", nome: "Prefeito" },
  { href: "/evolucao", nome: "Evolução" },
  { href: "/metodologia", nome: "Metodologia" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className={`${geist.variable} min-h-screen bg-slate-50 font-sans text-slate-800 antialiased transition-colors`}>
        <Animacoes />
        <NovaAba />
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" aria-label="De Olh OZ, página inicial">
              <Logo />
            </Link>
            <nav className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 text-sm">
              <Nav itens={NAV} />
              <BotaoTema />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-slate-500">
            <p>
              Projeto independente, sem vínculo com a Câmara Municipal ou a Prefeitura de Osasco. Todos os números vêm dos{" "}
              <a className="underline hover:text-slate-800" href="https://www.osasco.sp.leg.br/registros-de-presenca-e-votacao">
                registros oficiais de presença e votação
              </a>{" "}
              da Câmara.
            </p>
            <p>
              Dados de {dataBR(dados.periodo.inicio)} a {dataBR(dados.periodo.fim)} · {dados.sessoes.length} sessões analisadas · atualizado em{" "}
              {dataBR(dados.geradoEm.slice(0, 10))}. Encontrou um erro? Veja{" "}
              <Link className="underline hover:text-slate-800" href="/metodologia#correcoes">
                como pedir correção
              </Link>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
