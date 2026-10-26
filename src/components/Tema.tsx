"use client";

import { useEffect, useState } from "react";

type Tema = "sistema" | "claro" | "escuro";
const ORDEM: Tema[] = ["sistema", "claro", "escuro"];
const ROTULO: Record<Tema, string> = { sistema: "Tema do sistema", claro: "Tema claro", escuro: "Tema escuro" };

// Roda no <head> antes da página aparecer, para não piscar o tema errado.
export const SCRIPT_TEMA = `(function(){try{var d=document.documentElement;d.classList.add("js");var t=localStorage.getItem("tema");var e=t==="escuro"||(t!=="claro"&&matchMedia("(prefers-color-scheme: dark)").matches);d.classList.toggle("dark",e)}catch(_){}})();`;

function aplicar(tema: Tema) {
  const escuro = tema === "escuro" || (tema === "sistema" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", escuro);
}

export function BotaoTema() {
  const [tema, setTema] = useState<Tema>("sistema");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem("tema") as Tema | null;
      if (salvo && ORDEM.includes(salvo)) setTema(salvo);
    } catch {}
  }, []);

  useEffect(() => {
    aplicar(tema);
    if (tema !== "sistema") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const ouvir = () => aplicar("sistema");
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, [tema]);

  const proximo = () => {
    const t = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length];
    setTema(t);
    try {
      if (t === "sistema") localStorage.removeItem("tema");
      else localStorage.setItem("tema", t);
    } catch {}
  };

  return (
    <button
      onClick={proximo}
      title={`${ROTULO[tema]} (clique para trocar)`}
      aria-label={`${ROTULO[tema]}. Clique para trocar.`}
      className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {tema === "claro" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : tema === "escuro" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      )}
    </button>
  );
}
