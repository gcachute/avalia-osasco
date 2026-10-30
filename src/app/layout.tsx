import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Animacoes } from "@/components/Animacoes";
import { Logo } from "@/components/Logo";
import { BotaoTopo, NavegacaoPagina } from "@/components/NavegacaoPagina";
import { Nav, NavInferior, type ItemNav } from "@/components/Nav";
import { NovaAba } from "@/components/NovaAba";
import { AtalhoComoLer } from "@/components/AtalhoComoLer";
import { AvisoIA } from "@/components/AvisoIA";
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

// viewport-fit=cover deixa a barra de baixo respeitar a área do gesto do iPhone; a cor pinta a barra do navegador no celular.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

const NAV: ItemNav[] = [
  { href: "/", nome: "Painel", icone: "painel" },
  { href: "/mapa", nome: "Mapa", icone: "mapa" },
  { href: "/vereadores", nome: "Vereadores", icone: "vereadores" },
  { href: "/prefeito", nome: "Prefeito", icone: "prefeito" },
  { href: "/verbas", nome: "Verbas", icone: "dinheiro" },
  { href: "/historico", nome: "Histórico", icone: "historico", mais: true },
  { href: "/metodologia", nome: "Metodologia", icone: "metodologia", mais: true },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body
        className={`${geist.variable} min-h-screen bg-slate-50 pb-[calc(4.25rem+env(safe-area-inset-bottom))] font-sans text-slate-800 antialiased transition-colors md:pb-0`}
      >
        <Animacoes />
        <NovaAba />
        <AvisoIA />
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 md:py-3">
            <Link href="/" aria-label="De Olho em OZ, página inicial">
              <Logo />
            </Link>
            <div className="flex items-center gap-1 text-sm">
              {/* No celular o menu fica na barra de baixo (NavInferior). */}
              <nav className="hidden items-center gap-1 md:flex">
                <Nav itens={NAV} />
              </nav>
              <BotaoTema />
            </div>
          </div>
          <NavegacaoPagina />
        </header>
        <main className="mx-auto max-w-5xl px-4 py-5 md:py-8">
          <AtalhoComoLer />
          {children}
        </main>
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
        <BotaoTopo />
        <NavInferior itens={NAV} />
      </body>
    </html>
  );
}
