"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { nota, nota10 } from "@/lib/formato";
import { Avatar, SeloPartido } from "./ui";

export type VereadorLista = {
  id: string;
  nome: string;
  partido: string | null;
  partidoLogo: string | null;
  foto: string | null;
  emExercicio: boolean;
  sessoes: number;
  coeficientes: { participacao: number | null; producao: number | null; eficiencia: number | null };
  // Avaliações individuais (0 a 1) que a pessoa pode combinar no critério próprio.
  parametros: Record<Parametro, number | null>;
};

type Parametro = "presenca" | "votacoes" | "legislacao" | "comissoes" | "pauta" | "eficiencia";
type Criterio = "producao" | "participacao" | "eficiencia" | "proprio";

const CRITERIOS: { chave: Criterio; nome: string }[] = [
  { chave: "producao", nome: "Produção" },
  { chave: "participacao", nome: "Participação" },
  { chave: "eficiencia", nome: "Eficiência" },
  { chave: "proprio", nome: "Meu critério" },
];
const PARAMETROS: { chave: Parametro; nome: string; dica: string }[] = [
  { chave: "presenca", nome: "Presença", dica: "Presença nas sessões, sem contar faltas justificadas" },
  { chave: "votacoes", nome: "Votações", dica: "Participação nas votações nominais" },
  { chave: "legislacao", nome: "Projetos e leis", dica: "Projetos de política pública e leis sancionadas por sessão" },
  { chave: "comissoes", nome: "Comissões", dica: "Comissões da Câmara e cargos na Mesa Diretora" },
  { chave: "pauta", nome: "Pauta", dica: "Não deixar os próprios itens serem adiados por falta" },
  { chave: "eficiencia", nome: "Eficiência", dica: "Produção por sessão em que esteve presente" },
];
const PESOS_INICIAIS: Record<Parametro, number> = { presenca: 1, votacoes: 1, legislacao: 1, comissoes: 1, pauta: 1, eficiencia: 1 };
const CHAVE_PESOS = "avalia-osasco:pesos";
const CURTO = { participacao: "Part.", producao: "Prod.", eficiencia: "Efic." } as const;
const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function MiniBarra({ valor }: { valor: number | null }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
      <span className="block h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${(valor ?? 0) * 100}%` }} />
    </span>
  );
}

