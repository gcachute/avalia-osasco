import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtividadeMensal } from "@/components/Atividade";
import { CustoMandato, rotuloMesFolha } from "@/components/Camara";
import { ListaTematica, type ItemLista } from "@/components/ListaTematica";
import { MapaPessoa, type ModoMapa } from "@/components/MapaPessoa";
import { geometriaBairros } from "@/lib/mapaGeo";
import { reais } from "@/lib/formato";
import { AvisoParcial, Avatar, Barra, Cartao, NotaBadge, Retrato, Secao, SeloPartido } from "@/components/ui";
import type { PilarVereador, Vereador } from "@/lib/dados";
import { COEFICIENTES, PILARES_VEREADOR, TIPO_NOME, dados, dataBR, milReais, nomeSessao, nota, nota10, num, pct, plural, sessao } from "@/lib/dados";

export const dynamicParams = false;
export const generateStaticParams = () => dados.vereadores.map((v) => ({ id: v.id }));

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const v = dados.vereadores.find((x) => x.id === id);
  return { title: v ? `${v.nome} — vereador(a) de Osasco` : "Vereador" };
}

const linkSessao = (id: string) => {
  const s = sessao(id);
  return s ? { rotulo: `${nomeSessao(s)} (${dataBR(s.data)})`, url: s.url } : null;
};

// Projetos e honrarias no formato da lista com temas.
const itemProposicao = (p: Vereador["proposicoes"][number]): ItemLista => ({
  key: p.key,
  titulo: `${TIPO_NOME[p.tipo] ?? p.tipo} nº ${p.numero}/${p.ano}`,
  curto: `${p.tipo} ${p.numero}/${p.ano}`,
  texto: p.ementa,
  temas: p.temas ?? [],
  selo: p.classe ? (p.classe === "substantivo" ? { texto: "política pública", tom: "verde" } : { texto: "simbólico", tom: "cinza" }) : undefined,
  sessao: linkSessao(p.sessao),
});

function LinkSessao({ id }: { id: string }) {
  const s = sessao(id);
  if (!s) return null;
  return (
    <a href={s.url} className="text-blue-800 underline" title="Abrir planilha oficial">
      {nomeSessao(s)} ({dataBR(s.data)})
    </a>
  );
}

