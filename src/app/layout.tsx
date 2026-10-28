import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Animacoes } from "@/components/Animacoes";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { NovaAba } from "@/components/NovaAba";
import { PedidoCorrecao } from "@/components/PedidoCorrecao";
import { BotaoTema, SCRIPT_TEMA } from "@/components/Tema";
import { dados, dataBR } from "@/lib/dados";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "De Olho em OZ — os políticos de Osasco em dados oficiais", template: "%s · De Olho em OZ" },
  description: "Vereadores e prefeito de Osasco em dados oficiais: presença, projetos, contas da Prefeitura e da Câmara, e o retrato de cada bairro no mapa.",
  metadataBase: new URL("https://deolhoemoz.com.br"),
  // Como o site aparece quando alguém compartilha um endereço dele (a imagem vem de opengraph-image.tsx).
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "De Olho em OZ",
    title: "De Olho em OZ",
    description: "Os vereadores e o prefeito de Osasco em dados oficiais: presença, projetos, contas públicas e o retrato de cada bairro.",
  },
  twitter: { card: "summary_large_image" },
};

const NAV = [
  { href: "/", nome: "Painel" },
  { href: "/vereadores", nome: "Vereadores" },
  { href: "/prefeito", nome: "Prefeito" },
  { href: "/historico", nome: "Histórico" },
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
            <Link href="/" aria-label="De Olho em OZ, página inicial">
              <Logo />
            </Link>
            <nav className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Nav itens={NAV} />
              <BotaoTema />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-slate-500">
            <p>
              Projeto independente, sem vínculo com a Câmara Municipal ou a Prefeitura de Osasco. Todos os números vêm de fontes oficiais (Câmara,
              Tesouro Nacional, TCE-SP, IBGE, TSE, INEP e DataSUS), listadas na{" "}
              <Link className="underline hover:text-slate-800" href="/metodologia">
                metodologia
              </Link>
              .
            </p>
            <p>
              Dados de {dataBR(dados.periodo.inicio)} a {dataBR(dados.periodo.fim)} · {dados.sessoes.length} sessões analisadas · atualizado em{" "}
              {dataBR(dados.geradoEm.slice(0, 10))}. Encontrou um erro?{" "}
              <PedidoCorrecao className="underline hover:text-slate-800">Peça uma correção</PedidoCorrecao>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
