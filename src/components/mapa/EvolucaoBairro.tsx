"use client";

import type { CampoCenso, Historico } from "@/lib/dados";
import { GraficoLinha } from "../GraficoLinha";
import { formatar } from "./indicadores";

// Medidas do Censo comparáveis entre 2010 e 2022, em porcentagem. A chave do indicador (quando existe) colore o mapa.
const LINHAS: { campo: CampoCenso; nome: string; indicador?: string }[] = [
  { campo: "esgoto", nome: "Esgoto na rede", indicador: "esgoto" },
  { campo: "agua", nome: "Água da rede geral" },
  { campo: "lixo", nome: "Lixo coletado" },
  { campo: "pavimentacao", nome: "Rua asfaltada", indicador: "pavimentacao" },
  { campo: "calcada", nome: "Calçada", indicador: "calcada" },
  { campo: "iluminacao", nome: "Iluminação pública", indicador: "iluminacao" },
  { campo: "bueiro", nome: "Bueiro", indicador: "bueiro" },
  { campo: "rampa", nome: "Rampa para cadeirante", indicador: "rampa" },
  { campo: "arvores", nome: "Árvores na rua", indicador: "arvores" },
  { campo: "alfabetizados", nome: "Alfabetização (15+)", indicador: "alfabetizados" },
  { campo: "negros", nome: "Pretos e pardos", indicador: "negros" },
  { campo: "criancas", nome: "Crianças até 14 anos", indicador: "criancas" },
  { campo: "idosos", nome: "Idosos 60+", indicador: "idosos" },
];

const variacao = (a: number | null | undefined, b: number | null | undefined) => (a && b != null ? (b / a - 1) * 100 : null);

