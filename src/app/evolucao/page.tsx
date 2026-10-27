import type { Metadata } from "next";
import { GraficoLinha } from "@/components/GraficoLinha";
import { AvisoParcial, Secao } from "@/components/ui";
import { formatar } from "@/components/mapa/indicadores";
import { dados, type CampoCenso } from "@/lib/dados";

export const metadata: Metadata = {
  title: "Evolução",
  description: "Como Osasco mudou: população, Censos de 2010 e 2022, eleições desde 2016, contas da Prefeitura e despesas da Câmara.",
};

const LINHAS_CENSO: { campo: CampoCenso; nome: string }[] = [
  { campo: "esgoto", nome: "Esgoto na rede" },
  { campo: "agua", nome: "Água da rede geral" },
  { campo: "lixo", nome: "Lixo coletado" },
  { campo: "pavimentacao", nome: "Rua asfaltada" },
  { campo: "calcada", nome: "Calçada" },
  { campo: "iluminacao", nome: "Iluminação pública" },
  { campo: "bueiro", nome: "Bueiro" },
  { campo: "rampa", nome: "Rampa para cadeirante" },
  { campo: "arvores", nome: "Árvores na rua" },
  { campo: "alfabetizados", nome: "Alfabetização (15 anos ou mais)" },
  { campo: "negros", nome: "Pretos e pardos" },
  { campo: "criancas", nome: "Crianças até 14 anos" },
  { campo: "idosos", nome: "Idosos 60+" },
];

const pct = (v: number) => formatar(v, "pct");
const milhoes = (v: number) => `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: v >= 1e8 ? 0 : 1 })} mi`;

