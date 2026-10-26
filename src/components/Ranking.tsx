"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Vereador as VereadorCompleto } from "@/lib/dados";
import { pct, plural } from "@/lib/formato";
import { Avatar, NotaBadge } from "./ui";

type Vereador = Pick<VereadorCompleto, "id" | "nome" | "partido" | "foto" | "emExercicio" | "nota" | "posicao" | "indicadores"> & { mesa: string | null };

type Coluna = { chave: string; nome: string; valor: (v: Vereador) => number | null; mostrar: (v: Vereador) => string; dica: string };

const COLUNAS: Coluna[] = [
  { chave: "nota", nome: "Nota", valor: (v) => v.nota, mostrar: () => "", dica: "Nota de 0 a 10" },
  { chave: "presenca", nome: "Presença", valor: (v) => v.indicadores.presencaAjustada, mostrar: (v) => pct(v.indicadores.presencaAjustada), dica: "Presença nas sessões, sem contar faltas justificadas" },
  { chave: "projetos", nome: "Projetos", valor: (v) => v.indicadores.projetosSubstantivos, mostrar: (v) => `${v.indicadores.projetosSubstantivos} + ${v.indicadores.projetosSimbolicos}`, dica: "Projetos de política pública + simbólicos (nomes de rua, datas)" },
  { chave: "leis", nome: "Leis", valor: (v) => v.indicadores.leisSancionadas, mostrar: (v) => String(v.indicadores.leisSancionadas), dica: "Leis sancionadas de sua autoria" },
  { chave: "comissoes", nome: "Comissões", valor: (v) => v.indicadores.pontosComissoes, mostrar: (v) => (v.mesa ? "Mesa" : String(v.indicadores.comissoes)), dica: "Comissões permanentes e temporárias de que participa (ou cargo na Mesa Diretora)" },
  { chave: "adiados", nome: "Adiados", valor: (v) => -v.indicadores.adiadasPorAusencia, mostrar: (v) => String(v.indicadores.adiadasPorAusencia), dica: "Itens próprios adiados porque o autor faltou (menos é melhor)" },
];

export function Ranking({ vereadores }: { vereadores: Vereador[] }) {
  const [ordem, setOrdem] = useState("nota");
  const [busca, setBusca] = useState("");
  const [todos, setTodos] = useState(false);

  const lista = useMemo(() => {
    const col = COLUNAS.find((c) => c.chave === ordem)!;
    const q = busca.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    return vereadores
      .filter((v) => todos || v.emExercicio)
      .filter((v) => !q || `${v.nome} ${v.partido ?? ""}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(q))
      .sort((a, b) => (col.valor(b) ?? -1) - (col.valor(a) ?? -1) || a.nome.localeCompare(b.nome));
  }, [vereadores, ordem, busca, todos]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar vereador ou partido"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:w-72"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} className="accent-blue-700" />
          Incluir quem já saiu da Câmara
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 sm:hidden">
          Ordenar por
          <select value={ordem} onChange={(e) => setOrdem(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1">
            {COLUNAS.map((c) => (
              <option key={c.chave} value={c.chave}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="hidden bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 sm:table-header-group">
            <tr>
              <th className="w-10 px-3 py-2 text-right">#</th>
              <th className="px-3 py-2">Vereador</th>
              {COLUNAS.map((c) => (
                <th key={c.chave} className="px-3 py-2 text-right" title={c.dica}>
                  <button onClick={() => setOrdem(c.chave)} className={`uppercase hover:text-slate-900 ${ordem === c.chave ? "text-blue-800" : ""}`}>
                    {c.nome}
                    {ordem === c.chave && " ↓"}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((v, i) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-3 py-3 text-right tabular-nums text-slate-400">{i + 1}</td>
                <td className="px-3 py-3">
                  <Link href={`/vereadores/${v.id}`} className="flex items-center gap-3">
                    <Avatar nome={v.nome} foto={v.foto} />
                    <span>
                      <span className="block font-medium text-slate-900 hover:text-blue-800">{v.nome}</span>
                      <span className="block text-xs text-slate-500">
                        {v.partido && <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">{v.partido}</span>}
                        {!v.partido && "Partido não informado"}
                        {!v.emExercicio && " · fora da Câmara"}
                        {v.nota == null && ` · ${v.indicadores.sessoes} sessões (poucos dados)`}
                      </span>
                      <span className="mt-1 block text-xs text-slate-600 sm:hidden">
                        Presença {pct(v.indicadores.presencaAjustada)} · {plural(v.indicadores.projetosSubstantivos, "projeto", "projetos")} · {plural(v.indicadores.adiadasPorAusencia, "adiado", "adiados")}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-right">
                  <NotaBadge valor={v.nota} />
                </td>
                {COLUNAS.slice(1).map((c) => (
                  <td key={c.chave} className="hidden px-3 py-3 text-right tabular-nums text-slate-700 sm:table-cell">
                    {c.mostrar(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <p className="p-6 text-center text-sm text-slate-500">Nenhum vereador encontrado.</p>}
      </div>
    </div>
  );
}
