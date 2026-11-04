import Link from "next/link";
import { CustoMandato, DespesasCamara, FolhaCamara } from "@/components/Camara";
import type { VereadorLista } from "@/components/ListaVereadores";
import { PainelInicial } from "@/components/PainelInicial";
import { GraficoPartidos, type MediaPartido } from "@/components/Partidos";
import { AvisoParcial, Avatar, ComoLer, NotaBadge, Secao, SeloPartido } from "@/components/ui";
import type { Coeficiente } from "@/lib/dados";
import { COEFICIENTES, PILARES_PREFEITO, dados, dataBR, nota10 } from "@/lib/dados";
import { dadosDoMapaCompleto } from "@/lib/mapaGeo";

const PASSOS = [
  { n: "1", titulo: "Dados oficiais", texto: "Planilhas da Câmara, Tesouro Nacional, Tribunal de Contas, IBGE, TSE, INEP, Ministério da Saúde e Segurança Pública." },
  {
    n: "2",
    titulo: "A conta à mostra",
    texto: "Cada vereador tem participação, produção e eficiência, e cada uma mostra as avaliações e a conta por trás. O prefeito tem uma nota por pilar.",
  },
  { n: "3", titulo: "Você confere a fonte", texto: "Cada número leva ao documento oficial de onde saiu. Achou um erro? Dá para pedir correção." },
];