export function ListaVereadores({
  vereadores,
  selecionado,
  aoSelecionar,
  minimoSessoes,
}: {
  vereadores: VereadorLista[];
  selecionado: string;
  aoSelecionar: (id: string) => void;
  minimoSessoes: number;
}) {
  const [criterio, setCriterio] = useState<Criterio>("producao");
  const [pesos, setPesos] = useState<Record<Parametro, number>>(PESOS_INICIAIS);
  const [busca, setBusca] = useState("");
  const [todos, setTodos] = useState(false);

  // Os pesos do "meu critério" ficam guardados neste navegador.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_PESOS);
      if (salvo) setPesos({ ...PESOS_INICIAIS, ...JSON.parse(salvo) });
    } catch {}
  }, []);
  const mudarPeso = (k: Parametro, v: number) =>
    setPesos((p) => {
      const n = { ...p, [k]: v };
      try {
        localStorage.setItem(CHAVE_PESOS, JSON.stringify(n));
      } catch {}
      return n;
    });

  const valor = (v: VereadorLista) => {
    if (criterio !== "proprio") return v.coeficientes[criterio];
    let soma = 0,
      peso = 0;
    for (const p of PARAMETROS) {
      const x = v.parametros[p.chave];
      if (x == null || !pesos[p.chave]) continue;
      soma += x * pesos[p.chave];
      peso += pesos[p.chave];
    }
    return peso ? soma / peso : null;
  };

  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    return vereadores
      .filter((v) => todos || v.emExercicio)
      .filter((v) => !q || semAcento(`${v.nome} ${v.partido ?? ""}`).includes(q))
      .map((v) => ({ v, x: valor(v) }))
      .sort((a, b) => (b.x ?? -1) - (a.x ?? -1) || a.v.nome.localeCompare(b.v.nome));
  }, [vereadores, criterio, pesos, busca, todos]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside id="vereadores" className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white xl:max-h-[calc(100vh-7rem)]">
      <div className="space-y-2 border-b border-slate-100 p-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Vereadores</h2>
          <span className="text-[11px] text-slate-500">clique para ver no mapa</span>
        </div>
        <div className="grid grid-cols-4 gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Ordenar por">
          {CRITERIOS.map((c) => (
            <button
              key={c.chave}
              onClick={() => setCriterio(c.chave)}
              aria-pressed={criterio === c.chave}
              className={`rounded-md px-1 py-1 text-[11px] font-medium transition ${criterio === c.chave ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {c.nome}
            </button>
          ))}
        </div>
        {criterio === "proprio" && (
          <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5">
            <p className="text-[11px] text-slate-500">Quanto pesa cada parâmetro para você (0 = não conta):</p>
            {PARAMETROS.map((p) => (
              <label key={p.chave} className="grid grid-cols-[6.5rem_minmax(0,1fr)_1rem] items-center gap-2 text-xs text-slate-700" title={p.dica}>
                {p.nome}
                <input type="range" min={0} max={3} step={1} value={pesos[p.chave]} onChange={(e) => mudarPeso(p.chave, Number(e.target.value))} className="accent-blue-700" />
                <span className="text-right tabular-nums text-slate-900">{pesos[p.chave]}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar vereador ou partido"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
            <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} className="accent-blue-700" />
            quem saiu
          </label>
        </div>
      </div>

      <ol className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {lista.map(({ v, x }, k) => {
          const ativo = selecionado === v.id;
          return (
            <li key={v.id} className={ativo ? "bg-blue-50" : ""}>
              <button onClick={() => aoSelecionar(ativo ? "" : v.id)} aria-pressed={ativo} className="grid w-full grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50">
                <span className="text-right text-xs tabular-nums text-slate-400">{x == null ? "—" : k + 1}</span>
                <Avatar nome={v.nome} foto={v.foto} tamanho={40} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className={`truncate text-sm font-medium ${ativo ? "text-blue-900" : "text-slate-900"}`}>{v.nome}</span>
                  </span>
                  <span className="mt-1 grid grid-cols-3 gap-1.5">
                    {(["participacao", "producao", "eficiencia"] as const).map((c) => (
                      <span key={c} title={`${CRITERIOS.find((x) => x.chave === c)!.nome}: ${nota(nota10(v.coeficientes[c]))}`}>
                        <MiniBarra valor={v.coeficientes[c]} />
                        <span className="mt-0.5 flex justify-between text-[10px] text-slate-400">
                          <span>{CURTO[c]}</span>
                          <span className="tabular-nums">{nota(nota10(v.coeficientes[c]))}</span>
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{x == null ? "—" : nota(nota10(x))}</span>
                </span>
              </button>
              {ativo && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 pl-[4.75rem] text-xs">
                  <span className="flex items-center gap-1.5">
                    <SeloPartido sigla={v.partido} logo={v.partidoLogo} />
                    {!v.emExercicio && <span className="text-slate-500">fora da Câmara</span>}
                  </span>
                  <Link href={`/vereadores/${v.id}`} className="font-medium text-blue-800 underline">
                    Ver perfil completo →
                  </Link>
                </div>
              )}
            </li>
          );
        })}
        {!lista.length && <li className="p-4 text-sm text-slate-500">Nenhum vereador encontrado.</li>}
      </ol>
      <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
        Sem nota geral. Quem tem menos de {minimoSessoes} sessões aparece sem coeficientes. <Link href="/metodologia" className="underline">Como cada um é calculado</Link>
      </p>
    </aside>
  );
}
