"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Conteúdo que abre e fecha deslizando (a altura vai de 0 ao tamanho do conteúdo pela grade de uma linha).
// Só monta o conteúdo na primeira abertura; fechado, fica fora do foco do teclado e dos leitores de tela.
export function Abre({ aberto, id, children, className = "" }: { aberto: boolean; id?: string; children: React.ReactNode; className?: string }) {
  const [montado, setMontado] = useState(aberto);
  if (aberto && !montado) setMontado(true);
  return (
    <div
      id={id}
      inert={!aberto}
      className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      style={{ gridTemplateRows: aberto ? "1fr" : "0fr", opacity: aberto ? 1 : 0 }}
    >
      <div className={`min-h-0 overflow-hidden ${className}`}>{montado && children}</div>
    </div>
  );
}

// Botões de escolha única com um destaque que desliza até a opção escolhida.
export function Segmentos<T extends string | number>({
  opcoes,
  valor,
  aoEscolher,
  rotulo,
}: {
  opcoes: { valor: T; nome: React.ReactNode }[];
  valor: T;
  aoEscolher: (v: T) => void;
  rotulo: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [marca, setMarca] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const medir = () => {
      const b = caixa.current?.querySelector<HTMLButtonElement>("[aria-pressed=true]");
      if (b) setMarca({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight });
    };
    medir();
    const obs = new ResizeObserver(medir);
    if (caixa.current) obs.observe(caixa.current);
    return () => obs.disconnect();
  }, [valor, opcoes.length]);
  return (
    <div ref={caixa} className="relative flex flex-wrap gap-1 rounded-lg bg-slate-100 p-0.5" role="group" aria-label={rotulo}>
      {marca && (
        <span
          className="absolute rounded-md bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ left: marca.x, top: marca.y, width: marca.w, height: marca.h }}
          aria-hidden
        />
      )}
      {opcoes.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          aria-pressed={o.valor === valor}
          onClick={() => aoEscolher(o.valor)}
          className={`relative rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${o.valor === valor ? `text-slate-900 ${marca ? "" : "bg-white shadow-sm"}` : "text-slate-600 hover:text-slate-900"}`}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}
