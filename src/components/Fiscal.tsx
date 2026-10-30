"use client";

import { useState } from "react";
import type { AnoFiscal } from "@/lib/dados";
import { nota, nota10, num } from "@/lib/formato";
import { INDICADORES, rotuloPeriodo } from "@/lib/fiscal";

export function TabelaPares({ anos }: { anos: AnoFiscal[] }) {
  const padrao = [...anos].reverse().find((a) => a.completo && a.mandato) ?? anos.at(-1)!;
  const [ano, setAno] = useState(padrao.ano);
  const a = anos.find((x) => x.ano === ano)!;
  const ordenadas = [...a.cidades].sort((x, y) => (nota10(y.pilares.A.nota) ?? -1) + (nota10(y.pilares.B.nota) ?? -1) - ((nota10(x.pilares.A.nota) ?? -1) + (nota10(x.pilares.B.nota) ?? -1)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="tablist">
        {anos.map((x) => (
          <button
            key={x.ano}
            role="tab"
            aria-selected={x.ano === ano}
            onClick={() => setAno(x.ano)}
            className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset ${x.ano === ano ? "bg-blue-800 text-white ring-blue-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"}`}
          >
            {x.ano}
            {!x.mandato && " · gestão anterior"}
            {!x.completo && " · parcial"}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-slate-500">
        {a.ano}: {rotuloPeriodo(a)}. Todas as cidades comparadas no mesmo período.
        {!a.completo && " Ano em andamento: os valores ainda vão mudar e as notas dos pilares só são calculadas com o ano fechado."}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Cidade</th>
              {INDICADORES.map((i) => (
                <th key={i.chave} className="px-3 py-2 text-right">
                  {i.nome}
                </th>
              ))}
              <th className="px-3 py-2 text-right">Resultado primário</th>
              <th className="px-3 py-2 text-right">Pilar A</th>
              <th className="px-3 py-2 text-right">Pilar B</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ordenadas.map((c) => (
              <tr key={c.ibge} className={c.foco ? "bg-blue-50/60 font-medium" : ""}>
                <td className="px-3 py-2.5 text-slate-900">
                  {c.nome}
                  {c.semDados && <span className="ml-1 text-xs font-normal text-slate-400">(sem dados)</span>}
                </td>
                {INDICADORES.map((i) => (
                  <td key={i.chave} className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                    {c.indicadores[i.chave] == null ? "—" : `${num(c.indicadores[i.chave])}%`}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                  {!a.completo ? (
                    <span className="text-slate-400" title="A meta da Lei de Diretrizes Orçamentárias é anual">—</span>
                  ) : c.indicadores.primario ? (
                    <span className={c.indicadores.primario.diferencaRCL >= -0.05 ? "text-emerald-700" : "text-rose-700"}>
                      {c.indicadores.primario.diferencaRCL >= 0
                        ? "bateu a meta"
                        : c.indicadores.primario.diferencaRCL >= -0.05
                          ? "na meta"
                          : `${num(c.indicadores.primario.diferencaRCL)}% da receita líquida`}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{nota(nota10(c.pilares.A.nota))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{nota(nota10(c.pilares.B.nota))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Saúde, educação e FUNDEB: % aplicado das receitas (mínimos de 15%, 25% e 70%; FUNDEB 60% até 2020), como declarado no SIOPS e no SIOPE (no
        ano em andamento, pelo relatório bimestral). Pessoal: despesa com pessoal do Executivo sobre a receita corrente líquida ajustada (limite de 54%).
        Investimento: investimentos empenhados sobre a despesa total. Resultado primário: diferença para a meta da Lei de Diretrizes Orçamentárias, em % da receita corrente líquida. Dados do
        Executivo de cada cidade.
      </p>
    </div>
  );
}
