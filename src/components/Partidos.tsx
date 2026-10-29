"use client";

import { useState } from "react";
import { nota } from "@/lib/formato";
import { SeloPartido } from "./ui";

export type MediaPartido = { partido: string; logo?: string | null; media: number; sessoes: number; vereadores: { nome: string; nota: number; sessoes: number; saiu: boolean }[] };

// Barras horizontais com a média de cada partido no coeficiente escolhido (uma série, uma cor).
// Passar o mouse ou tocar mostra quem são os vereadores do partido.
// Partido com menos da metade das sessões do período (um suplente recente, por exemplo) fica com a barra mais clara.
export function GraficoPartidos({ conjuntos, sessoesPeriodo }: { conjuntos: { chave: string; nome: string; dados: MediaPartido[] }[]; sessoesPeriodo: number }) {
  const [chave, setChave] = useState(conjuntos[0]?.chave);
  const [ativo, setAtivo] = useState<string | null>(null);
  const atual = conjuntos.find((c) => c.chave === chave) ?? conjuntos[0];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Coeficiente">
        {conjuntos.map((c) => (
          <button
            key={c.chave}
            onClick={() => setChave(c.chave)}
            aria-pressed={c.chave === atual.chave}
            className={`flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${c.chave === atual.chave ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {c.nome}
          </button>
        ))}
      </div>
      <ul className="space-y-2" role="list">
        {atual.dados.map((p) => {
          const aberto = ativo === p.partido;
          const pouco = p.sessoes < sessoesPeriodo / 2;
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
                className="grid w-full grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 rounded-lg px-1 py-1 text-left text-sm transition hover:bg-slate-50"
              >
                <span className="min-w-0 truncate font-medium text-slate-700">
                  <SeloPartido sigla={p.partido} logo={p.logo} />
                </span>
                <span className="relative h-5">
                  <span className="absolute inset-y-0 left-0 w-full rounded bg-slate-100" />
                  <span
                    className="absolute inset-y-0 left-0 rounded"
                    style={{
                      width: `${(p.media / 10) * 100}%`,
                      background: aberto ? "var(--color-blue-700)" : "var(--color-blue-500)",
                      opacity: pouco && !aberto ? 0.4 : 1,
                      transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s",
                    }}
                  />
                </span>
                <span className="text-right font-semibold tabular-nums text-slate-900">{nota(p.media)}</span>
              </button>
              <div className={`grid transition-all duration-300 ${aberto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <p className="overflow-hidden pl-[7.25rem] text-xs text-slate-500">
                  {pouco && <b className="font-semibold text-slate-700">Pouco tempo de cargo: {p.sessoes} de {sessoesPeriodo} sessões. </b>}
                  {p.vereadores.map((v) => `${v.nome}${v.saiu ? ", já saiu" : ""} (${nota(v.nota)} em ${v.sessoes} sessões)`).join(" · ")}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Média dos vereadores de cada partido na legislatura, inclusive quem já saiu, com peso pelas sessões em que cada um esteve no cargo. De 0 a 10. Barra mais clara: partido com menos da metade das sessões do período. Passe o mouse ou toque para ver quem são.</p>
    </div>
  );
}
