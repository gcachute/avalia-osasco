"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Atalhos para as seções da página, numa faixa logo abaixo do cabeçalho, que acompanha a rolagem e marca a seção
// em que a pessoa está. Só aparece em páginas longas (4 seções ou mais), fora o painel.
const SEM_INDICE = new Set(["/", "/mapa", "/mapa/"]);
const nomeCurto = (t: string) => t.replace(/\s*\(.*?\)\s*/g, " ").trim();

export function NavegacaoPagina() {
  const caminho = usePathname();
  const [secoes, setSecoes] = useState<{ id: string; nome: string }[]>([]);
  const [ativa, setAtiva] = useState<string | null>(null);
  const faixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("main section[id]")].filter((s) => s.querySelector(":scope > h2"));
    const lista =
      SEM_INDICE.has(caminho) || els.length < 4
        ? []
        : els.map((s) => ({ id: s.id, nome: nomeCurto(s.querySelector(":scope > h2")!.textContent ?? "") }));
    setSecoes(lista);
    setAtiva(null);
    if (!lista.length) return;
    // A seção ativa é a que cruza a faixa logo abaixo do cabeçalho.
    const obs = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visiveis[0]) setAtiva(visiveis[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px" },
    );
    els.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [caminho]);

  // Mantém o atalho ativo visível na faixa (rola só a faixa, não a página).
  useEffect(() => {
    const f = faixa.current;
    const el = ativa ? f?.querySelector<HTMLElement>(`[data-secao="${ativa}"]`) : null;
    if (f && el) f.scrollTo({ left: el.offsetLeft - f.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [ativa]);

  if (!secoes.length) return null;
  return (
    <>
      {secoes.length > 0 && (
        <nav aria-label="Seções desta página" className="border-t border-slate-100">
          <div ref={faixa} className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {secoes.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                data-secao={s.id}
                aria-current={ativa === s.id ? "location" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                  ativa === s.id ? "bg-slate-900 text-white ring-slate-900" : "text-slate-600 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {s.nome}
              </a>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}

// Botão de voltar ao topo, depois de umas duas telas de rolagem. Fica fora do cabeçalho: o desfoque do cabeçalho
// faria a posição fixa valer em relação a ele, e não à tela.
export function BotaoTopo() {
  const caminho = usePathname();
  const [topo, setTopo] = useState(false);
  useEffect(() => {
    const olhar = () => setTopo(window.scrollY > window.innerHeight * 2);
    olhar();
    window.addEventListener("scroll", olhar, { passive: true });
    return () => window.removeEventListener("scroll", olhar);
  }, [caminho]);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label="Voltar ao topo"
      className={`fixed right-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-slate-900 text-white shadow-lg transition bottom-[calc(7rem+env(safe-area-inset-bottom))] md:bottom-6 ${
        topo ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
