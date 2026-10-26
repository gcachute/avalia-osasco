"use client";

import { useState } from "react";
import { nota } from "@/lib/formato";

export type MediaPartido = { partido: string; media: number; vereadores: { nome: string; nota: number }[] };

// Barras horizontais com a nota média de cada partido (uma série, uma cor). Passar o mouse
// ou tocar mostra quem são os vereadores do partido.
export function GraficoPartidos({ dados }: { dados: MediaPartido[] }) {
  const [ativo, setAtivo] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <ul className="space-y-2" role="list">
        {dados.map((p) => {
          const aberto = ativo === p.partido;
          return (
            <li key={p.partido}>
              <button
                type="button"
                onMouseEnter={() => setAtivo(p.partido)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(p.partido)}
                onBlur={() => setAtivo(null)}
                onClick={() => setAtivo(aberto ? null : p.partido)}
                aria-expanded={aberto}
                className="grid w-full grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 rounded-lg px-1 py-1 text-left text-sm transition hover:bg-slate-50"
              >
                <span className="truncate font-medium text-slate-700">{p.partido}</span>
                <span className="relative h-5">
                  <span className="absolute inset-y-0 left-0 w-full rounded bg-slate-100" />
                  <span
                    className={`barra-anim absolute inset-y-0 left-0 rounded transition-colors ${aberto ? "bg-blue-700" : "bg-blue-500"}`}
                    style={{ width: `${(p.media / 10) * 100}%` }}
                  />
                </span>
                <span className="text-right font-semibold tabular-nums text-slate-900">{nota(p.media)}</span>
              </button>
              <div className={`grid transition-all duration-300 ${aberto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <p className="overflow-hidden pl-[6.25rem] text-xs text-slate-500">
                  {p.vereadores.map((v) => `${v.nome} (${nota(v.nota)})`).join(" · ")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Média simples das notas dos vereadores em exercício de cada partido. Passe o mouse ou toque para ver quem são.</p>
    </div>
  );
}