function Cartao({ titulo, children, fonte }: { titulo: string; children: React.ReactNode; fonte?: { nome: string; url: string }[] }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
      <div className="mt-2">{children}</div>
      {fonte && (
        <p className="mt-2 text-[11px] text-slate-500">
          Fonte:{" "}
          {fonte.map((f, i) => (
            <span key={f.url + i}>
              {i > 0 && "; "}
              <a href={f.url} className="underline hover:text-slate-800">
                {f.nome}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export default function Evolucao() {
  const h = dados.historico;
  const pf = dados.prefeito;
  const censo = h?.censo;
  const ele = h?.eleicoes;
  const [a0, a1] = censo ? [String(censo.anos[0]), String(censo.anos.at(-1))] : ["", ""];

  // Gestões a partir das eleições: quem foi eleito em cada ano governa nos quatro anos seguintes.
  const gestoes = (ele?.anos ?? []).map((a) => ({ inicio: a + 1, fim: a + 4, ...ele!.cidade[String(a)].eleito }));

  const fiscalAnos = (pf.fiscal?.anos ?? []).filter((a) => a.completo);
  const osasco = (a: (typeof fiscalAnos)[number]) => a.cidades.find((c) => c.foco)!.indicadores;
  const res = pf.resultados?.cidades.find((c) => c.foco);
  const despesas = Object.entries(dados.camara.despesas?.anos ?? {})
    .map(([ano, d]) => ({ ano: Number(ano), ...d }))
    .sort((a, b) => a.ano - b.ano);
  const despesasCompletas = despesas.filter((d) => d.meses === 12);
  const despesaParcial = despesas.find((d) => d.meses < 12);
  const folha = dados.camara.folha;
  const mesesFolha = Object.entries(folha?.meses ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const mesNum = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;

  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Osasco no tempo</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Os mesmos dados oficiais do site em anos anteriores, para comparar com o passado: Censos de {a0 || "2010"} e {a1 || "2022"}, eleições desde
        2016, contas da Prefeitura desde 2017 e despesas da Câmara. Cada bairro também tem a sua evolução no mapa (aba Evolução).
      </p>
      <AvisoParcial className="mt-4" />

      {gestoes.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
          {gestoes.map((g) => (
            <span key={g.inicio} className="rounded-full bg-slate-100 px-2.5 py-1">
              {g.inicio}–{g.fim}: <b className="text-slate-900">{g.nome}</b> ({g.partido})
            </span>
          ))}
        </p>
      )}

      {h?.populacao && (
        <Secao titulo="População">
          <Cartao titulo="Moradores de Osasco" fonte={[{ nome: h.populacao.fonte, url: h.populacao.url }]}>
            <GraficoLinha
              rotulo="População de Osasco nos Censos desde 1970 e nas estimativas anuais do IBGE"
              formato="milPessoas"
              altura={210}
              series={[
                { nome: "Censos", cor: "var(--grafico-1)", pontos: h.populacao.censos.map((c) => ({ x: c.ano, y: c.pessoas })) },
                {
                  nome: "Estimativas do IBGE",
                  cor: "var(--grafico-ref)",
                  tracejada: true,
                  pontos: h.populacao.estimativas.map((c) => ({ x: c.ano, y: c.pessoas })),
                },
              ]}
            />
          </Cartao>
        </Secao>
      )}

      {censo && (
        <Secao titulo={`Censo ${a0} → ${a1}`} subtitulo="Média de Osasco, ponderada por moradores ou domicílios, como no mapa.">
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="grid content-start gap-3">
              {[
                { t: "Moradores", a: censo.cidade[a0].pessoas, b: censo.cidade[a1].pessoas, f: "inteiro" as const },
                { t: "Domicílios", a: censo.cidade[a0].domicilios, b: censo.cidade[a1].domicilios, f: "inteiro" as const },
                {
                  t: `Renda média do responsável (reais de ${a1})`,
                  a: censo.cidade[a0].rendaMedia,
                  b: censo.cidade[a1].rendaMedia,
                  f: "reais" as const,
                },
              ].map((x) => (
                <div key={x.t} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">{x.t}</div>
                  <div className="mt-1 text-sm tabular-nums text-slate-600">
                    {formatar(x.a, x.f)} → <b className="text-xl text-slate-900">{formatar(x.b, x.f)}</b>
                  </div>
                  <div className="text-xs font-semibold tabular-nums text-slate-700">
                    {formatar(x.a && x.b != null ? (x.b / x.a - 1) * 100 : null, "varPct")}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-slate-500">{censo.notaRenda}</p>
            </div>
            <Cartao titulo="Domicílios e moradores, em porcentagem" fonte={censo.fontes}>
              <ul className="space-y-2.5">
                {LINHAS_CENSO.map((l) => {
                  const v0 = censo.cidade[a0][l.campo];
                  const v1 = censo.cidade[a1][l.campo];
                  return (
                    <li key={l.campo}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-slate-700">{l.nome}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {formatar(v0, "pct")} → <b className="text-slate-900">{formatar(v1, "pct")}</b>{" "}
                          <span className="text-xs font-semibold text-slate-700">{formatar(v0 != null && v1 != null ? v1 - v0 : null, "pp")}</span>
                        </span>
                      </div>
                      <div className="relative mt-1 h-2 rounded-full bg-slate-100">
                        {v0 != null && v1 != null && (
                          <div
                            className="absolute h-full rounded-full"
                            style={{ left: `${Math.min(v0, v1)}%`, width: `${Math.abs(v1 - v0)}%`, background: "var(--grafico-1)" }}
                          />
                        )}
                        {v0 != null && (
                          <span
                            className="absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-white"
                            style={{ left: `${v0}%`, borderColor: "var(--grafico-1)" }}
                          />
                        )}
                        {v1 != null && (
                          <span
                            className="absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full"
                            style={{ left: `${v1}%`, background: "var(--grafico-1)" }}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-slate-500">
                Círculo vazio: {a0}; cheio: {a1}. p.p. = pontos percentuais. O IBGE mudou a forma de levantar o entorno das casas (asfalto, calçada,
                iluminação, bueiro, rampa e árvores) entre os dois Censos: compare esses itens com cautela.
              </p>
            </Cartao>
          </div>
        </Secao>
      )}

      {ele && (
        <Secao titulo={`Eleições municipais ${ele.anos.join(", ")}`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Cartao titulo="Participação" fonte={[ele.fonte]}>
              <GraficoLinha
                rotulo="Comparecimento e votos brancos e nulos para prefeito em Osasco, 1º turno"
                formato="pct"
                zeroNaBase
                series={[
                  {
                    nome: "Comparecimento",
                    cor: "var(--grafico-1)",
                    pontos: ele.anos.map((a) => ({ x: a, y: ele.cidade[String(a)].comparecimento })),
                  },
                  {
                    nome: "Brancos e nulos",
                    cor: "var(--grafico-2)",
                    pontos: ele.anos.map((a) => ({ x: a, y: ele.cidade[String(a)].brancosNulos })),
                  },
                ]}
              />
            </Cartao>
            <Cartao titulo="Prefeito: resultado em cada eleição">
              <ul className="space-y-3">
                {ele.anos
                  .slice()
                  .reverse()
                  .map((a) => {
                    const c = ele.cidade[String(a)];
                    return (
                      <li key={a}>
                        <div className="text-xs font-semibold text-slate-900">
                          {a} · {c.aptos.toLocaleString("pt-BR")} eleitores
                        </div>
                        {c.turnos.map((t) => (
                          <div key={t.turno} className="mt-1">
                            {c.turnos.length > 1 && <div className="text-[11px] text-slate-500">{t.turno}º turno</div>}
                            {t.candidatos.slice(0, 3).map((x) => (
                              <div key={x.nome} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2 text-xs">
                                <span className="truncate text-slate-700">
                                  {x.nome} <span className="text-slate-400">({x.partido})</span>
                                </span>
                                <span className="text-right tabular-nums text-slate-900">{pct(x.pct)}</span>
                                <span className="col-span-2 block h-1.5 rounded-full bg-slate-100">
                                  <span className="block h-full rounded-full" style={{ width: `${x.pct}%`, background: "var(--grafico-1)" }} />
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </li>
                    );
                  })}
              </ul>
            </Cartao>
            <Cartao titulo="Partidos mais votados para vereador">
              <div className="grid gap-3 sm:grid-cols-3">
                {ele.anos.map((a) => (
                  <div key={a}>
                    <div className="text-xs font-semibold text-slate-900">{a}</div>
                    <ol className="mt-1 space-y-0.5 text-xs">
                      {ele.cidade[String(a)].partidos.slice(0, 6).map((p) => (
                        <li key={p.sigla} className="flex justify-between gap-2">
                          <span className="text-slate-700">{p.sigla}</span>
                          <span className="tabular-nums text-slate-900">{pct(p.pct)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Votos de legenda e nos candidatos de cada partido, entre os votos válidos para vereador.
              </p>
            </Cartao>
          </div>
        </Secao>
      )}

      {(fiscalAnos.length > 1 || res) && (
        <Secao
          titulo="Prefeitura"
          subtitulo="Anos fechados, como entregues ao Tesouro Nacional (SICONFI); saúde e mortalidade pelo DataSUS; IDEB pelo INEP."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {fiscalAnos.length > 1 && (
              <Cartao titulo="Gasto com pessoal e investimento">
                <GraficoLinha
                  rotulo="Gasto com pessoal em % da receita corrente líquida e investimento em % da despesa, Osasco"
                  formato="pct"
                  zeroNaBase
                  series={[
                    { nome: "Pessoal (% da RCL)", cor: "var(--grafico-1)", pontos: fiscalAnos.map((a) => ({ x: a.ano, y: osasco(a).pessoal })) },
                    {
                      nome: "Investimento (% da despesa)",
                      cor: "var(--grafico-2)",
                      pontos: fiscalAnos.map((a) => ({ x: a.ano, y: osasco(a).investimento })),
                    },
                  ]}
                />
              </Cartao>
            )}
            {fiscalAnos.length > 1 && (
              <Cartao titulo="Saúde e educação (% das receitas de impostos)">
                {fiscalAnos.filter((a) => osasco(a).saude != null || osasco(a).educacao != null).length > 1 ? (
                  <GraficoLinha
                    rotulo="Aplicação em saúde e em educação, Osasco"
                    formato="pct"
                    zeroNaBase
                    series={[
                      { nome: "Saúde (mínimo 15%)", cor: "var(--grafico-3)", pontos: fiscalAnos.map((a) => ({ x: a.ano, y: osasco(a).saude })) },
                      {
                        nome: "Educação (mínimo 25%)",
                        cor: "var(--grafico-1)",
                        pontos: fiscalAnos.map((a) => ({ x: a.ano, y: osasco(a).educacao })),
                      },
                    ]}
                  />
                ) : (
                  <ul className="space-y-1 text-sm">
                    {fiscalAnos
                      .filter((a) => osasco(a).saude != null || osasco(a).educacao != null)
                      .map((a) => (
                        <li key={a.ano} className="flex justify-between gap-2">
                          <span className="text-slate-700">{a.ano}</span>
                          <span className="tabular-nums text-slate-900">
                            saúde {formatar(osasco(a).saude, "pct")} · educação {formatar(osasco(a).educacao, "pct")}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  Nos anos sem valor, Osasco não informou saúde e educação no demonstrativo enviado ao SICONFI (esses dados vão ao SIOPS e ao SIOPE,
                  ainda não integrados ao site).
                </p>
              </Cartao>
            )}
            {res?.ideb.serie && (
              <Cartao
                titulo="IDEB dos anos iniciais (rede municipal)"
                fonte={pf.resultados?.ideb ? [{ nome: "INEP", url: pf.resultados.ideb.fonte }] : undefined}
              >
                <GraficoLinha
                  rotulo="IDEB dos anos iniciais da rede municipal de Osasco"
                  formato="decimal"
                  series={[
                    {
                      nome: "IDEB",
                      cor: "var(--grafico-1)",
                      pontos: Object.entries(res.ideb.serie).map(([a, v]) => ({ x: Number(a), y: v })),
                    },
                  ]}
                />
              </Cartao>
            )}
            {res && Object.keys(res.mortalidade.serie).length > 1 && (
              <Cartao
                titulo="Mortalidade infantil (por mil nascidos vivos)"
                fonte={pf.resultados?.mortalidade ? [{ nome: "DataSUS (SIM e SINASC)", url: pf.resultados.mortalidade.fonte }] : undefined}
              >
                <GraficoLinha
                  rotulo="Óbitos de menores de 1 ano por mil nascidos vivos em Osasco"
                  formato="decimal"
                  zeroNaBase
                  series={[
                    {
                      nome: "Mortalidade infantil",
                      cor: "var(--grafico-2)",
                      pontos: Object.entries(res.mortalidade.serie).map(([a, v]) => ({ x: Number(a), y: v })),
                    },
                  ]}
                />
                {pf.resultados?.mortalidade?.preliminar && <p className="text-[11px] text-slate-500">O último ano ainda é preliminar.</p>}
              </Cartao>
            )}
          </div>
        </Secao>
      )}

      {(despesasCompletas.length > 1 || mesesFolha.length > 1) && (
        <Secao titulo="Câmara Municipal">
          {mesesFolha.length > 1 && folha && (
            <div className="mb-4">
              <Cartao
                titulo="Folha de pagamento por mês (bruto)"
                fonte={[{ nome: "Portal do Cidadão da Câmara, Folha de pagamento sintético", url: folha.url }]}
              >
                <GraficoLinha
                  rotulo="Folha de pagamento bruta da Câmara por mês: total, cargos de gabinete e vereadores"
                  formato="milhoesReais"
                  zeroNaBase
                  eixoX="mes"
                  series={[
                    {
                      nome: "Câmara inteira",
                      cor: "var(--grafico-1)",
                      pontos: mesesFolha.map(([m, x]) => ({ x: mesNum(m), y: x.todos?.bruto ?? null })),
                    },
                    {
                      nome: "Cargos de gabinete",
                      cor: "var(--grafico-2)",
                      pontos: mesesFolha.map(([m, x]) => ({ x: mesNum(m), y: x.gabinetes.bruto })),
                    },
                    { nome: "Vereadores", cor: "var(--grafico-3)", pontos: mesesFolha.map(([m, x]) => ({ x: mesNum(m), y: x.vereadores.bruto })) },
                  ]}
                />
                <p className="text-[11px] text-slate-500">
                  Folha normal de cada mês, servidores ativos, valores brutos. Cargos de gabinete: chefe de gabinete, assessor de coordenação e
                  assessores parlamentares I, II e III.
                </p>
              </Cartao>
            </div>
          )}
          {despesasCompletas.length > 1 && (
            <Cartao
              titulo="Despesa paga pela Câmara por ano"
              fonte={dados.camara.despesas ? [{ nome: dados.camara.despesas.fonte, url: dados.camara.despesas.url }] : undefined}
            >
              <GraficoLinha
                rotulo="Despesa paga pela Câmara Municipal de Osasco por ano, em valores da época"
                formato="milhoesReais"
                zeroNaBase
                series={[{ nome: "Despesa paga", cor: "var(--grafico-1)", pontos: despesasCompletas.map((d) => ({ x: d.ano, y: d.pago })) }]}
              />
              <p className="text-[11px] text-slate-500">
                Valores da época, sem correção pela inflação.
                {despesaParcial &&
                  ` ${despesaParcial.ano}: ${milhoes(despesaParcial.pago)} em ${despesaParcial.meses} meses (ano em andamento, fora do gráfico).`}
              </p>
            </Cartao>
          )}
        </Secao>
      )}
    </article>
  );
}