export function EvolucaoBairro({
  id,
  nome,
  historico,
  poucosMoradores,
  aoEscolherIndicador,
}: {
  id: string;
  nome: string;
  historico: Historico | null | undefined;
  poucosMoradores: boolean;
  aoEscolherIndicador: (chave: string, periodo: string) => void;
}) {
  const censo = historico?.censo;
  const [a0, a1] = censo ? [String(censo.anos[0]), String(censo.anos.at(-1))] : ["", ""];
  const antes = censo?.bairros[id]?.[a0] ?? null;
  const depois = censo?.bairros[id]?.[a1] ?? null;
  const cid0 = censo?.cidade[a0];
  const cid1 = censo?.cidade[a1];
  const ele = historico?.eleicoes;
  const anosEle = ele?.anos.map(String) ?? [];
  const serieEle = anosEle.map((a) => ({ ano: a, b: ele?.bairros[id]?.[a] ?? null, c: ele?.cidade[a] ?? null }));
  const temEleicao = serieEle.some((x) => x.b);

  return (
    <div className="space-y-5">
      {censo && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Censo {a0} → {a1}
          </h3>
          {antes && depois ? (
            <>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { t: "Moradores", a: antes.pessoas, b: depois.pessoas, f: "inteiro" as const, ind: "populacao" },
                  { t: "Renda média", a: antes.rendaMedia, b: depois.rendaMedia, f: "reais" as const, ind: "renda" },
                ].map((x) => (
                  <button
                    key={x.t}
                    onClick={() => aoEscolherIndicador(x.ind, "mudanca")}
                    className="rounded-lg bg-slate-50 p-2 text-left transition hover:bg-slate-100"
                    title="Clique para ver a mudança no mapa"
                  >
                    <div className="text-[11px] text-slate-500">{x.t}</div>
                    <div className="text-xs tabular-nums text-slate-600">
                      {formatar(x.a, x.f)} → <b className="text-sm text-slate-900">{formatar(x.b, x.f)}</b>
                    </div>
                    <div className="text-[11px] font-semibold tabular-nums text-slate-700">{formatar(variacao(x.a, x.b), "varPct")}</div>
                  </button>
                ))}
              </div>
              {!poucosMoradores && (
                <ul className="mt-3 space-y-2">
                  {LINHAS.map((l) => {
                    const v0 = antes[l.campo];
                    const v1 = depois[l.campo];
                    if (v0 == null && v1 == null) return null;
                    const mud = v0 != null && v1 != null ? v1 - v0 : null;
                    const cm = cid0?.[l.campo] != null && cid1?.[l.campo] != null ? cid1[l.campo]! - cid0[l.campo]! : null;
                    const conteudo = (
                      <>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="text-slate-700">{l.nome}</span>
                          <span className="shrink-0 tabular-nums text-slate-500">
                            {formatar(v0, "pct")} → <b className="text-slate-900">{formatar(v1, "pct")}</b>{" "}
                            <span className="font-semibold text-slate-700">{formatar(mud, "pp")}</span>
                          </span>
                        </div>
                        {/* Halteres: círculo vazio em 2010, cheio em 2022, numa régua de 0 a 100% */}
                        <svg className="mt-1 block h-3 w-full" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
                          <line x1="0" x2="100" y1="6" y2="6" stroke="var(--grafico-grade)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                          {v0 != null && v1 != null && (
                            <line x1={v0} x2={v1} y1="6" y2="6" stroke="var(--grafico-1)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                          )}
                        </svg>
                        <div className="relative -mt-3 h-3">
                          {v0 != null && (
                            <span className="absolute top-0.5 h-2 w-2 -translate-x-1/2 rounded-full border-2 bg-white" style={{ left: `${v0}%`, borderColor: "var(--grafico-1)" }} />
                          )}
                          {v1 != null && <span className="absolute top-0.5 h-2 w-2 -translate-x-1/2 rounded-full" style={{ left: `${v1}%`, background: "var(--grafico-1)" }} />}
                        </div>
                        {cm != null && <div className="text-right text-[10px] text-slate-400">Osasco: {formatar(cm, "pp")}</div>}
                      </>
                    );
                    return (
                      <li key={l.campo}>
                        {l.indicador ? (
                          <button onClick={() => aoEscolherIndicador(l.indicador!, "mudanca")} className="block w-full text-left" title="Clique para ver a mudança no mapa">
                            {conteudo}
                          </button>
                        ) : (
                          conteudo
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 text-[10px] leading-snug text-slate-400">
                Círculo vazio: {a0}; cheio: {a1}. Renda de {a0} corrigida pela inflação (IPCA) para reais de {a1}. Os limites de alguns bairros e a forma de
                levantar o entorno das casas (asfalto, calçada, árvores…) mudaram entre os dois Censos.
              </p>
            </>
          ) : (
            <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              O Censo {a0} não tem {nome} com este nome ou não publicou os dados (setores com poucos domicílios ficam em sigilo).
            </p>
          )}
        </section>
      )}

      {ele && temEleicao && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eleições {anosEle.join(" · ")}</h3>
          <div className="mt-2">
            <GraficoLinha
              rotulo={`Comparecimento, brancos e nulos e voto no prefeito eleito em ${nome}, ${anosEle.join(", ")}`}
              formato="pct"
              zeroNaBase
              altura={150}
              series={[
                { nome: "Comparecimento", cor: "var(--grafico-1)", pontos: serieEle.map((x) => ({ x: Number(x.ano), y: x.b?.comparecimento ?? null })) },
                { nome: "Voto no eleito (1º turno)", cor: "var(--grafico-3)", pontos: serieEle.map((x) => ({ x: Number(x.ano), y: x.b?.eleito ?? null })) },
                { nome: "Brancos e nulos", cor: "var(--grafico-2)", pontos: serieEle.map((x) => ({ x: Number(x.ano), y: x.b?.brancosNulos ?? null })) },
              ]}
            />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1 pr-2 font-medium">Ano</th>
                  <th className="py-1 pr-2 font-medium">Mais votado no bairro</th>
                  <th className="py-1 font-medium">Partido (vereador)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serieEle.map((x) => (
                  <tr key={x.ano} className="align-top">
                    <td className="py-1.5 pr-2 font-semibold tabular-nums text-slate-900">{x.ano}</td>
                    <td className="py-1.5 pr-2 text-slate-700">
                      {x.b?.prefeito[0] ? (
                        <>
                          {x.b.prefeito[0].nome} <span className="tabular-nums text-slate-500">{formatar(x.b.prefeito[0].pct, "pct")}</span>
                        </>
                      ) : (
                        "—"
                      )}
                      {x.c && <div className="text-[10px] text-slate-400">Eleito: {x.c.eleito.nome} ({x.c.eleito.partido})</div>}
                    </td>
                    <td className="py-1.5 text-slate-700">
                      {x.b?.partidos.length ? x.b.partidos.map((p) => `${p.sigla} ${formatar(p.pct, "pct")}`).join(" · ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[10px] leading-snug text-slate-400">Votos dos locais de votação do bairro; o eleitor nem sempre vota onde mora.</p>
        </section>
      )}
    </div>
  );
}