export default async function Home() {
  const { vereadores, prefeito, sessoes, periodo, camara, mapa } = dados;
  const minimo = dados.metodologia.vereador.minimoSessoes;
  const ativos = vereadores.filter((v) => v.emExercicio);
  const mapaPronto = mapa ? await dadosDoMapaCompleto(mapa) : null;

  const lista: VereadorLista[] = vereadores.map((v) => {
    const avaliado = v.coeficientes.producao != null;
    const n = (x: number | null | undefined) => (avaliado ? (x ?? null) : null);
    return {
      id: v.id,
      nome: v.nome,
      partido: v.partido,
      partidoLogo: v.partidoLogo,
      foto: v.foto,
      emExercicio: v.emExercicio,
      sessoes: v.indicadores.sessoes,
      coeficientes: v.coeficientes,
      parametros: {
        presenca: n(v.pilares.A.componentes.presenca),
        votacoes: n(v.pilares.A.componentes.votacoes),
        legislacao: n(v.pilares.B.nota),
        comissoes: n(v.pilares.C.nota),
        pauta: n(v.pilares.E.nota),
        eficiencia: n(v.coeficientes.eficiencia),
      },
    };
  });

  // Média por partido em cada coeficiente: todos os vereadores da legislatura com coeficientes (inclusive quem já saiu
  // do cargo), cada um pesando pelas sessões em que esteve no cargo. Assim um suplente de poucas semanas não vale o
  // mesmo que um titular do período inteiro, e quem saiu no meio do caminho não some da conta do partido.
  const porPartido = (k: Coeficiente): MediaPartido[] =>
    Object.values(
      vereadores
        .filter((v) => v.coeficientes[k] != null)
        .reduce<Record<string, MediaPartido>>((acc, v) => {
          const p = v.partido ?? "Sem partido";
          acc[p] ??= { partido: p, logo: v.partidoLogo, media: 0, sessoes: 0, vereadores: [] };
          acc[p].vereadores.push({ nome: v.nome, nota: v.coeficientes[k]! * 10, sessoes: v.indicadores.sessoes, saiu: !v.emExercicio });
          return acc;
        }, {}),
    )
      .map((p) => {
        const sessoes = p.vereadores.reduce((a, v) => a + v.sessoes, 0);
        return { ...p, sessoes, media: p.vereadores.reduce((a, v) => a + v.nota * v.sessoes, 0) / sessoes };
      })
      .sort((a, b) => b.media - a.media);

  const documentos = mapa?.itens.length ?? 0;
  // Os quatro documentos mais recentes que citam algum bairro, com o nome de cada bairro.
  const nomeBairro = new Map((mapa?.bairros ?? []).map((b) => [b.id, b.nome]));
  const recentes = [...(mapa?.itens ?? [])]
    .filter((i) => i.bairros.length)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 4)
    .map((i) => ({
      id: i.id,
      tipo: i.tipo,
      data: i.data,
      texto: i.texto,
      autor: i.autorNome,
      bairros: i.bairros.map((id) => ({ id, nome: nomeBairro.get(id) ?? id })),
    }));
  const bairrosCitados = mapa?.bairros.filter((b) => b.citacoes > 0).length ?? 0;

  return (
    <>
      {/* Painel em largura total, como um mapa de apuração: lista à esquerda, mapa ao centro, detalhes à direita. */}
      <div className="relative left-1/2 -ml-[min(840px,calc(50vw-1rem))] w-[min(1680px,calc(100vw-2rem))] space-y-4">

        {mapa && mapaPronto ? (
          <PainelInicial
            aviso={<AvisoParcial />}
            cabecalho={
              <section className="max-w-3xl pt-2 sm:pt-4">
                <h1 className="text-[2.6rem] text-balance text-slate-950 sm:text-[4.2rem]">Seu bairro na política de Osasco</h1>
                <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
                  Veja os documentos da Câmara e da Prefeitura que citam o seu bairro, quem os assinou e o retrato oficial de quem mora lá.
                </p>
                <p className="mt-2 max-w-2xl text-sm text-slate-500 tabular-nums">
                  Até {dataBR(periodo.fim)}, foram {sessoes.length} sessões e {documentos} documentos que citam bairros; {bairrosCitados} dos {mapa?.bairros.length ?? 0} bairros aparecem
                  em algum deles. A Câmara tem {ativos.length} vereadores em exercício.
                </p>
              </section>
            }
            recentes={recentes}
            aoLadoDaLista={
              <>
                <Secao titulo="Média por partido">
                  {/* Integridade fica fora da média por partido: é um registro de cada pessoa, não do partido. */}
                  <GraficoPartidos
                    sessoesPeriodo={sessoes.length}
                    conjuntos={COEFICIENTES.filter((c) => c.chave !== "integridade").map((c) => ({ chave: c.chave, nome: c.nome, dados: porPartido(c.chave) }))}
                  />
                </Secao>

                <Secao titulo="Prefeitura">
                  <Link href="/prefeito" className="group block overflow-hidden transition hover:border-blue-300 border-t border-slate-300">
                    <div className="flex items-center gap-4 p-5">
                      <Avatar nome={prefeito.nome} foto={prefeito.foto} tamanho={72} />
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-semibold text-slate-900 group-hover:text-blue-800">{prefeito.nome}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <SeloPartido sigla={prefeito.partido} logo={prefeito.partidoLogo} />
                          {prefeito.cargo} · {prefeito.mandato}
                        </div>
                      </div>
                    </div>
                    <ul className="divide-y divide-slate-100 border-t border-slate-100">
                      {PILARES_PREFEITO.map((pl) => {
                        const n = prefeito.pilares[pl.chave]?.nota;
                        return (
                          <li key={pl.chave} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                            <span className="text-slate-700">
                              {pl.chave} · {pl.nome}
                            </span>
                            {n == null ? <span className="text-xs text-slate-400">sem dados do mandato</span> : <NotaBadge valor={nota10(n)} />}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500">Cada pilar com os dados e a conta na página do prefeito.</p>
                  </Link>
                </Secao>
              </>
            }
            vereadores={lista}
            minimoSessoes={minimo}
            mapa={{
              bairros: mapaPronto.bairros,
              itens: mapa.itens,
              pontos: mapaPronto.pontos,
              largura: mapaPronto.largura,
              altura: mapaPronto.altura,
              inicio: periodo.inicio,
              fim: periodo.fim,
              cidade: mapa.cidade,
              votosVereador: mapa.votosVereador,
              vereadores: vereadores.map((v) => ({ id: v.id, nome: v.nome })),
              favelas: mapaPronto.favelas,
              projecao: mapaPronto.projecao,
              historico: dados.historico,
              anoSeguranca: mapa.anoSeguranca ?? null,
            }}
          />
        ) : (
          <p className="text-slate-600">O mapa está indisponível no momento.</p>
        )}
      </div>

      <Secao titulo="Como funciona">
        <ol className="grid gap-x-10 gap-y-6 md:grid-cols-3">
          {PASSOS.map((p) => (
            <li key={p.n} className="flex gap-4">
              <span className="font-serif text-4xl leading-none font-semibold text-slate-300">{p.n}</span>
              <div>
                <div className="font-semibold text-slate-950">{p.titulo}</div>
                <p className="mt-1 text-sm text-slate-600">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          {COEFICIENTES.map((c) => (
            <div key={c.chave} className="border-t border-slate-300 pt-3 text-sm">
              <div className="font-semibold text-slate-950">{c.nome}</div>
              <p className="mt-1 text-slate-600">{c.descricao}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          <Link href="/metodologia" className="underline">
            Todas as regras
          </Link>{" "}
          ·{" "}
          <Link href="/mapa#como-ler" className="underline">
            Como ler o mapa e as fontes de cada camada
          </Link>
        </p>
      </Secao>


      {(camara.custoMandato || camara.despesas) && (
        <Secao
          titulo="Quanto custa a Câmara"
          subtitulo={
            camara.requerimentosParados
              ? `${camara.requerimentosParados} requerimentos de informação ao Executivo estão na Ordem do Dia desde o início da legislatura sem votação registrada. A lista está no perfil de cada autor.`
              : undefined
          }
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {camara.custoMandato && <CustoMandato custo={camara.custoMandato} />}
            {camara.despesas && <DespesasCamara despesas={camara.despesas} />}
            {camara.folha && <FolhaCamara folha={camara.folha} />}
          </div>
        </Secao>
      )}

      <ComoLer>
        <li>O painel começa pela busca: o bairro escolhido abre no mapa, com os documentos e o retrato dele, e o vereador escolhido abre o perfil. Os bairros sugeridos são os mais citados nos documentos.</li>
        <li>Abaixo do mapa fica a lista de vereadores; no celular, os botões Mapa e Vereadores trocam entre os dois.</li>
        <li>No mapa, escolha uma camada e toque em um bairro para abrir os dados dele.</li>
        <li>Na lista, cada vereador tem uma nota de 0 a 10 por coeficiente. Dá para ordenar por qualquer coeficiente ou montar um critério próprio, dando peso a cada um.</li>
        <li>A média por partido leva em conta as sessões de cada vereador, inclui quem já saiu do cargo e deixa Integridade de fora.</li>
        <li>
          Os documentos vão de {dataBR(dados.periodo.inicio)} a {dataBR(dados.periodo.fim)}. A conta de cada nota está na{" "}
          <Link href="/metodologia" className="underline">
            metodologia
          </Link>
          .
        </li>
      </ComoLer>
    </>
  );
}