export default async function PaginaVereador({ params }: Props) {
  const { id } = await params;
  const v = dados.vereadores.find((x) => x.id === id);
  if (!v) notFound();
  const i = v.indicadores;
  const votosDados = i.votos.sim + i.votos.nao + i.votos.abstencao;
  const projetos = v.proposicoes.filter((p) => dados.metodologia.tiposProjeto.includes(p.tipo));
  const honrarias = v.proposicoes.filter((p) => !dados.metodologia.tiposProjeto.includes(p.tipo));
  // Vereadores com sessões suficientes para ter coeficientes (a lista já vem ordenada por produção).
  const avaliados = dados.vereadores.filter((x) => x.coeficientes.producao != null);
  const pf = v.perfil;
  const custo = dados.camara.custoMandato;
  // Subsídio bruto pago ao vereador no último mês da folha publicada (Portal do Cidadão).
  const folha = dados.camara.folha;
  const mesFolha = folha ? Object.keys(folha.meses).sort().at(-1)! : null;
  const pagoNoMes = folha && mesFolha ? (folha.meses[mesFolha].vereadores.porVereador.find((x) => x.id === v.id)?.bruto ?? null) : null;

  // Mapa: onde teve votos em 2024 e onde agiu (documentos que citam um bairro).
  const mapa = dados.mapa;
  const geoB = geometriaBairros();
  const nomeBairro = new Map(mapa?.bairros.map((b) => [b.id, b.nome]) ?? []);
  const votosMapa = mapa?.votosVereador[v.id];
  const itensMapa = mapa?.itens.filter((x) => (x.autores ?? [x.autor]).includes(v.id)) ?? [];
  const docsPorBairro: Record<string, number> = {};
  for (const x of itensMapa) for (const b of x.bairros) docsPorBairro[b] = (docsPorBairro[b] ?? 0) + 1;
  const modosMapa: ModoMapa[] = [
    ...(votosMapa
      ? [
          {
            chave: "votos",
            nome: "Votos em 2024",
            descricao: `${votosMapa.total.toLocaleString("pt-BR")} votos para vereador em 2024, somados pelos locais de votação de cada bairro.`,
            valores: votosMapa.porBairro,
            formato: "inteiro" as const,
            escala: "zero" as const,
            total: votosMapa.total,
            link: `/?indicador=votosVereador&autor=${v.id}`,
          },
        ]
      : []),
    {
      chave: "docs",
      nome: "Onde agiu",
      descricao: "Projetos, moções e pedidos de informação que citam o bairro pelo nome ou por uma escola ou unidade de saúde dele.",
      valores: docsPorBairro,
      formato: "inteiro",
      escala: "zero",
      link: `/?indicador=citacoes&autor=${v.id}`,
    },
  ];
  const parados = v.requerimentosNaPauta.filter((r) => r.aindaNaPauta);

  // Comparação com a média dos vereadores avaliados (menos itens adiados é melhor).
  const pares = avaliados;
  const media = (f: (x: Vereador) => number | null) => {
    const vs = pares.map(f).filter((n): n is number => n != null);
    return vs.reduce((a, b) => a + b, 0) / (vs.length || 1);
  };
  const comparacoes = [
    { nome: "Presença nas sessões", valor: i.presencaAjustada, media: media((x) => x.indicadores.presencaAjustada), formato: pct, maiorMelhor: true },
    { nome: "Participação nas votações nominais", valor: i.participacaoVotos, media: media((x) => x.indicadores.participacaoVotos), formato: pct, maiorMelhor: true },
    { nome: "Projetos de política pública", valor: i.projetosSubstantivos, media: media((x) => x.indicadores.projetosSubstantivos), formato: (n: number | null) => (n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })), maiorMelhor: true },
    { nome: "Leis sancionadas", valor: i.leisSancionadas, media: media((x) => x.indicadores.leisSancionadas), formato: (n: number | null) => (n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })), maiorMelhor: true },
    { nome: "Itens próprios adiados por falta", valor: i.adiadasPorAusencia, media: media((x) => x.indicadores.adiadasPorAusencia), formato: (n: number | null) => (n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })), maiorMelhor: false },
  ];
  const ordem = avaliados;
  const idx = ordem.findIndex((x) => x.id === v.id);
  const anterior = idx > 0 ? ordem[idx - 1] : null;
  const seguinte = idx >= 0 && idx < ordem.length - 1 ? ordem[idx + 1] : null;
  const detalhes: Record<PilarVereador, string> = {
    A: `Presença de ${pct(i.presencaAjustada)} descontadas ${plural(i.faltasJustificadas, "falta justificada", "faltas justificadas")} (esteve em ${i.presencas} de ${i.sessoes} sessões) · votou em ${pct(i.participacaoVotos)} das votações nominais`,
    B: `${plural(i.projetosSubstantivos, "projeto", "projetos")} de política pública, ${plural(i.projetosSimbolicos, "simbólico", "simbólicos")} e ${plural(i.leisSancionadas, "lei sancionada", "leis sancionadas")} em ${i.sessoes} sessões`,
    C: !v.emExercicio
      ? "Sem dado: a composição das comissões publicada é a atual, e este vereador já saiu da Câmara"
      : `${pf?.mesa ? `${pf.mesa} da Mesa Diretora · ` : ""}${plural(i.comissoes, "comissão", "comissões")} · ${plural(i.frentes, "frente parlamentar", "frentes parlamentares")}`,
    D: custo ? `${milReais(custo.totalMensal)} por mês em salários (vereador e ${custo.assessores} assessores), igual para todos os gabinetes` : "Sem dados de custo do gabinete",
    E: `${plural(i.adiadasPorAusencia, "item próprio adiado", "itens próprios adiados")} porque faltou, em ${i.sessoes} sessões`,
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/#vereadores" className="text-slate-500 hover:text-slate-800">
          ← Ranking
        </Link>
      </div>

      <header className="relative mt-4 flex flex-wrap items-start gap-5 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-blue-100 opacity-50 blur-3xl" aria-hidden />
        <figure className="relative w-36 shrink-0 sm:w-44">
          <Retrato nome={v.nome} foto={v.foto} className="rounded-2xl shadow-sm ring-1 ring-slate-200" />
          {v.foto && v.fotoFonte && <figcaption className="mt-1 text-[10px] leading-tight text-slate-400">Foto: {v.fotoFonte}</figcaption>}
        </figure>
        <div className="relative min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{v.nome}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
            <SeloPartido sigla={v.partido} logo={v.partidoLogo} grande />
            <span>{v.partidoNome ?? (v.partido ? "" : "partido não informado")}</span>
            {pf?.mesa && <span className="rounded-md bg-blue-50 px-2 py-0.5 text-sm text-blue-800 ring-1 ring-blue-200">{pf.mesa} da Mesa</span>}
            {!v.emExercicio && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-600">não está mais em exercício</span>}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
            {pf?.nomeCompleto && (
              <div>
                <dt className="inline text-slate-400">Nome: </dt>
                <dd className="inline">{pf.nomeCompleto}</dd>
              </div>
            )}
            {pf?.votos && (
              <div>
                <dt className="inline text-slate-400">Votos em 2024: </dt>
                <dd className="inline">{pf.votos.toLocaleString("pt-BR")}</dd>
              </div>
            )}
            {pf?.ocupacao && (
              <div>
                <dt className="inline text-slate-400">Ocupação: </dt>
                <dd className="inline">{pf.ocupacao}</dd>
              </div>
            )}
            {pf?.instrucao && (
              <div>
                <dt className="inline text-slate-400">Formação: </dt>
                <dd className="inline">{pf.instrucao}</dd>
              </div>
            )}
            {pf?.email && (
              <div>
                <dt className="inline text-slate-400">E-mail: </dt>
                <dd className="inline">
                  <a className="text-blue-800 underline" href={`mailto:${pf.email}`}>
                    {pf.email}
                  </a>
                </dd>
              </div>
            )}
            {pf?.telefone && (
              <div>
                <dt className="inline text-slate-400">Telefone: </dt>
                <dd className="inline">{pf.telefone}</dd>
              </div>
            )}
          </dl>
          <p className="mt-2 flex flex-wrap gap-3 text-sm">
            {v.perfilOficial && (
              <a href={v.perfilOficial} className="text-blue-800 underline">
                Perfil no site da Câmara
              </a>
            )}
            {pf?.redes.map((r) => (
              <a key={r.url} href={r.url} className="capitalize text-blue-800 underline">
                {r.rede}
              </a>
            ))}
          </p>
        </div>
        <div className="relative grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[22rem]">
          {COEFICIENTES.map((c) => (
            <a key={c.chave} href="#coeficientes" className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-inset ring-slate-200 transition hover:ring-blue-300" title={c.descricao}>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{c.nome}</div>
              <div className="mt-1">
                {v.coeficientes[c.chave] == null ? <span className="text-sm text-slate-400">—</span> : <NotaBadge valor={nota10(v.coeficientes[c.chave])} />}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{v.rankings[c.chave] ? `${v.rankings[c.chave]}º de ${avaliados.length}` : "sem dados"}</div>
            </a>
          ))}
          {v.coeficientes.producao == null && (
            <p className="col-span-3 text-xs text-slate-500">Menos de {dados.metodologia.vereador.minimoSessoes} sessões no período: sem coeficientes.</p>
          )}
        </div>
      </header>

      <AvisoParcial alvo="vereador" className="mt-4" />

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {PILARES_VEREADOR.map((pl) => {
          const n = nota10(v.pilares[pl.chave].nota);
          return (
            <a key={pl.chave} href="#nota" className={`rounded-xl border bg-white p-4 ${pl.chave === "D" ? "border-dashed border-slate-300" : "border-slate-200 hover:border-blue-300"}`}>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Pilar {pl.chave} · {COEFICIENTES.find((c) => c.pilares.includes(pl.chave))?.nome ?? "informativo"}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">{pl.nome}</div>
              <div className="mt-2">
                {n != null ? (
                  <NotaBadge valor={n} />
                ) : pl.chave === "D" && custo ? (
                  <span className="text-sm font-semibold tabular-nums text-slate-700">{milReais(custo.totalMensal)}/mês</span>
                ) : (
                  <span className="text-sm text-slate-400">sem dados</span>
                )}
              </div>
              {v.pilares[pl.chave].ranking && <div className="mt-1 text-xs text-slate-500">{v.pilares[pl.chave].ranking}º no pilar</div>}
            </a>
          );
        })}
      </div>

      <Secao titulo="Coeficientes" id="coeficientes" subtitulo="Não há nota geral: cada coeficiente junta avaliações individuais, mostradas logo abaixo.">
        <div className="grid gap-3 md:grid-cols-3">
          {COEFICIENTES.map((c) => (
            <div key={c.chave} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900">{c.nome}</span>
                {v.coeficientes[c.chave] == null ? <span className="text-sm text-slate-400">—</span> : <NotaBadge valor={nota10(v.coeficientes[c.chave])} />}
              </div>
              <p className="mt-1 text-xs text-slate-500">{c.descricao}</p>
              {c.pilares.length > 0 ? (
                <p className="mt-2 text-sm text-slate-700">
                  ={" "}
                  {c.pilares
                    .map((k) => `${PILARES_VEREADOR.find((p) => p.chave === k)!.nome} ${nota(nota10(v.pilares[k].nota))}`)
                    .join(" e ")}
                  {c.pilares.some((k) => v.pilares[k].nota == null) && " (sem dado não entra na média)"}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-700">
                  {i.producaoPorPresenca == null ? "Sem presenças registradas." : `${num(i.producaoPorPresenca, 1)} pontos de projeto e lei a cada 10 sessões em que esteve presente (${i.presencas} presenças).`}
                </p>
              )}
              {v.rankings[c.chave] && (
                <p className="mt-1 text-xs text-slate-500">
                  {v.rankings[c.chave]}º de {avaliados.length} vereadores
                </p>
              )}
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Como cada avaliação foi calculada" id="nota">
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-5">
          {PILARES_VEREADOR.map((pl) => (
            <div key={pl.chave} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="font-medium text-slate-900">
                  {pl.chave} · {pl.nome}
                </div>
                <div className="text-sm text-slate-600">{detalhes[pl.chave]}</div>
                <div className="mt-0.5 text-xs text-slate-400">{pl.descricao}</div>
              </div>
              <div className="flex items-center gap-3 sm:w-48">
                <Barra valor={v.pilares[pl.chave].nota ?? 0} classe={v.pilares[pl.chave].nota == null ? "bg-slate-300" : "bg-blue-700"} />
                <span className="w-10 text-right text-sm tabular-nums text-slate-600">{nota(nota10(v.pilares[pl.chave].nota))}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Não há nota geral. Participação é a média de A e E; Produção, a média de B e C. O custo do mandato (D) aparece para consulta e não entra em
          nenhum coeficiente, porque é igual para todos os gabinetes.
        </p>
      </Secao>

      {mapa && (votosMapa || itensMapa.length > 0) && (
        <Secao
          titulo="No mapa de Osasco"
          subtitulo={
            votosMapa
              ? "Onde veio a votação de 2024 e quais bairros aparecem nos documentos do mandato. Os círculos laranja são os documentos."
              : "Quais bairros aparecem nos documentos do mandato."
          }
        >
          <MapaPessoa
            largura={geoB.largura}
            altura={geoB.altura}
            bairros={geoB.contornos.map((c) => ({ ...c, nome: nomeBairro.get(c.id) ?? c.id }))}
            modos={modosMapa}
            itens={itensMapa}
            corItens="var(--mapa-camara)"
          />
        </Secao>
      )}

      <Secao titulo="Comparado com a média da Câmara" subtitulo={`Média entre os ${pares.length} vereadores com nota, no mesmo período.`}>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">
          {comparacoes.map((c) => {
            const melhor = c.valor != null && (c.maiorMelhor ? c.valor > c.media * 1.02 : c.valor < c.media * 0.98);
            const pior = c.valor != null && (c.maiorMelhor ? c.valor < c.media * 0.98 : c.valor > c.media * 1.02);
            const escala = Math.max(c.valor ?? 0, c.media) * 1.15 || 1;
            return (
              <div key={c.nome} className="grid items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[1fr_14rem_7rem]">
                <div className="text-sm font-medium text-slate-900">{c.nome}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-14 shrink-0">{v.nome.split(" ")[0]}</span>
                    <Barra valor={(c.valor ?? 0) / escala} classe="bg-blue-700" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-14 shrink-0">Média</span>
                    <Barra valor={c.media / escala} classe="bg-slate-400" />
                  </div>
                </div>
                <div className="text-right text-sm">
                  <span className="font-semibold tabular-nums text-slate-900">{c.formato(c.valor)}</span>
                  <span className="text-slate-400"> / {c.formato(c.media)}</span>
                  <div className={`text-xs font-medium ${melhor ? "text-emerald-700" : pior ? "text-rose-700" : "text-slate-500"}`}>
                    {melhor ? "▲ melhor que a média" : pior ? "▼ pior que a média" : "● na média"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Atividade por mês">
          <AtividadeMensal meses={v.atividadePorMes} />
        </Secao>
        <Secao titulo="Temas dos projetos" subtitulo="Identificados pelas palavras da ementa; um projeto pode ter mais de um tema.">
          {v.temas.length ? (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
              {v.temas.map((t) => (
                <span key={t.tema} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-900 ring-1 ring-blue-200">
                  {t.tema}
                  <span className="rounded-full bg-white px-1.5 text-xs font-semibold tabular-nums text-blue-800">{t.n}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Nenhum projeto com tema identificado no período.</p>
          )}
        </Secao>
      </div>

      {pf && pf.bio.length > 0 && (
        <Secao titulo="Quem é">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-slate-700">
            {pf.bio.map((b, k) => (
              <p key={k}>{b}</p>
            ))}
            <p className="text-xs text-slate-500">
              Texto do{" "}
              <a href={v.perfilOficial ?? "#"} className="underline">
                perfil oficial na Câmara
              </a>
              . Foto: Câmara Municipal de Osasco.
            </p>
          </div>
        </Secao>
      )}

      {pf && (pf.comissoes.length > 0 || pf.mesa) && (
        <Secao titulo="Comissões e Mesa Diretora">
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
            {pf.mesa && (
              <li className="flex justify-between gap-3 p-3">
                <span className="text-slate-900">Mesa Diretora</span>
                <span className="text-slate-600">{pf.mesa}</span>
              </li>
            )}
            {[...pf.comissoes]
              .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "frente" ? 1 : -1))
              .map((c) => (
                <li key={c.url} className="flex justify-between gap-3 p-3">
                  <a href={c.url} className={c.tipo === "frente" ? "text-slate-500 underline" : "text-slate-900 underline"}>
                    {c.nome}
                  </a>
                  <span className="shrink-0 text-slate-600">{c.cargo}</span>
                </li>
              ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Presença sessão a sessão">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap gap-1">
            {v.presencaPorSessao.map((p) => {
              const s = sessao(p.sessao)!;
              const cor = p.presente == null ? "bg-slate-200" : !p.presente ? "bg-rose-500" : p.presidente ? "bg-blue-700" : p.primeiraChamada ? "bg-emerald-500" : "bg-amber-400";
              const texto = p.presente == null ? "sem registro" : !p.presente ? "ausente" : p.primeiraChamada ? "presente desde o início" : "chegou depois da 1ª chamada";
              return <a key={p.sessao} href={s.url} title={`${nomeSessao(s)} — ${dataBR(s.data)}: ${texto}`} className={`h-6 w-4 rounded-sm ${cor} hover:opacity-70`} />;
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-emerald-500" />Presente desde o início</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-amber-400" />Chegou depois</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-rose-500" />Ausente</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-blue-700" />Na presidência</span>
          </div>
        </div>
      </Secao>

      <Secao titulo="Votações nominais">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Cartao titulo="Votou sim" valor={i.votos.sim} />
          <Cartao titulo="Votou não" valor={i.votos.nao} />
          <Cartao titulo="Abstenções" valor={i.votos.abstencao} />
          <Cartao titulo="Ausente na votação" valor={i.votos.ausente} detalhe={`participou de ${pct(i.participacaoVotos)} (${votosDados} votos)`} />
        </div>
        <p className="mt-2 text-xs text-slate-500">A maioria das matérias na Câmara é votada de forma simbólica, sem registro do voto de cada vereador. Aqui entram só as votações nominais.</p>
      </Secao>

      <Secao titulo={`Projetos apresentados (${projetos.length})`}>
        <ListaTematica itens={projetos.map(itemProposicao)} nomes={["projeto", "projetos"]} vazio="Nenhum projeto encontrado nas sessões analisadas." />
      </Secao>

      {(v.leis.length > 0 || v.vetos.length > 0) && (
        <Secao titulo="Leis sancionadas e vetos">
          <ListaTematica
            nomes={["lei ou veto", "leis e vetos"]}
            vazio=""
            itens={[
              ...v.leis.map(
                (l): ItemLista => ({
                  key: l.key,
                  titulo: `${l.lei} (${l.data})`,
                  curto: l.lei,
                  texto: l.resumo,
                  temas: l.temas ?? [],
                  selo: { texto: "Sancionada", tom: "verde" },
                  sessao: linkSessao(l.sessao),
                }),
              ),
              ...v.vetos.map(
                (x): ItemLista => ({
                  key: x.key,
                  titulo: x.projeto,
                  curto: x.projeto,
                  texto: x.resumo,
                  temas: x.temas ?? [],
                  selo: { texto: `Veto ${x.tipo}`, tom: "vermelho" },
                  sessao: linkSessao(x.sessao),
                }),
              ),
            ]}
          />
        </Secao>
      )}

      {honrarias.length > 0 && (
        <Secao titulo={`Honrarias e decretos legislativos (${honrarias.length})`}>
          <p className="-mt-2 mb-3 text-sm text-slate-500">Títulos de cidadão, cartões de prata, diplomas e similares. Aparecem aqui, mas não contam na nota.</p>
          <ListaTematica itens={honrarias.map(itemProposicao)} nomes={["honraria", "honrarias"]} vazio="" agrupar />
        </Secao>
      )}

      {v.requerimentosNaPauta.length > 0 && (
        <Secao
          titulo={`Requerimentos de informação na pauta (${v.requerimentosNaPauta.length})`}
          subtitulo={
            parados.length
              ? `${plural(parados.length, "pedido", "pedidos")} de informação ao Executivo ${parados.length === 1 ? "continua" : "continuam"} na Ordem do Dia, sessão após sessão, sem ir a votação.`
              : "Pedidos de informação ao Executivo que passaram pela Ordem do Dia."
          }
        >
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
            {v.requerimentosNaPauta.map((r) => (
              <li key={r.key} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    Requerimento nº {r.numero}/{r.ano}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ${r.aindaNaPauta ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-50 text-slate-600 ring-slate-200"}`}
                  >
                    {r.status ? r.status.toLowerCase() : r.aindaNaPauta ? `na pauta em ${r.sessoes} sessões, sem votação` : `saiu da pauta após ${r.sessoes} sessões`}
                  </span>
                </div>
                <div className="mt-1 text-slate-700">{r.ementa}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Desde a <LinkSessao id={r.primeira} />
                  {r.ultima !== r.primeira && (
                    <>
                      {" "}até a <LinkSessao id={r.ultima} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {custo && (
        <Secao titulo="Quanto custa este mandato" subtitulo="Salário do vereador e dos cargos do gabinete, pelo Quadro de Pessoal oficial da Câmara.">
          <CustoMandato custo={custo} />
          {pagoNoMes != null && mesFolha && (
            <p className="mt-3 text-sm text-slate-600">
              Pago a {v.nome} na folha de {rotuloMesFolha(mesFolha)}: <b className="tabular-nums text-slate-900">{reais(pagoNoMes)}</b> brutos (subsídio e
              adicionais da folha normal; fonte: Portal do Cidadão da Câmara).
            </p>
          )}
        </Secao>
      )}

      {v.adiadas.length > 0 && (
        <Secao titulo={`Itens adiados porque o autor faltou (${v.adiadas.length})`}>
          <ListaTematica
            nomes={["item", "itens"]}
            vazio=""
            itens={v.adiadas.map(
              (a, k): ItemLista => ({
                key: `${a.sessao}-${k}`,
                titulo: a.titulo ? a.titulo.charAt(0) + a.titulo.slice(1).toLowerCase() : "Item adiado",
                curto: a.titulo ?? "item",
                texto: a.ementa,
                temas: a.temas,
                sessao: linkSessao(a.sessao),
              }),
            )}
          />
        </Secao>
      )}
      {(anterior || seguinte) && (
        <nav className="mt-12 grid gap-3 sm:grid-cols-2" aria-label="Outros vereadores">
          {anterior ? (
            <Link href={`/vereadores/${anterior.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:shadow-md">
              <span className="text-slate-400 transition group-hover:-translate-x-1">←</span>
              <Avatar nome={anterior.nome} foto={anterior.foto} tamanho={44} />
              <span className="min-w-0">
                <span className="block text-xs text-slate-500">{idx}º em produção</span>
                <span className="block truncate font-medium text-slate-900">{anterior.nome}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {seguinte && (
            <Link href={`/vereadores/${seguinte.id}`} className="group flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-right transition hover:border-blue-300 hover:shadow-md">
              <span className="min-w-0">
                <span className="block text-xs text-slate-500">{idx + 2}º em produção</span>
                <span className="block truncate font-medium text-slate-900">{seguinte.nome}</span>
              </span>
              <Avatar nome={seguinte.nome} foto={seguinte.foto} tamanho={44} />
              <span className="text-slate-400 transition group-hover:translate-x-1">→</span>
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
