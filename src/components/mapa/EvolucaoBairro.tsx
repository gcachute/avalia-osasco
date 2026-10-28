"use client";

import type { CampoCenso, Historico } from "@/lib/dados";
import { GraficoLinha } from "../GraficoLinha";
import { Halter, legendaHalter } from "./Halter";
import { formatar } from "./indicadores";

// Medidas do Censo comparáveis entre os anos (2000, 2010 e 2022), em porcentagem. A chave do indicador (quando existe) colore o mapa.
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
  const anos = censo?.anos.map(String) ?? [];
  const [a0, a1] = [anos[0] ?? "", anos.at(-1) ?? ""];
  const serie = anos.map((a) => ({ ano: a, b: censo?.bairros[id]?.[a] ?? null, c: censo?.cidade[a] ?? null }));
  const antes = serie.find((x) => x.b)?.b ?? null;
  const depois = serie.at(-1)?.b ?? null;
  // Mudança da cidade no mesmo intervalo que o bairro tem dados.
  const mudCidade = (campo: CampoCenso) => {
    const com = serie.filter((x) => x.b?.[campo] != null && x.c?.[campo] != null);
    return com.length > 1 ? com.at(-1)!.c![campo]! - com[0].c![campo]! : null;
  };
  const ele = historico?.eleicoes;
  const anosEle = ele?.anos.map(String) ?? [];
  const serieEle = anosEle.map((a) => ({ ano: a, b: ele?.bairros[id]?.[a] ?? null, c: ele?.cidade[a] ?? null }));
  const temEleicao = serieEle.some((x) => x.b);

  return (
    <div className="space-y-5">
      {censo && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Censo {anos.join(" · ")}
          </h3>
          {antes && depois ? (
            <>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { t: "Moradores", campo: "pessoas" as const, f: "inteiro" as const, ind: "populacao" },
                  { t: "Renda média", campo: "rendaMedia" as const, f: "reais" as const, ind: "renda" },
                ].map((x) => (
                  <button
                    key={x.t}
                    onClick={() => aoEscolherIndicador(x.ind, "mudanca")}
                    className="rounded-lg bg-slate-50 p-2 text-left transition hover:bg-slate-100"
                    title="Clique para ver a mudança no mapa"
                  >
                    <div className="text-[11px] text-slate-500">{x.t}</div>
                    <div className="text-xs tabular-nums text-slate-600">
                      {serie
                        .filter((p) => p.b?.[x.campo] != null)
                        .map((p, i, arr) =>
                          i === arr.length - 1 ? (
                            <b key={p.ano} className="text-sm text-slate-900" title={p.ano}>
                              {formatar(p.b![x.campo], x.f)}
                            </b>
                          ) : (
                            <span key={p.ano} title={p.ano}>
                              {formatar(p.b![x.campo], x.f)} →{" "}
                            </span>
                          ),
                        )}
                    </div>
                    <div className="text-[11px] font-semibold tabular-nums text-slate-700">{formatar(variacao(antes[x.campo], depois[x.campo]), "varPct")}</div>
                  </button>
                ))}
              </div>
              {!poucosMoradores && (
                <ul className="mt-3 space-y-2">
                  {LINHAS.map((l) => {
                    const pontos = serie.map((p) => ({ ano: p.ano, v: p.b?.[l.campo] }));
                    if (pontos.every((p) => p.v == null)) return null;
                    const conteudo = <Halter nome={l.nome} pontos={pontos} cidade={mudCidade(l.campo)} />;
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
                {legendaHalter(anos)} Rendas anteriores corrigidas pela inflação (IPCA) para reais de {a1}. Os limites de alguns bairros mudaram entre os
                Censos, e a forma de levantar o entorno das casas (asfalto, calçada, árvores…) mudou de 2010 para 2022. O Censo 2000 não tem cor ou raça
                nem o entorno.
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
