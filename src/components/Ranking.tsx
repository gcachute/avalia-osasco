"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PilarVereador, Vereador as VereadorCompleto } from "@/lib/dados";
import { nota, nota10, pct, plural } from "@/lib/formato";
import { NotaBadge, Retrato } from "./ui";

export type ItemRanking = Pick<VereadorCompleto, "id" | "nome" | "partido" | "foto" | "emExercicio" | "nota" | "posicao" | "indicadores"> & {
  mesa: string | null;
  pilares: Record<PilarVereador, number | null>;
  temas: string[];
};

type Coluna = {
  chave: string;
  nome: string;
  dica: string;
  valor: (v: ItemRanking) => number | null;
  mostrar: (v: ItemRanking) => React.ReactNode;
  detalhe?: (v: ItemRanking) => string;
};

const COLUNAS: Coluna[] = [
  {
    chave: "presenca",
    nome: "Presença",
    dica: "Presença nas sessões, sem contar faltas justificadas",
    valor: (v) => v.indicadores.presencaAjustada,
    mostrar: (v) => pct(v.indicadores.presencaAjustada),
    detalhe: (v) => (v.indicadores.faltasJustificadas ? `${v.indicadores.faltasJustificadas} justificadas` : `${v.indicadores.sessoes} sessões`),
  },
  {
    chave: "projetos",
    nome: "Projetos",
    dica: "Projetos de política pública (e simbólicos, como nomes de rua e datas)",
    valor: (v) => v.indicadores.projetosSubstantivos,
    mostrar: (v) => v.indicadores.projetosSubstantivos,
    detalhe: (v) => `+${v.indicadores.projetosSimbolicos} simbólicos`,
  },
  {
    chave: "leis",
    nome: "Leis",
    dica: "Leis de sua autoria sancionadas pelo prefeito",
    valor: (v) => v.indicadores.leisSancionadas,
    mostrar: (v) => v.indicadores.leisSancionadas,
    detalhe: (v) => (v.indicadores.vetosRecebidos ? `${v.indicadores.vetosRecebidos} vetada(s)` : "sancionadas"),
  },
  {
    chave: "comissoes",
    nome: "Comissões",
    dica: "Comissões da Câmara (ou cargo na Mesa Diretora)",
    valor: (v) => v.indicadores.pontosComissoes,
    mostrar: (v) => (v.mesa ? "Mesa" : v.indicadores.comissoes),
    detalhe: (v) => (v.mesa ? v.mesa : `${v.indicadores.frentes} frentes`),
  },
  {
    chave: "adiados",
    nome: "Adiados",
    dica: "Itens próprios adiados porque o autor faltou (menos é melhor)",
    valor: (v) => -v.indicadores.adiadasPorAusencia,
    mostrar: (v) => v.indicadores.adiadasPorAusencia,
    detalhe: () => "por falta",
  },
];

const ORDENS: { chave: string; nome: string; valor: (v: ItemRanking) => number | null }[] = [
  { chave: "nota", nome: "Nota", valor: (v) => v.nota },
  ...COLUNAS.map((c) => ({ chave: c.chave, nome: c.chave === "adiados" ? "Menos adiados" : c.nome, valor: c.valor })),
];

const PILARES: { chave: PilarVereador; nome: string; curto: string }[] = [
  { chave: "A", nome: "Assiduidade", curto: "Presença" },
  { chave: "B", nome: "Legislação que importa", curto: "Leis" },
  { chave: "C", nome: "Fiscalização e comissões", curto: "Comiss." },
  { chave: "E", nome: "Compromisso com a pauta", curto: "Pauta" },
];

