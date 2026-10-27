import type { Metadata } from "next";
import { ListaTematica } from "@/components/ListaTematica";
import { TabelaPares } from "@/components/Fiscal";
import { Faixa, TabelaIegm } from "@/components/Iegm";
import { PilarD, PilarE } from "@/components/PilaresDE";
import { Barra, Cartao, NotaBadge, Retrato, Secao, SeloPartido } from "@/components/ui";
import type { AnoFiscal, CidadeFiscal } from "@/lib/dados";
import { PILARES_PREFEITO, TIPO_NOME, dados, dataBR, nomeSessao, nota, nota10, num, plural, sessao } from "@/lib/dados";
import { INDICADORES, primarioTexto, ranking, rotuloPeriodo } from "@/lib/fiscal";
import { FAIXAS } from "@/lib/iegm";

export const metadata: Metadata = { title: "Prefeito" };

function LinhaComponente({ nome, valor, referencia, posicao, pontos, fonte }: { nome: string; valor: string; referencia: string; posicao?: string | null; pontos: number | null; fonte?: string }) {
  return (
    <div className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="font-medium text-slate-900">{nome}</div>
        <div className="text-sm text-slate-600">
          <span className="font-semibold tabular-nums text-slate-900">{valor}</span> · {referencia}
          {posicao && <> · {posicao} entre as cidades comparadas</>}
          {fonte && (
            <>
              {" "}
              ·{" "}
              <a href={fonte} className="text-blue-800 underline">
                dado bruto
              </a>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:w-48">
        <Barra valor={pontos ?? 0} classe={pontos == null ? "bg-slate-300" : "bg-blue-700"} />
        <span className="w-10 text-right text-sm tabular-nums text-slate-600">{pontos == null ? "—" : nota(nota10(pontos))}</span>
      </div>
    </div>
  );
}

function PilarA({ a, c }: { a: AnoFiscal; c: CidadeFiscal }) {
  const r = dados.prefeito.fiscal!.referencias;
  const i = c.indicadores;
  return (
    <div className="divide-y divide-slate-100">
      <LinhaComponente
        nome="Gasto com pessoal"
        valor={i.pessoal == null ? "—" : `${num(i.pessoal)}% da RCL`}
        referencia={`limite de alerta ${num(r.pessoal.alerta)}%, máximo ${r.pessoal.maximo}%`}
        posicao={ranking(a.cidades, c, "pessoal")}
        pontos={c.pilares.A.componentes.pessoal}
        fonte={c.fontes.rgf01}
      />
      <LinhaComponente
        nome="Investimento"
        valor={i.investimento == null ? "—" : `${num(i.investimento)}% da despesa`}
        referencia="obras, equipamentos e imóveis empenhados"
        posicao={ranking(a.cidades, c, "investimento")}
        pontos={c.pilares.A.componentes.investimento}
        fonte={c.fontes.rreo01}
      />
      <LinhaComponente
        nome="Resultado primário × meta da LDO"
        valor={primarioTexto(i.primario)}
        referencia={
          !a.completo
            ? "a meta é anual: só conta no ano fechado"
            : i.primario && i.primario.diferencaRCL >= 0
              ? "meta cumprida"
              : `${num(Math.abs(i.primario?.diferencaRCL ?? 0))}% da RCL abaixo da meta (zero pontos a partir de ${r.toleranciaPrimario}%)`
        }
        pontos={c.pilares.A.componentes.primario}
        fonte={c.fontes.rreo14}
      />
    </div>
  );
}

function PilarB({ a, c }: { a: AnoFiscal; c: CidadeFiscal }) {
  const r = dados.prefeito.fiscal!.referencias.minimos;
  const i = c.indicadores;
  const linhas = [
    { k: "saude" as const, nome: "Saúde", texto: "das receitas de impostos", min: r.saude },
    { k: "educacao" as const, nome: "Educação (manutenção e desenvolvimento do ensino)", texto: "das receitas de impostos", min: r.educacao },
    { k: "fundeb" as const, nome: "FUNDEB na remuneração dos profissionais da educação", texto: "do FUNDEB", min: r.fundeb },
  ];
  return (
    <div className="divide-y divide-slate-100">
      {linhas.map((l) => (
        <LinhaComponente
          key={l.k}
          nome={l.nome}
          valor={i[l.k] == null ? "—" : `${num(i[l.k])}% ${l.texto}`}
          referencia={i[l.k] != null && i[l.k]! < l.min ? `ABAIXO do mínimo legal de ${l.min}%` : `mínimo legal ${l.min}%`}
          posicao={ranking(a.cidades, c, l.k)}
          pontos={c.pilares.B.componentes[l.k]}
          fonte={c.fontes.rreo14}
        />
      ))}
    </div>
  );
}

export default function PaginaPrefeito() {
  const p = dados.prefeito;
  const i = p.indicadores;
  const f = p.fiscal;
  const ie = p.iegm;
  const pesos = dados.metodologia.prefeito.pesos;
  const pesoTotal = Object.values(pesos).reduce((a, b) => a + b, 0);
  const anoNota = f && [...f.anos].reverse().find((a) => a.completo && a.mandato);
  const focoNota = anoNota?.cidades.find((c) => c.foco);
  const anoParcial = f?.anos.find((a) => !a.completo && a.mandato);
  const focoParcial = anoParcial?.cidades.find((c) => c.foco);

  return (
    <>
      <header className="relative flex flex-wrap items-center gap-5 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100 opacity-50 blur-3xl" aria-hidden />
        <Retrato nome={p.nome} foto={p.foto} className="relative w-32 shrink-0 rounded-2xl shadow-sm ring-1 ring-slate-200 sm:w-40" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{p.nome}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
            <SeloPartido sigla={p.partido} logo={p.partidoLogo} grande />
            {p.cargo} · mandato {p.mandato}
          </p>
          {p.creditoFoto && (
            <p className="mt-2 text-xs text-slate-400">
              Foto:{" "}
              <a href={p.creditoFotoUrl} className="underline">
                {p.creditoFoto}
              </a>
            </p>
          )}
        </div>
        <div className="text-right">
          <NotaBadge valor={p.nota} grande />
          <p className="mt-1 text-sm text-slate-500">{p.nota == null ? "nota final em construção" : p.provisoria ? "nota provisória do mandato" : "nota do mandato"}</p>
        </div>
      </header>

      {p.nota == null && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>A nota final ainda não foi publicada.</b> Ela é formada por cinco pilares. Os pilares com dados do mandato valem{" "}
          {Math.round(p.cobertura * 100)}% do peso. A nota final só aparece quando houver dados para pelo menos{" "}
          {Math.round(dados.metodologia.prefeito.coberturaMinima * 100)}% do peso, para não julgar o prefeito só pelas contas.
        </div>
      )}

      {p.nota != null && p.provisoria && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Nota provisória.</b> Ela é a média ponderada dos pilares que já têm dados do mandato, que somam {Math.round(p.cobertura * 100)}% do peso.
          Ainda falta{PILARES_PREFEITO.filter((x) => p.pilares[x.chave]?.nota == null).length > 1 ? "m" : ""}:{" "}
          {PILARES_PREFEITO.filter((x) => p.pilares[x.chave]?.nota == null)
            .map((x) => `${x.chave} (${x.nome})`)
            .join(", ")}
          . A nota é recalculada sozinha quando os dados saírem.
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {PILARES_PREFEITO.map((pl) => {
          const n = nota10(p.pilares[pl.chave]?.nota);
          return (
            <a key={pl.chave} href={pl.pronto ? `#pilar-${pl.chave}` : undefined} className={`rounded-xl border bg-white p-4 ${pl.pronto ? "border-slate-200 hover:border-blue-300" : "border-dashed border-slate-300"}`}>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Pilar {pl.chave} · {Math.round((pesos[pl.chave] / pesoTotal) * 100)}%
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">{pl.nome}</div>
              <div className="mt-2">
                {!pl.pronto ? (
                  <span className="text-sm text-slate-400">em breve</span>
                ) : n == null ? (
                  <span className="text-sm text-slate-500">aguardando dados do mandato</span>
                ) : (
                  <NotaBadge valor={n} />
                )}
              </div>
              <div className="mt-1 text-xs text-slate-500">{pl.fonte}</div>
            </a>
          );
        })}
      </div>

      {f && anoNota && focoNota && (
        <>
          <Secao titulo={`Pilar A · Gestão fiscal (${anoNota.ano})`} id="pilar-A">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-2">
              <PilarA a={anoNota} c={focoNota} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Nota do pilar: média dos três itens. Osasco ficou em {focoNota.pilares.A.ranking}º entre {anoNota.cidades.filter((c) => c.pilares.A.nota != null).length} cidades neste pilar.
            </p>
          </Secao>

          <Secao titulo={`Pilar B · Mínimos constitucionais (${anoNota.ano})`} id="pilar-B">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-2">
              <PilarB a={anoNota} c={focoNota} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Cumprir o mínimo vale 5 pontos. O restante depende da posição entre as cidades comparadas. Descumprir qualquer mínimo zera o pilar.
              Osasco ficou em {focoNota.pilares.B.ranking}º entre {anoNota.cidades.filter((c) => c.pilares.B.nota != null).length} cidades neste pilar.
            </p>
          </Secao>

          <Secao titulo="Comparação com cidades parecidas">
            <TabelaPares anos={f.anos} />
          </Secao>

          <Secao titulo="Osasco ano a ano">
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Indicador</th>
                    {f.anos.map((a) => (
                      <th key={a.ano} className="px-3 py-2 text-right">
                        {a.ano}
                        <div className="font-normal normal-case">{a.mandato ? rotuloPeriodo(a) : "gestão anterior"}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {INDICADORES.map((ind) => (
                    <tr key={ind.chave}>
                      <td className="px-3 py-2.5 text-slate-900">{ind.nome}</td>
                      {f.anos.map((a) => {
                        const v = a.cidades.find((c) => c.foco)?.indicadores[ind.chave];
                        return (
                          <td key={a.ano} className="px-3 py-2.5 text-right tabular-nums">
                            {v == null ? "—" : `${num(v)}%`}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="px-3 py-2.5 text-slate-900">Resultado primário (meta)</td>
                    {f.anos.map((a) => (
                      <td key={a.ano} className="px-3 py-2.5 text-right tabular-nums">
                        {a.completo ? primarioTexto(a.cidades.find((c) => c.foco)!.indicadores.primario) : "—"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {anoParcial && focoParcial && (
              <p className="mt-2 text-xs text-slate-500">
                {anoParcial.ano} ainda está em andamento (dados até o {anoParcial.rreoPeriodo}º bimestre) e não entra na nota. Os percentuais de saúde e
                educação costumam subir no fim do ano.
              </p>
            )}
          </Secao>

          {f.avisos.length > 0 && (
            <details className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-800">{plural(f.avisos.length, "aviso", "avisos")} sobre a qualidade dos dados</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {f.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {ie && (
        <Secao titulo="Pilar C · Qualidade da gestão (IEG-M)" id="pilar-C">
          <p className="-mt-2 mb-4 text-slate-600">
            O Índice de Efetividade da Gestão Municipal é a avaliação anual do Tribunal de Contas do Estado sobre sete áreas da prefeitura. A nota do
            pilar usa o valor que o próprio TCE-SP dá a cada faixa do índice geral (
            {Object.entries(ie.valorFaixa)
              .map(([k, v]) => `${k} = ${(v * 10).toLocaleString("pt-BR")}`)
              .join(", ")}
            ).
          </p>
          {ie.pilar.nota == null && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <b>Ainda sem nota.</b> O TCE-SP ainda não publicou o IEG-M do primeiro ano do mandato (ano-base {dados.prefeito.mandato.slice(0, 4)}). O
              último publicado é o de ano-base {ie.ultimoAnoBase}, da gestão anterior, mostrado abaixo como referência. O pilar entra na nota
              automaticamente quando o novo índice sair.
            </div>
          )}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium text-slate-900">Osasco no IEG-M geral, ano a ano</div>
            <div className="flex flex-wrap gap-3">
              {ie.anos.map((a) => {
                const o = a.cidades.find((c) => c.foco)!;
                return (
                  <div key={a.anoBase} className="text-center text-xs text-slate-500">
                    <Faixa valor={o.faixas?.iegm} />
                    <div className="mt-1">{a.anoBase}</div>
                    <div>{o.ranking ? `${o.ranking}º de ${a.cidades.filter((c) => c.nota != null).length}` : ""}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Ano-base é o ano avaliado; o índice sai no ano seguinte. Posição entre as {ie.anos.at(-1)!.cidades.length} cidades comparadas, com empates
              dividindo a posição. Faixa atual de Osasco: {FAIXAS[ie.anos.at(-1)!.cidades.find((c) => c.foco)?.faixas?.iegm ?? ""]?.nome.toLowerCase() ?? "—"}.
            </p>
          </div>
          <TabelaIegm anos={ie.anos} />
          <p className="mt-3 text-xs text-slate-500">
            Fonte:{" "}
            <a href={ie.fonte} className="text-blue-800 underline">
              painel do IEG-M do TCE-SP
            </a>
            {ie.anos
              .at(-1)!
              .publicacoes.map((x) => (
                <span key={x.url}>
                  {" · "}
                  <a href={x.url} className="text-blue-800 underline">
                    {x.tipo.toLowerCase()}
                  </a>
                </span>
              ))}
            .
          </p>
        </Secao>
      )}

      {p.resultados && <PilarD r={p.resultados} />}
      {p.transparencia && <PilarE t={p.transparencia} />}

      <Secao titulo="Relação com a Câmara">
        <p className="-mt-2 mb-4 text-sm text-slate-500">Mostrado para contexto. Não entra na nota.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Cartao titulo="Projetos enviados à Câmara" valor={i.projetosEnviados} detalhe="nas sessões analisadas" />
          <Cartao titulo="Vetos a projetos de vereadores" valor={i.vetosTotais + i.vetosParciais} detalhe={`${plural(i.vetosTotais, "total", "totais")} · ${plural(i.vetosParciais, "parcial", "parciais")}`} />
          <Cartao titulo="Leis sancionadas" valor={i.leisSancionadas} detalhe={`${i.leisDoExecutivo} de autoria do próprio Executivo`} />
          <Cartao titulo="Decretos comunicados à Câmara" valor={i.decretosLidos} detalhe="a maioria abre crédito adicional no orçamento" />
        </div>
      </Secao>

      <Secao titulo={`Projetos enviados pelo Executivo (${p.projetos.length})`}>
        <p className="-mt-2 mb-3 text-sm text-slate-500">
          Projetos com o mesmo texto (como os pedidos de crédito adicional ao orçamento) aparecem numa linha só. Filtre por tema ou busque pelo
          assunto.
        </p>
        <ListaTematica
          agrupar
          nomes={["projeto", "projetos"]}
          vazio="Nenhum projeto do Executivo nas sessões analisadas."
          itens={p.projetos.map((x) => {
            const s = sessao(x.sessao);
            return {
              key: x.key,
              titulo: `${TIPO_NOME[x.tipo] ?? x.tipo} nº ${x.numero}/${x.ano}`,
              curto: `${x.tipo} ${x.numero}/${x.ano}`,
              texto: x.ementa,
              temas: x.temas ?? [],
              sessao: s ? { rotulo: `${nomeSessao(s)} (${dataBR(s.data)})`, url: s.url } : null,
            };
          })}
        />
      </Secao>

      <Secao titulo={`Vetos (${p.vetos.length})`}>
        <ListaTematica
          nomes={["veto", "vetos"]}
          vazio="Nenhum veto comunicado nas sessões analisadas."
          itens={p.vetos.map((x) => {
            const autor = dados.vereadores.find((v) => v.id === x.autor);
            const s = sessao(x.sessao);
            return {
              key: x.key,
              titulo: autor ? `${x.projeto}, de ${autor.nome}` : x.projeto,
              curto: x.projeto,
              texto: x.resumo,
              temas: x.temas ?? [],
              selo: { texto: `Veto ${x.tipo}`, tom: "vermelho" as const },
              sessao: s ? { rotulo: `${nomeSessao(s)} (${dataBR(s.data)})`, url: s.url } : null,
            };
          })}
        />
      </Secao>

    </>
  );
}
