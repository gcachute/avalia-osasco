import Link from "next/link";
import { CustoMandato, DespesasCamara, FolhaCamara } from "@/components/Camara";
import type { VereadorLista } from "@/components/ListaVereadores";
import { PainelInicial } from "@/components/PainelInicial";
import { GraficoPartidos, type MediaPartido } from "@/components/Partidos";
import { AvisoParcial, Avatar, NotaBadge, Secao, SeloPartido } from "@/components/ui";
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

  // Média por partido em cada coeficiente (vereadores em exercício com coeficientes).
  const porPartido = (k: Coeficiente): MediaPartido[] =>
    Object.values(
      ativos
        .filter((v) => v.coeficientes[k] != null)
        .reduce<Record<string, MediaPartido>>((acc, v) => {
          const p = v.partido ?? "Sem partido";
          acc[p] ??= { partido: p, logo: v.partidoLogo, media: 0, vereadores: [] };
          acc[p].vereadores.push({ nome: v.nome, nota: v.coeficientes[k]! * 10 });
          return acc;
        }, {}),
    )
      .map((p) => ({ ...p, media: p.vereadores.reduce((a, v) => a + v.nota, 0) / p.vereadores.length }))
      .sort((a, b) => b.media - a.media);

  const documentos = mapa?.itens.length ?? 0;
  const bairrosCitados = mapa?.bairros.filter((b) => b.citacoes > 0).length ?? 0;

  return (
    <>
      {/* Painel em largura total, como um mapa de apuração: lista à esquerda, mapa ao centro, detalhes à direita. */}
      <div className="relative left-1/2 w-[min(1680px,calc(100vw-2rem))] -translate-x-1/2 space-y-4">
        <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Osasco, bairro a bairro</h1>
            <p className="text-xs text-slate-500">
              O que cada vereador e a Prefeitura fazem em cada bairro · legislatura 2025–2028 · dados até {dataBR(periodo.fim)}
            </p>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {[
              { t: "Sessões", v: sessoes.length },
              { t: "Vereadores em exercício", v: ativos.length },
              { t: "Documentos com bairro", v: documentos },
              { t: "Bairros citados", v: `${bairrosCitados} de ${mapa?.bairros.length ?? 0}` },
            ].map((c) => (
              <div key={c.t}>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">{c.t}</dt>
                <dd className="text-lg font-semibold tabular-nums text-slate-900">{typeof c.v === "number" ? c.v.toLocaleString("pt-BR") : c.v}</dd>
              </div>
            ))}
          </dl>
          <Link href="/prefeito" className="group ml-auto flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
            <Avatar nome={prefeito.nome} foto={prefeito.foto} tamanho={44} />
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide text-slate-500">Prefeito</span>
              <span className="flex items-center gap-2 font-semibold text-slate-900 group-hover:text-blue-800">
                {prefeito.nome} <SeloPartido sigla={prefeito.partido} logo={prefeito.partidoLogo} />
              </span>
            </span>
          </Link>
        </section>

        <AvisoParcial />

        {mapa && mapaPronto ? (
          <PainelInicial
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
          <p className="text-slate-600">Rode npm run coletar:bairros e npm run dados para gerar o mapa.</p>
        )}
      </div>

      <Secao titulo="Como funciona">
        <ol className="grid gap-3 md:grid-cols-3">
          {PASSOS.map((p) => (
            <li key={p.n} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-800 text-sm font-bold text-white">{p.n}</span>
              <div className="mt-3 font-semibold text-slate-900">{p.titulo}</div>
              <p className="mt-1 text-sm text-slate-600">{p.texto}</p>
            </li>
          ))}
        </ol>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {COEFICIENTES.map((c) => (
            <div key={c.chave} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="font-semibold text-slate-900">{c.nome}</div>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Média por partido">
          <GraficoPartidos conjuntos={COEFICIENTES.map((c) => ({ chave: c.chave, nome: c.nome, dados: porPartido(c.chave) }))} />
        </Secao>

        <Secao titulo="Prefeitura">
          <Link href="/prefeito" className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-md">
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
      </div>

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
    </>
  );
}
