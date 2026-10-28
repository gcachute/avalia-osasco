"use client";

import Link from "next/link";
import { useState } from "react";
import type { BairroMapa, Historico, ItemMapa, Mapa } from "@/lib/dados";
import { num } from "@/lib/formato";
import { EvolucaoBairro } from "./EvolucaoBairro";
import { INDICADORES, formatar } from "./indicadores";

type Aba = "perfil" | "evolucao" | "politica" | "eleicao" | "servicos" | "seguranca";
const ABAS: { chave: Aba; nome: string }[] = [
  { chave: "perfil", nome: "Perfil" },
  { chave: "evolucao", nome: "Histórico" },
  { chave: "politica", nome: "Documentos" },
  { chave: "eleicao", nome: "Eleição" },
  { chave: "servicos", nome: "Serviços" },
  { chave: "seguranca", nome: "Segurança" },
];
const CRIMES = [
  ["roubos", "Roubos"],
  ["furtos", "Furtos"],
  ["violencia", "Agressões"],
  ["sexual", "Estupros"],
  ["transito", "Acidentes de trânsito"],
  ["drogas", "Drogas"],
  ["mortes", "Mortes violentas"],
] as const;
// Indicadores do Censo mostrados como barras contra a média da cidade.
const BARRAS = ["esgoto", "pavimentacao", "iluminacao", "calcada", "bueiro", "arvores", "rampa", "onibus", "alfabetizados", "negros", "criancas", "idosos"];

const corOrigem = (o: ItemMapa["origem"]) => (o === "camara" ? "var(--mapa-camara)" : "var(--mapa-prefeitura)");
const dataCurta = (iso: string) => iso.split("-").reverse().join("/");
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase());

