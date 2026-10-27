"use client";

import { useMemo, useState } from "react";

export type ItemLista = {
  key: string;
  titulo: string; // "Projeto de Lei nº 12/2025"
  curto: string; // "PL 12/2025", usado quando vários itens iguais viram uma linha só
  texto: string;
  temas: string[];
  selo?: { texto: string; tom: "verde" | "cinza" | "vermelho" };
  sessao?: { rotulo: string; url: string } | null;
};

const TOM = {
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cinza: "bg-slate-100 text-slate-600 ring-slate-200",
  vermelho: "bg-rose-50 text-rose-800 ring-rose-200",
};
const OUTROS = "Outros";
// Ementas iguais (só mudam acento, artigo ou pontuação) viram um grupo: "41 projetos iguais".
const chaveTexto = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\bdispoes\b/g, "dispoe")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(a|o|as|os)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function ListaTematica({
  itens,
  vazio,
  nomes = ["item", "itens"],
  inicial = 6,
  agrupar = false,
}: {
  itens: ItemLista[];
  vazio: string;
  nomes?: [string, string];
  inicial?: number;
  agrupar?: boolean;
}) {
  const [tema, setTema] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState(inicial);

  const contagem = useMemo(() => {
    const c = new Map<string, number>();
    for (const i of itens) for (const t of i.temas.length ? i.temas : [OUTROS]) c.set(t, (c.get(t) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => (a[0] === OUTROS ? 1 : b[0] === OUTROS ? -1 : b[1] - a[1]));
  }, [itens]);

  const grupos = useMemo(() => {
    const q = semAcento(busca.trim());
    const filtrados = itens.filter(
      (i) => (!tema || (tema === OUTROS ? !i.temas.length : i.temas.includes(tema))) && (!q || semAcento(`${i.titulo} ${i.texto}`).includes(q)),
    );
    if (!agrupar) return filtrados.map((i) => [i]);
    const m = new Map<string, ItemLista[]>();
    for (const i of filtrados) {
      const k = chaveTexto(i.texto);
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    return [...m.values()].sort((a, b) => b.length - a.length);
  }, [itens, tema, busca, agrupar]);

  if (!itens.length) return <p className="text-sm text-slate-500">{vazio}</p>;
  const totalFiltrado = grupos.reduce((a, g) => a + g.length, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-100 p-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tema">
          {[["Todos", itens.length] as [string, number], ...contagem].map(([t, n]) => {
            const ativo = t === "Todos" ? tema === null : tema === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setTema(t === "Todos" ? null : t);
                  setMostrar(inicial);
                }}
                aria-pressed={ativo}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${ativo ? "bg-blue-800 text-white ring-blue-800" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
              >
                {t} <span className={`tabular-nums ${ativo ? "text-blue-100" : "text-slate-400"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        {itens.length > 10 && (
          <input
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setMostrar(inicial);
            }}
            placeholder={`Buscar nos ${nomes[1]}`}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
          />
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {grupos.slice(0, mostrar).map((g) => {
          const i = g[0];
          return (
            <li key={i.key} className="p-4 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {g.length > 1 ? (
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-900 ring-1 ring-inset ring-blue-200">
                    {g.length} {nomes[1]} iguais
                  </span>
                ) : (
                  <span className="font-medium text-slate-900">{i.titulo}</span>
                )}
                {i.selo && <span className={`rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TOM[i.selo.tom]}`}>{i.selo.texto}</span>}
                {i.temas.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTema(t)}
                    className="rounded-full px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-slate-600">{i.texto}</p>
              {g.length > 1 ? (
                <p className="mt-1 text-xs text-slate-500">
                  {g.slice(0, 8).map((x) => x.curto).join(", ")}
                  {g.length > 8 && ` e mais ${g.length - 8}`}
                  {i.sessao && (
                    <>
                      {" "}· o mais recente na{" "}
                      <a href={i.sessao.url} className="text-blue-800 underline">
                        {i.sessao.rotulo}
                      </a>
                    </>
                  )}
                </p>
              ) : (
                i.sessao && (
                  <a href={i.sessao.url} className="mt-1 inline-block text-xs text-blue-800 underline">
                    {i.sessao.rotulo}
                  </a>
                )
              )}
            </li>
          );
        })}
        {!grupos.length && <li className="p-4 text-sm text-slate-500">Nada encontrado com esse filtro.</li>}
      </ul>

      {grupos.length > inicial && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>
            Mostrando {Math.min(mostrar, grupos.length)} de {grupos.length} {agrupar ? "linhas" : nomes[1]}
            {agrupar && totalFiltrado !== grupos.length && ` (${totalFiltrado} ${nomes[1]})`}
          </span>
          <div className="flex gap-2">
            {mostrar < grupos.length && (
              <button onClick={() => setMostrar((m) => m + 10)} className="rounded-lg bg-slate-100 px-3 py-1 font-medium text-slate-700 transition hover:bg-slate-200">
                Mostrar mais {Math.min(10, grupos.length - mostrar)}
              </button>
            )}
            {mostrar > inicial && (
              <button onClick={() => setMostrar(inicial)} className="rounded-lg px-3 py-1 font-medium text-slate-500 transition hover:bg-slate-50">
                Mostrar menos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
