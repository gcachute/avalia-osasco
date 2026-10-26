"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PilarVereador, Vereador as VereadorCompleto } from "@/lib/dados";
import { nota, nota10, pct, plural } from "@/lib/formato";
import { Avatar, NotaBadge, Retrato } from "./ui";

export type ItemRanking = Pick<VereadorCompleto, "id" | "nome" | "partido" | "foto" | "emExercicio" | "nota" | "posicao" | "indicadores"> & {
  mesa: string | null;
  pilares: Record<PilarVereador, number | null>;
};

type Ordem = { chave: string; nome: string; valor: (v: ItemRanking) => number | null };

const ORDENS: Ordem[] = [
  { chave: "nota", nome: "Nota", valor: (v) => v.nota },
  { chave: "presenca", nome: "Presença", valor: (v) => v.indicadores.presencaAjustada },
  { chave: "projetos", nome: "Projetos de política pública", valor: (v) => v.indicadores.projetosSubstantivos },
  { chave: "leis", nome: "Leis sancionadas", valor: (v) => v.indicadores.leisSancionadas },
  { chave: "comissoes", nome: "Comissões", valor: (v) => v.indicadores.pontosComissoes },
  { chave: "adiados", nome: "Menos itens adiados", valor: (v) => -v.indicadores.adiadasPorAusencia },
];