export function PainelBairro({
  bairro,
  itens,
  cidade,
  vereadores,
  abaInicial,
  aoEscolherIndicador,
  aoFechar,
  mesTexto,
  anoSeguranca,
  historico,
}: {
  bairro: BairroMapa;
  itens: ItemMapa[];
  cidade: Mapa["cidade"];
  vereadores: Set<string>;
  abaInicial: Aba;
  aoEscolherIndicador: (chave: string, periodo?: string) => void;
  aoFechar: () => void;
  mesTexto: string | null;
  anoSeguranca: number | null;
  historico?: Historico | null;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const c = bairro.censo;
  const pessoas = c?.pessoas ?? bairro.populacao ?? 0;
  const publicas = (bairro.escolas ?? []).filter((e) => e.rede !== "Privada");
  const privadas = (bairro.escolas?.length ?? 0) - publicas.length;

  return (
    <div className="animate-[mapa-painel_0.35s_ease]">
      <button onClick={aoFechar} className="text-xs text-slate-500 hover:text-slate-800">
        ← Todos os bairros
      </button>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{bairro.nome}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { t: "Moradores", v: pessoas ? pessoas.toLocaleString("pt-BR") : "—" },
          { t: "Renda média", v: c && !c.poucosMoradores ? formatar(c.rendaMedia, "reais") : "—" },
          { t: "Documentos", v: String(itens.length) },
        ].map((x) => (
          <div key={x.t} className="rounded-lg bg-slate-50 p-2">
            <div className="text-base font-semibold tabular-nums text-slate-900">{x.v}</div>
            <div className="text-[11px] text-slate-500">{x.t}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-0.5 rounded-lg bg-slate-100 p-0.5" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => setAba(a.chave)}
            className={`rounded-md px-1.5 py-1 text-[11px] font-medium transition ${aba === a.chave ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {a.nome}
          </button>
        ))}
      </div>

      <div key={aba} className="mt-3 animate-[mapa-painel_0.3s_ease]">
        {aba === "perfil" &&
          (c && !c.poucosMoradores ? (
            <div className="space-y-2.5">
              {bairro.favelas && bairro.favelas.moradores > 0 && (
                <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
                  <b>{formatar(bairro.favelas.pct, "pct")}</b> dos moradores ({bairro.favelas.moradores.toLocaleString("pt-BR")}) vivem em favelas e comunidades
                  urbanas: {bairro.favelas.comunidades.map((x) => x.nome).join(", ")}.
                </div>
              )}
              <p className="text-xs text-slate-500">
                Censo 2022 · {c.domicilios.toLocaleString("pt-BR")} domicílios · {formatar(c.densidade, "densidade")}. A marca escura é a média de Osasco.
              </p>
              {BARRAS.map((k) => {
                const ind = INDICADORES.find((i) => i.chave === k)!;
                const v = c[k as keyof typeof c] as number | null;
                const media = cidade ? ind.cidade?.(cidade) : null;
                return (
                  <button key={k} onClick={() => aoEscolherIndicador(k)} className="block w-full text-left" title={`${ind.dica}. Clique para colorir o mapa.`}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">{ind.nome}</span>
                      <span className="tabular-nums text-slate-900">
                        {formatar(v, "pct")}
                        {media != null && <span className="text-slate-400"> · cidade {formatar(media, "pct")}</span>}
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${v ?? 0}%` }} />
                      {media != null && <div className="absolute -top-0.5 h-3 w-0.5 rounded bg-slate-900" style={{ left: `${media}%` }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Área com poucos moradores ({pessoas.toLocaleString("pt-BR")} no Censo 2022). As porcentagens do Censo não são mostradas para não virarem ruído.
            </p>
          ))}

        {aba === "evolucao" && (
          <EvolucaoBairro
            id={bairro.id}
            nome={bairro.nome}
            historico={historico}
            poucosMoradores={!!c?.poucosMoradores}
            aoEscolherIndicador={aoEscolherIndicador}
          />
        )}

        {aba === "politica" &&
          (itens.length ? (
            <ol className="space-y-3">
              {itens.map((i) => (
                <li key={i.id} className="border-l-2 pl-3" style={{ borderColor: corOrigem(i.origem) }}>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{i.tipo}</span>
                    <span>{dataCurta(i.data)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700">{i.texto}</p>
                  {i.via && <p className="mt-0.5 text-[11px] text-slate-500">Ligado ao bairro por: {i.via.map(titulo).join(", ")}</p>}
                  <div className="mt-0.5 text-xs">
                    {vereadores.has(i.autor) ? (
                      <Link href={`/vereadores/${i.autor}`} className="text-blue-800 underline">
                        {i.autorNome}
                      </Link>
                    ) : i.autor === "prefeito" ? (
                      <Link href="/prefeito" className="text-blue-800 underline">
                        {i.autorNome}
                      </Link>
                    ) : (
                      <span className="text-slate-500">{i.autorNome}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Nenhum documento oficial citou {bairro.nome}
              {mesTexto ? ` até ${mesTexto}` : " nesta legislatura"} com os filtros escolhidos.
            </p>
          ))}

        {aba === "eleicao" &&
          (bairro.eleicao?.prefeito ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-slate-900">Prefeito, 1º turno de 2024</div>
                <div className="mt-2 space-y-1.5">
                  {bairro.eleicao.prefeito.map((p, k) => (
                    <div key={p.nome}>
                      <div className="flex justify-between text-xs">
                        <span className="truncate text-slate-700">{titulo(p.nome)}</span>
                        <span className="tabular-nums text-slate-900">{formatar(p.pct, "pct")}</span>
                      </div>
                      <div className="mt-0.5 h-2 rounded-full bg-slate-100">
                        <div className={`h-full rounded-full transition-all duration-700 ${k === 0 ? "bg-blue-700" : "bg-slate-400"}`} style={{ width: `${p.pct ?? 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-900">Vereadores mais votados aqui</div>
                <ol className="mt-2 space-y-1.5 text-xs">
                  {bairro.eleicao.vereadores?.map((v, k) => (
                    <li key={v.nome} className="flex items-center gap-2">
                      <span className="w-4 text-right tabular-nums text-slate-400">{k + 1}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {vereadores.has(v.id) ? (
                          <Link href={`/vereadores/${v.id}`} className="text-blue-800 underline">
                            {titulo(v.nome)}
                          </Link>
                        ) : (
                          <span className="text-slate-700">{titulo(v.nome)}</span>
                        )}
                      </span>
                      <span className="tabular-nums text-slate-900">{v.votos.toLocaleString("pt-BR")}</span>
                      <span className="w-12 text-right tabular-nums text-slate-500">{formatar(v.pct, "pct")}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  { t: "Comparecimento", v: bairro.eleicao.comparecimento, m: cidade?.comparecimento },
                  { t: "Brancos e nulos", v: bairro.eleicao.brancosNulos, m: cidade?.brancosNulos },
                ].map((x) => (
                  <div key={x.t} className="rounded-lg bg-slate-50 p-2">
                    <div className="text-base font-semibold tabular-nums text-slate-900">{formatar(x.v, "pct")}</div>
                    <div className="text-[11px] text-slate-500">
                      {x.t}
                      {x.m != null && ` · cidade ${formatar(x.m, "pct")}`}
                    </div>
                  </div>
                ))}
              </div>
              {bairro.eleicao.partidos && (
                <div>
                  <div className="text-xs font-medium text-slate-900">Partidos mais votados para vereador</div>
                  <div className="mt-2 space-y-1.5">
                    {bairro.eleicao.partidos.map((p) => (
                      <div key={p.numero} className="grid grid-cols-[5.5rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs">
                        <span className="truncate text-slate-700">{p.sigla}</span>
                        <span className="h-2 rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${Math.min(100, p.pct * 2)}%` }} />
                        </span>
                        <span className="text-right tabular-nums text-slate-900">{formatar(p.pct, "pct")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                {bairro.eleicao.eleitores.toLocaleString("pt-BR")} eleitores em {bairro.eleicao.locais} {bairro.eleicao.locais === 1 ? "local" : "locais"} de votação. O
                eleitor vota no local da sua seção, que nem sempre fica no bairro onde mora.
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Não há local de votação neste bairro: os moradores votam em escolas de bairros vizinhos.
            </p>
          ))}

        {aba === "servicos" && (
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-slate-900">Unidades de saúde SUS ({bairro.saude?.length ?? 0})</span>
                {pessoas > 0 && (
                  <span className="text-[11px] text-slate-500">{num(((bairro.saude?.length ?? 0) / pessoas) * 1e4, 1)} por 10 mil moradores</span>
                )}
              </div>
              <ul className="mt-1.5 space-y-1 text-xs">
                {bairro.saude?.map((u) => (
                  <li key={u.cnes} className="flex items-start gap-2">
                    <span className="mt-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{u.tipo}</span>
                    <span className="min-w-0 flex-1 text-slate-700">{titulo(u.nome)}</span>
                  </li>
                ))}
                {!bairro.saude?.length && <li className="text-slate-500">Nenhuma unidade SUS cadastrada no CNES com endereço neste bairro.</li>}
              </ul>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-slate-900">Escolas públicas ({publicas.length})</span>
                {privadas > 0 && <span className="text-[11px] text-slate-500">+ {privadas} particulares</span>}
              </div>
              <ul className="mt-1.5 space-y-1 text-xs">
                {publicas
                  .slice()
                  .sort((a, z) => (z.idebIniciais ?? z.idebFinais ?? -1) - (a.idebIniciais ?? a.idebFinais ?? -1))
                  .map((e) => (
                    <li key={e.codigo} className="flex items-start gap-2">
                      <span className="mt-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{e.rede}</span>
                      <span className="min-w-0 flex-1 text-slate-700">{titulo(e.nome)}</span>
                      {(e.idebIniciais ?? e.idebFinais) != null && (
                        <span className="shrink-0 tabular-nums text-slate-900" title={e.idebIniciais != null ? "IDEB anos iniciais" : "IDEB anos finais"}>
                          IDEB {num(e.idebIniciais ?? e.idebFinais, 1)}
                        </span>
                      )}
                    </li>
                  ))}
                {!publicas.length && <li className="text-slate-500">Nenhuma escola pública com endereço neste bairro no Censo Escolar.</li>}
              </ul>
            </div>
            {!!bairro.obras?.length && (
              <div>
                <span className="text-xs font-medium text-slate-900">Obras públicas acompanhadas pelo TCE-SP ({bairro.obras.length})</span>
                <ul className="mt-1.5 space-y-2 text-xs">
                  {bairro.obras.map((o) => (
                    <li key={o.objeto} className="rounded-lg bg-slate-50 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${/paralis/i.test(o.situacao) ? "bg-rose-50 text-rose-800 ring-rose-200" : /atrasad/i.test(o.situacao) ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}
                        >
                          {o.situacao}
                        </span>
                        <span className="tabular-nums text-slate-500">R$ {(o.valor / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi</span>
                      </div>
                      <p className="mt-1 line-clamp-3 text-slate-700">{o.objeto.charAt(0) + o.objeto.slice(1).toLowerCase()}</p>
                      <div className="mt-0.5 text-[11px] text-slate-500">{titulo(o.contratante)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {aba === "seguranca" &&
          (bairro.seguranca ? (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-500">
                Ocorrências registradas pela polícia em {anoSeguranca} com local do fato no bairro (SSP-SP). A marca escura é a taxa de Osasco.
              </p>
              {CRIMES.map(([g, nome]) => {
                const x = bairro.seguranca![g];
                const media = (cidade?.[`crime_${g}`] as number | null | undefined) ?? null;
                const escala = Math.max(x.por10mil ?? 0, media ?? 0) * 1.25 || 1;
                return (
                  <button key={g} onClick={() => aoEscolherIndicador(`crime_${g}`)} className="block w-full text-left" title="Clique para colorir o mapa">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">{nome}</span>
                      <span className="tabular-nums text-slate-900">
                        {x.n.toLocaleString("pt-BR")}
                        {x.por10mil != null && <span className="text-slate-400"> · {num(x.por10mil, 1)} por 10 mil</span>}
                      </span>
                    </div>
                    {x.por10mil != null && (
                      <div className="relative mt-1 h-2 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${(x.por10mil / escala) * 100}%` }} />
                        {media != null && <div className="absolute -top-0.5 h-3 w-0.5 rounded bg-slate-900" style={{ left: `${(media / escala) * 100}%` }} />}
                      </div>
                    )}
                  </button>
                );
              })}
              <p className="text-[11px] text-slate-500">
                A taxa usa os moradores do bairro. Onde há muito comércio e circulação, e poucos moradores, ela fica alta mesmo sem o bairro ser mais
                perigoso para quem mora lá.
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Sem dados de ocorrências para este bairro.</p>
          ))}
      </div>
    </div>
  );
}
