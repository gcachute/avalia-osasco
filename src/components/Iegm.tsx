"use client";

import { useState } from "react";
import type { AnoIegm } from "@/lib/dados";
import { FAIXAS, INDICES_IEGM } from "@/lib/iegm";
import { RolagemLateral } from "@/components/RolagemLateral";

export function Faixa({ valor }: { valor: string | null | undefined }) {
  if (!valor) return <span className="text-slate-400">—</span>;
  const f = FAIXAS[valor];
  return (
    <span title={f?.nome} className={`inline-block min-w-8 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold ring-1 ring-inset ${f?.classe ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {valor}
    </span>
  );
}

export function TabelaIegm({ anos }: { anos: AnoIegm[] }) {
  const [anoBase, setAnoBase] = useState(anos.at(-1)!.anoBase);
  const a = anos.find((x) => x.anoBase === anoBase)!;
  const ordenadas = [...a.cidades].sort((x, y) => (x.ranking ?? 99) - (y.ranking ?? 99) || x.nome.localeCompare(y.nome));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="tablist">
        {anos.slice(-4).map((x) => (
          <button
            key={x.anoBase}
            role="tab"
            aria-selected={x.anoBase === anoBase}
            onClick={() => setAnoBase(x.anoBase)}
            className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset ${x.anoBase === anoBase ? "bg-blue-800 text-white ring-blue-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"}`}
          >
            Ano-base {x.anoBase}
            {!x.mandato && " · gestão anterior"}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-slate-500">
        {a.descricao}, avaliando {a.totalMunicipios} municípios paulistas.
      </p>
      <RolagemLateral className="rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Cidade</th>
              {INDICES_IEGM.map((i) => (
                <th key={i.chave} className={`px-2 py-2 text-center ${i.chave === "iegm" ? "text-slate-700" : ""}`}>
                  {i.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ordenadas.map((c) => (
              <tr key={c.ibge} className={c.foco ? "bg-blue-50/60 font-medium" : ""}>
                <td className="px-3 py-2.5 text-slate-900">{c.nome}</td>
                {INDICES_IEGM.map((i) => (
                  <td key={i.chave} className="px-2 py-2.5 text-center">
                    <Faixa valor={c.faixas?.[i.chave]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </RolagemLateral>
      <p className="mt-2 text-xs text-slate-500">
        Faixas do TCE-SP: {Object.entries(FAIXAS).map(([k, f]) => `${k} = ${f.nome.toLowerCase()}`).join(", ")}. Passe o mouse sobre a faixa para ver o nome.
      </p>
    </div>
  );
}