const PILARES: { chave: PilarVereador; nome: string }[] = [
  { chave: "A", nome: "Assiduidade" },
  { chave: "B", nome: "Legislação" },
  { chave: "C", nome: "Comissões" },
  { chave: "E", nome: "Pauta" },
];

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function MiniPilares({ v }: { v: ItemRanking }) {
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-label="Notas por pilar">
      {PILARES.map((p) => {
        const n = v.pilares[p.chave];
        return (
          <div key={p.chave} title={`${p.nome}: ${n == null ? "sem dados" : nota(nota10(n))}`}>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="barra-anim h-full rounded-full bg-blue-600" style={{ width: `${(n ?? 0) * 100}%` }} />
            </div>
            <div className="mt-1 truncate text-[10px] uppercase tracking-wide text-slate-400">{p.nome}</div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ v, posicao }: { v: ItemRanking; posicao: number }) {
  return (
    <Link
      href={`/vereadores/${v.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
    >
      <div className="relative">
        <Retrato nome={v.nome} foto={v.foto} />
        <span className="absolute left-2 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-slate-900/85 px-2 text-sm font-semibold text-white backdrop-blur">
          {posicao}º
        </span>
        <span className="absolute right-2 top-2">
          <NotaBadge valor={v.nota} />
        </span>
        {v.mesa && <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur">{v.mesa}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div>
          <div className="font-semibold leading-tight text-slate-900 group-hover:text-blue-800">{v.nome}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {v.partido && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">{v.partido}</span>}
            {!v.emExercicio && <span>fora da Câmara</span>}
            {v.nota == null && <span>{v.indicadores.sessoes} sessões, sem nota</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          <div className="rounded-lg bg-slate-50 py-1.5">
            <div className="font-semibold tabular-nums text-slate-900">{pct(v.indicadores.presencaAjustada)}</div>
            <div className="text-slate-500">presença</div>
          </div>
          <div className="rounded-lg bg-slate-50 py-1.5">
            <div className="font-semibold tabular-nums text-slate-900">{v.indicadores.projetosSubstantivos}</div>
            <div className="text-slate-500">projetos</div>
          </div>
          <div className="rounded-lg bg-slate-50 py-1.5">
            <div className="font-semibold tabular-nums text-slate-900">{v.indicadores.adiadasPorAusencia}</div>
            <div className="text-slate-500">adiados</div>
          </div>
        </div>
        <div className="mt-auto">
          <MiniPilares v={v} />
        </div>
      </div>
    </Link>
  );
}

export function Ranking({ vereadores }: { vereadores: ItemRanking[] }) {
  const [ordem, setOrdem] = useState("nota");
  const [busca, setBusca] = useState("");
  const [partido, setPartido] = useState("");
  const [todos, setTodos] = useState(false);
  const [modo, setModo] = useState<"cards" | "tabela">("cards");

  useEffect(() => {
    try {
      const m = localStorage.getItem("ranking-modo");
      if (m === "cards" || m === "tabela") setModo(m);
    } catch {}
  }, []);
  const trocarModo = (m: "cards" | "tabela") => {
    setModo(m);
    try {
      localStorage.setItem("ranking-modo", m);
    } catch {}
  };

  const partidos = useMemo(
    () => [...new Set(vereadores.filter((v) => todos || v.emExercicio).map((v) => v.partido).filter(Boolean) as string[])].sort(),
    [vereadores, todos],
  );

  const lista = useMemo(() => {
    const o = ORDENS.find((x) => x.chave === ordem)!;
    const q = semAcento(busca);
    return vereadores
      .filter((v) => todos || v.emExercicio)
      .filter((v) => !partido || v.partido === partido)
      .filter((v) => !q || semAcento(`${v.nome} ${v.partido ?? ""}`).includes(q))
      .sort((a, b) => (o.valor(b) ?? -Infinity) - (o.valor(a) ?? -Infinity) || a.nome.localeCompare(b.nome));
  }, [vereadores, ordem, busca, partido, todos]);

  return (
    <div>
      <div className="mb-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar vereador ou partido"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:max-w-72"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Ordenar por
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-900">
              {ORDENS.map((o) => (
                <option key={o.chave} value={o.chave}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex rounded-lg bg-slate-100 p-0.5 text-sm" role="tablist" aria-label="Forma de exibir">
            {(["cards", "tabela"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modo === m}
                onClick={() => trocarModo(m)}
                className={`rounded-md px-3 py-1.5 capitalize transition ${modo === m ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {["", ...partidos].map((p) => (
            <button
              key={p || "todos"}
              onClick={() => setPartido(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${partido === p ? "bg-blue-800 text-white ring-blue-800" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              {p || "Todos os partidos"}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} className="accent-blue-700" />
            Incluir quem já saiu da Câmara
          </label>
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-500" aria-live="polite">
        {plural(lista.length, "vereador", "vereadores")}
        {partido && ` do ${partido}`}
      </p>

      {modo === "cards" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {lista.map((v, i) => (
            <Card key={v.id} v={v} posicao={i + 1} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2 text-right">#</th>
                <th className="px-3 py-2">Vereador</th>
                <th className="px-3 py-2 text-right">Nota</th>
                <th className="px-3 py-2 text-right">Presença</th>
                <th className="px-3 py-2 text-right" title="Política pública + simbólicos">
                  Projetos
                </th>
                <th className="px-3 py-2 text-right">Leis</th>
                <th className="px-3 py-2 text-right">Comissões</th>
                <th className="px-3 py-2 text-right">Adiados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((v, i) => (
                <tr key={v.id} className="transition hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/vereadores/${v.id}`} className="flex items-center gap-3">
                      <Avatar nome={v.nome} foto={v.foto} tamanho={44} />
                      <span>
                        <span className="block font-medium text-slate-900 hover:text-blue-800">{v.nome}</span>
                        <span className="text-xs text-slate-500">
                          {v.partido ?? "sem partido informado"}
                          {!v.emExercicio && " · fora da Câmara"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <NotaBadge valor={v.nota} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{pct(v.indicadores.presencaAjustada)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                    {v.indicadores.projetosSubstantivos} + {v.indicadores.projetosSimbolicos}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{v.indicadores.leisSancionadas}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{v.mesa ? "Mesa" : v.indicadores.comissoes}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{v.indicadores.adiadasPorAusencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!lista.length && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Nenhum vereador encontrado.</p>}
    </div>
  );
}
