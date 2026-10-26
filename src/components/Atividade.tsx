"use client";

import { useState } from "react";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotulo = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;

// Colunas com as proposições apresentadas por mês (uma série, uma cor), com dica ao passar o mouse.
export function AtividadeMensal({ meses }: { meses: { mes: string; proposicoes: number }[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const max = Math.max(1, ...meses.map((m) => m.proposicoes));
  const total = meses.reduce((a, m) => a + m.proposicoes, 0);
  const sel = ativo == null ? null : meses[ativo];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-600">
          {sel ? (
            <>
              <b className="text-slate-900">{sel.proposicoes}</b> em {rotulo(sel.mes)}
            </>
          ) : (
            <>
              <b className="text-slate-900">{total}</b> proposições no período
            </>
          )}
        </span>
        <span className="text-xs text-slate-400">projetos, honrarias e moções</span>
      </div>
      <div className="flex h-32 items-end gap-[2px]" onMouseLeave={() => setAtivo(null)} role="list" aria-label="Proposições por mês">
        {meses.map((m, i) => (
          <button
            key={m.mes}
            type="button"
            role="listitem"
            onMouseEnter={() => setAtivo(i)}
            onFocus={() => setAtivo(i)}
            onClick={() => setAtivo(i)}
            aria-label={`${rotulo(m.mes)}: ${m.proposicoes} proposições`}
            className="group relative flex h-full flex-1 items-end"
          >
            <span
              className={`block w-full rounded-t transition-all duration-500 ${ativo === i ? "bg-blue-700" : "bg-blue-500"} ${m.proposicoes ? "" : "opacity-30"}`}
              style={{ height: `${Math.max(m.proposicoes ? 4 : 2, (m.proposicoes / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{meses[0] && rotulo(meses[0].mes)}</span>
        <span>{meses.at(-1) && rotulo(meses.at(-1)!.mes)}</span>
      </div>
    </div>
  );
}
