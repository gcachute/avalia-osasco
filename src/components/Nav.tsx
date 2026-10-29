"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// "curto" é o nome na barra de baixo do celular, onde seis páginas dividem a largura da tela.
export type ItemNav = { href: string; nome: string; curto?: string; icone: keyof typeof ICONES };

const ativoEm = (caminho: string, href: string) => (href === "/" ? caminho === "/" || caminho === "/mapa/" || caminho === "/mapa" : caminho.startsWith(href));

// Menu do topo (computador e tablet).
export function Nav({ itens }: { itens: ItemNav[] }) {
  const caminho = usePathname();
  return (
    <>
      {itens.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={ativoEm(caminho, n.href) ? "page" : undefined}
          className={`shrink-0 rounded-md px-3 py-1.5 transition ${ativoEm(caminho, n.href) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
        >
          {n.nome}
        </Link>
      ))}
    </>
  );
}

// Ícones de traço simples, 24×24, para a barra de baixo do celular.
const ICONES = {
  painel: "M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11v13.5",
  vereadores: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 8.5v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.6a3 3 0 0 1 0 5.8",
  prefeito: "M3 20h18M5 20V10m14 10V10M9 20v-6h6v6M2.5 10 12 4l9.5 6",
  dinheiro: "M3 6.5h18v11H3v-11ZM6.5 6.5v11m11-11v11M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  historico: "M3 12a9 9 0 1 0 2.6-6.4L3 8m0-5v5h5m4-1v5l3 2",
  metodologia: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Zm0 15A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5ZM8 7.5h8M8 11h6",
};

// Barra de baixo no celular, como num aplicativo: as páginas principais sempre à mão do polegar.
export function NavInferior({ itens }: { itens: ItemNav[] }) {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Páginas"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
        {itens.map((n) => {
          const ativo = ativoEm(caminho, n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-0.5 pb-1.5 pt-2 text-[10px] font-medium tracking-tight transition active:scale-95 ${ativo ? "text-slate-900" : "text-slate-500"}`}
              >
                <span className={`grid h-7 w-11 max-w-full place-items-center rounded-full transition ${ativo ? "bg-slate-200" : ""}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={ativo ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={ICONES[n.icone]} />
                  </svg>
                </span>
                {n.curto ?? n.nome}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