const GRADE = "lg:grid-cols-[2rem_4.5rem_minmax(0,1fr)_5.5rem_repeat(5,5.25rem)]";
const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function MiniPilares({ v }: { v: ItemRanking }) {
  return (
    <div className="grid max-w-xs grid-cols-4 gap-2" aria-label="Notas por pilar">
      {PILARES.map((p) => {
        const n = v.pilares[p.chave];
        return (
          <div key={p.chave} title={`${p.nome}: ${n == null ? "sem dados" : nota(nota10(n))}`}>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="barra-anim h-full rounded-full bg-blue-600" style={{ width: `${(n ?? 0) * 100}%` }} />
            </div>
            <div className="mt-0.5 flex justify-between gap-1 text-[10px] text-slate-400">
              <span className="truncate">{p.curto}</span>
              <span className="tabular-nums">{n == null ? "—" : nota(nota10(n))}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Linha({ v, posicao }: { v: ItemRanking; posicao: number }) {
  return (
    <li>
      <Link
        href={`/vereadores/${v.id}`}
        className={`group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-3 py-3 transition hover:bg-slate-50 sm:px-4 ${GRADE}`}
      >
        <span className="hidden text-right text-sm font-semibold tabular-nums text-slate-400 lg:block">{posicao}º</span>
        <div className="relative">
          <Retrato nome={v.nome} foto={v.foto} className="w-[4.5rem] rounded-xl ring-1 ring-slate-200" />
          <span className="absolute -left-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-slate-900 px-1 text-[11px] font-semibold text-white lg:hidden">
            {posicao}
          </span>
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="truncate text-base font-semibold text-slate-900 group-hover:text-blue-800">{v.nome}</div>
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {v.partido && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">{v.partido}</span>}
            {v.mesa && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-800 ring-1 ring-blue-200">{v.mesa} da Mesa</span>}
            {!v.emExercicio && <span className="rounded bg-slate-100 px-1.5 py-0.5">fora da Câmara</span>}
            {v.temas.map((t) => (
              <span key={t} className="hidden rounded-full px-1.5 py-0.5 text-slate-500 ring-1 ring-slate-200 sm:inline">
                {t}
              </span>
            ))}
          </div>
          <MiniPilares v={v} />
        </div>
        <div className="text-right lg:text-center">
          <NotaBadge valor={v.nota} />
          <div className="mt-1 text-[11px] text-slate-400">{v.nota == null ? `${v.indicadores.sessoes} sessões` : "de 10"}</div>
        </div>
        <div className="col-span-3 grid grid-cols-5 gap-1.5 lg:contents">
          {COLUNAS.map((c) => (
            <div key={c.chave} className="rounded-lg bg-slate-50 px-1 py-1.5 text-center lg:bg-transparent lg:py-0">
              <div className="text-base font-semibold tabular-nums text-slate-900">{c.mostrar(v)}</div>
              <div className="truncate text-[11px] text-slate-500 lg:hidden">{c.nome}</div>
              {c.detalhe && <div className="hidden truncate text-[11px] text-slate-400 lg:block">{c.detalhe(v)}</div>}
            </div>
          ))}
        </div>
      </Link>
    </li>
  );
}

export function Ranking({ vereadores }: { vereadores: ItemRanking[] }) {
  const [ordem, setOrdem] = useState("nota");
  const [busca, setBusca] = useState("");
  const [partido, setPartido] = useState("");
  const [todos, setTodos] = useState(false);

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

  const Cabecalho = ({ chave, nome, dica }: { chave: string; nome: string; dica: string }) => (
    <button onClick={() => setOrdem(chave)} title={dica} className={`uppercase tracking-wide transition hover:text-slate-900 ${ordem === chave ? "text-blue-800" : ""}`}>
      {nome}
      {ordem === chave && " ↓"}
    </button>
  );

  return (
    <div>
      <div className="mb-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar vereador ou partido"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:max-w-72"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 lg:hidden">
            Ordenar por
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-900">
              {ORDENS.map((o) => (
                <option key={o.chave} value={o.chave}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} className="accent-blue-700" />
            Incluir quem já saiu da Câmara
          </label>
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
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className={`hidden items-center gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 lg:grid ${GRADE}`}>
          <span className="text-right">#</span>
          <span />
          <span className="uppercase tracking-wide">Vereador · pilares da nota</span>
          <span className="text-center">
            <Cabecalho chave="nota" nome="Nota" dica="Nota de 0 a 10" />
          </span>
          {COLUNAS.map((c) => (
            <span key={c.chave} className="text-center">
              <Cabecalho chave={c.chave} nome={c.nome} dica={c.dica} />
            </span>
          ))}
        </div>
        <ol className="divide-y divide-slate-100">
          {lista.map((v, i) => (
            <Linha key={v.id} v={v} posicao={i + 1} />
          ))}
        </ol>
        {!lista.length && <p className="p-6 text-center text-sm text-slate-500">Nenhum vereador encontrado.</p>}
      </div>
      <p className="mt-2 text-xs text-slate-500" aria-live="polite">
        {plural(lista.length, "vereador", "vereadores")}
        {partido && ` do ${partido}`}. Clique no nome de uma coluna para ordenar.
      </p>
    </div>
  );
}
