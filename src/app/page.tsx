import Link from "next/link";
import { Numero } from "@/components/Animacoes";
import { CustoMandato, DespesasCamara } from "@/components/Camara";
import { GraficoPartidos, type MediaPartido } from "@/components/Partidos";
import { Ranking } from "@/components/Ranking";
import { Avatar, NotaBadge, Retrato, Secao, SeloPartido } from "@/components/ui";
import type { Vereador } from "@/lib/dados";
import { PILARES_PREFEITO, dados, dataBR, nota, nota10, pct } from "@/lib/dados";

const PASSOS = [
  { n: "1", titulo: "Juntamos dados oficiais", texto: "Planilhas de presença e votação da Câmara, relatórios fiscais do Tesouro, Tribunal de Contas, INEP e DataSUS." },
  { n: "2", titulo: "Calculamos uma nota de 0 a 10", texto: "Cinco pilares para cada político, com regras públicas e iguais para todos. Nada de opinião." },
  { n: "3", titulo: "Você confere a fonte", texto: "Cada número leva ao documento oficial de onde saiu. Achou um erro? Dá para pedir correção." },
];

const ESCALA = [
  { faixa: "7 a 10", nome: "Bom", classe: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  { faixa: "5 a 6,9", nome: "Regular", classe: "bg-amber-50 text-amber-800 ring-amber-200" },
  { faixa: "0 a 4,9", nome: "Fraco", classe: "bg-rose-50 text-rose-800 ring-rose-200" },
];

function Destaque({ rotulo, v, valor }: { rotulo: string; v: Vereador; valor: string }) {
  return (
    <Link
      href={`/vereadores/${v.id}`}
      className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <Retrato nome={v.nome} foto={v.foto} className="w-16 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-blue-800">{rotulo}</div>
        <div className="truncate font-semibold text-slate-900 group-hover:text-blue-800">{v.nome}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {valor} <SeloPartido sigla={v.partido} logo={v.partidoLogo} />
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { vereadores, prefeito, sessoes, periodo, camara } = dados;
  const ativos = vereadores.filter((v) => v.emExercicio);
  const comNota = vereadores.filter((v) => v.nota != null);
  const presencaMedia = ativos.reduce((a, v) => a + (v.indicadores.presencaAjustada ?? 0), 0) / (ativos.length || 1);
  const projetos = vereadores.reduce((a, v) => a + v.indicadores.projetosSubstantivos, 0);
  const adiadas = vereadores.reduce((a, v) => a + v.indicadores.adiadasPorAusencia, 0);
  const notaMedia = comNota.reduce((a, v) => a + (v.nota ?? 0), 0) / (comNota.length || 1);

  const maior = (lista: Vereador[], f: (v: Vereador) => number) => [...lista].sort((a, b) => f(b) - f(a))[0];
  const ativosComNota = comNota.filter((v) => v.emExercicio);
  const melhor = maior(ativosComNota, (v) => v.nota ?? 0);
  const presente = maior(ativosComNota, (v) => (v.indicadores.presencaAjustada ?? 0) + v.indicadores.sessoes / 1e4);
  const produtivo = maior(ativosComNota, (v) => v.indicadores.projetosSubstantivos);

  const porPartido: MediaPartido[] = Object.values(
    ativosComNota.reduce<Record<string, MediaPartido>>((acc, v) => {
      const p = v.partido ?? "Sem partido";
      acc[p] ??= { partido: p, logo: v.partidoLogo, media: 0, vereadores: [] };
      acc[p].vereadores.push({ nome: v.nome, nota: v.nota! });
      return acc;
    }, {}),
  )
    .map((p) => ({ ...p, media: p.vereadores.reduce((a, v) => a + v.nota, 0) / p.vereadores.length }))
    .sort((a, b) => b.media - a.media);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-100 opacity-60 blur-3xl" aria-hidden />
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" /> Legislatura 2025–2028 · dados até {dataBR(periodo.fim)}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">Como estão trabalhando os políticos de Osasco?</h1>
          <p className="mt-4 text-lg text-slate-600">
            Seu imposto paga a Câmara e a Prefeitura. Aqui você vê uma nota de 0 a 10 para cada vereador e para o prefeito, calculada só com dados
            oficiais: quem comparece, quem propõe leis que mudam a cidade, quem trabalha nas comissões e como andam as contas públicas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#ranking" className="rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Ver o ranking
            </a>
            <Link href="/prefeito" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 transition hover:bg-slate-50">
              Nota do prefeito
            </Link>
            <Link href="/mapa" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 transition hover:bg-slate-50">
              Mapa por bairro
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { titulo: "Sessões analisadas", valor: <Numero valor={sessoes.length} />, detalhe: `${dataBR(periodo.inicio)} a ${dataBR(periodo.fim)}` },
          { titulo: "Nota média da Câmara", valor: <Numero valor={notaMedia} casas={1} />, detalhe: `${comNota.length} vereadores com nota` },
          { titulo: "Presença média", valor: <Numero valor={presencaMedia * 100} sufixo="%" />, detalhe: "sem contar faltas justificadas" },
          { titulo: "Itens adiados por falta", valor: <Numero valor={adiadas} />, detalhe: `${projetos} projetos de política pública no período` },
        ].map((c) => (
          <div key={c.titulo} className="revelar rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-sm text-slate-500">{c.titulo}</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">{c.valor}</div>
            <div className="mt-1 text-xs text-slate-500">{c.detalhe}</div>
          </div>
        ))}
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
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <span className="mr-1 font-medium text-slate-900">Como ler a nota:</span>
          {ESCALA.map((e) => (
            <span key={e.nome} className={`rounded-lg px-2.5 py-1 font-medium ring-1 ring-inset ${e.classe}`}>
              {e.faixa} · {e.nome}
            </span>
          ))}
          <Link href="/metodologia" className="ml-auto text-blue-800 underline">
            Ver todas as regras
          </Link>
        </div>
      </Secao>

      <Secao titulo="Destaques" subtitulo="Entre os vereadores em exercício com nota.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {melhor && <Destaque rotulo="Maior nota" v={melhor} valor={`nota ${nota(melhor.nota)}`} />}
          {presente && <Destaque rotulo="Mais presente" v={presente} valor={`${pct(presente.indicadores.presencaAjustada)} de presença`} />}
          {produtivo && <Destaque rotulo="Mais projetos de política pública" v={produtivo} valor={`${produtivo.indicadores.projetosSubstantivos} projetos`} />}
        </div>
      </Secao>

      <Secao titulo="Ranking dos vereadores" id="ranking" subtitulo="Clique em um vereador para ver como a nota foi formada e as planilhas de origem.">
        <Ranking
          vereadores={vereadores.map(({ id, nome, partido, partidoLogo, foto, emExercicio, nota, posicao, indicadores, perfil, pilares, temas }) => ({
            id,
            nome,
            partido,
            partidoLogo,
            foto,
            emExercicio,
            nota,
            posicao,
            indicadores,
            mesa: perfil?.mesa ?? null,
            pilares: { A: pilares.A.nota, B: pilares.B.nota, C: pilares.C.nota, D: pilares.D.nota, E: pilares.E.nota },
            temas: temas.slice(0, 2).map((t) => t.tema),
          }))}
        />
        <p className="mt-3 text-xs text-slate-500">
          O custo do mandato é igual para todos os gabinetes e não entra na nota. Só recebe nota quem tem pelo menos{" "}
          {dados.metodologia.vereador.minimoSessoes} sessões no período.
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
          </div>
        </Secao>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Nota média por partido">
          <GraficoPartidos dados={porPartido} />
        </Secao>

        <Secao titulo="Prefeitura">
          <Link
            href="/prefeito"
            className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4 p-5">
              <Avatar nome={prefeito.nome} foto={prefeito.foto} tamanho={72} />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold text-slate-900 group-hover:text-blue-800">{prefeito.nome}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <SeloPartido sigla={prefeito.partido} logo={prefeito.partidoLogo} />
                  {prefeito.cargo} · {prefeito.mandato}
                </div>
              </div>
              <div className="text-center">
                <NotaBadge valor={prefeito.nota} grande />
                <div className="mt-1 text-xs text-slate-500">{prefeito.provisoria ? "provisória" : "do mandato"}</div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 border-t border-slate-100 p-4">
              {PILARES_PREFEITO.map((pl) => {
                const n = prefeito.pilares[pl.chave]?.nota;
                return (
                  <div key={pl.chave} title={`${pl.nome}: ${n == null ? "aguardando dados" : nota(nota10(n))}`}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="barra-anim h-full rounded-full bg-blue-600" style={{ width: `${(n ?? 0) * 100}%` }} />
                    </div>
                    <div className="mt-1 truncate text-[10px] uppercase tracking-wide text-slate-400">{pl.nome.split(" ")[0]}</div>
                  </div>
                );
              })}
            </div>
          </Link>
        </Secao>
      </div>
    </>
  );
}
