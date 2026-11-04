"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Índice da página na coluna da direita, para páginas de texto longo no computador. Lê as seções da própria página
// (os mesmos títulos da faixa de atalhos do topo) e marca a seção em que a pessoa está.
export function IndiceLateral() {
  const caminho = usePathname();
  const [secoes, setSecoes] = useState<{ id: string; nome: string }[]>([]);
  const [ativa, setAtiva] = useState<string | null>(null);

  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("main section[id]")].filter((s) => s.querySelector(":scope > h2"));
    setSecoes(els.map((s) => ({ id: s.id, nome: (s.querySelector(":scope > h2")!.textContent ?? "").replace(/\s*\(.*?\)\s*/g, " ").trim() })));
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

  if (!secoes.length) return null;
  return (
    <nav aria-label="Nesta página" className="text-sm">
      <div className="font-bold text-slate-950">Nesta página</div>
      <ul className="mt-2 space-y-0.5 border-l-2 border-slate-200">
        {secoes.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={ativa === s.id ? "location" : undefined}
              className={`-ml-0.5 block border-l-2 py-1 pl-3 transition ${ativa === s.id ? "border-blue-700 font-bold text-slate-950" : "border-transparent text-slate-600 hover:text-slate-950"}`}
            >
              {s.nome}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
