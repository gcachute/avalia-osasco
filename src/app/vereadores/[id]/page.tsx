import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Barra, Cartao, NotaBadge, Secao } from "@/components/ui";
import type { PilarVereador } from "@/lib/dados";
import { PILARES_VEREADOR, TIPO_NOME, dados, dataBR, nomeSessao, nota, nota10, pct, plural, sessao } from "@/lib/dados";

export const dynamicParams = false;
export const generateStaticParams = () => dados.vereadores.map((v) => ({ id: v.id }));

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const v = dados.vereadores.find((x) => x.id === id);
  return { title: v ? `${v.nome} — vereador(a) de Osasco` : "Vereador" };
}

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
  const pesos = dados.metodologia.vereador.pesos;
  const totalPesos = Object.values(pesos).reduce((a, b) => a + b, 0);
  const votosDados = i.votos.sim + i.votos.nao + i.votos.abstencao;
  const projetos = v.proposicoes.filter((p) => dados.metodologia.tiposProjeto.includes(p.tipo));
  const honrarias = v.proposicoes.filter((p) => !dados.metodologia.tiposProjeto.includes(p.tipo));
  const comNota = dados.vereadores.filter((x) => x.posicao).length;
  const pf = v.perfil;
  const detalhes: Record<PilarVereador, string> = {
    A: `Presença de ${pct(i.presencaAjustada)} descontadas ${plural(i.faltasJustificadas, "falta justificada", "faltas justificadas")} (esteve em ${i.presencas} de ${i.sessoes} sessões) · votou em ${pct(i.participacaoVotos)} das votações nominais`,
    B: `${plural(i.projetosSubstantivos, "projeto", "projetos")} de política pública, ${plural(i.projetosSimbolicos, "simbólico", "simbólicos")} e ${plural(i.leisSancionadas, "lei sancionada", "leis sancionadas")} em ${i.sessoes} sessões`,
    C: !v.emExercicio
      ? "Sem dado: a composição das comissões publicada é a atual, e este vereador já saiu da Câmara"
      : `${pf?.mesa ? `${pf.mesa} da Mesa Diretora · ` : ""}${plural(i.comissoes, "comissão", "comissões")} · ${plural(i.frentes, "frente parlamentar", "frentes parlamentares")}`,
    D: "Sem dados abertos de gasto por gabinete",
    E: `${plural(i.adiadasPorAusencia, "item próprio adiado", "itens próprios adiados")} porque faltou, em ${i.sessoes} sessões`,
  };

  return (
    <>
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← Ranking
      </Link>

      <header className="mt-4 flex flex-wrap items-start gap-5">
        <Avatar nome={v.nome} foto={v.foto} tamanho={112} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{v.nome}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
            {v.partido && <span className="rounded-md bg-slate-900 px-2 py-0.5 text-sm font-semibold text-white">{v.partido}</span>}
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
        <div className="text-right">
          <NotaBadge valor={v.nota} grande />
          <p className="mt-1 text-sm text-slate-500">
            {v.posicao ? `${v.posicao}º de ${comNota} · nota provisória` : `Menos de ${dados.metodologia.vereador.minimoSessoes} sessões no período`}
          </p>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {PILARES_VEREADOR.map((pl) => {
          const n = nota10(v.pilares[pl.chave].nota);
          return (
            <a key={pl.chave} href="#nota" className={`rounded-xl border bg-white p-4 ${pl.chave === "D" ? "border-dashed border-slate-300" : "border-slate-200 hover:border-blue-300"}`}>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Pilar {pl.chave} · {Math.round((pesos[pl.chave] / totalPesos) * 100)}%
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">{pl.nome}</div>
              <div className="mt-2">{n == null ? <span className="text-sm text-slate-400">sem dados</span> : <NotaBadge valor={n} />}</div>
              {v.pilares[pl.chave].ranking && <div className="mt-1 text-xs text-slate-500">{v.pilares[pl.chave].ranking}º no pilar</div>}
            </a>
          );
        })}
      </div>

      <Secao titulo="Como a nota foi formada" id="nota">
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
          A nota é a média ponderada dos pilares com dados ({Math.round(v.cobertura * 100)}% do peso). É provisória enquanto o pilar D não tiver fonte aberta.
        </p>
      </Secao>

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
        <ListaProposicoes itens={projetos} vazio="Nenhum projeto encontrado nas sessões analisadas." />
      </Secao>

      {(v.leis.length > 0 || v.vetos.length > 0) && (
        <Secao titulo="Leis sancionadas e vetos">
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {v.leis.map((l) => (
              <li key={l.key} className="p-4 text-sm">
                <span className="mr-2 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">Sancionada</span>
                <b className="text-slate-900">{l.lei}</b> ({l.data}) — {l.resumo}
                <div className="mt-1 text-xs text-slate-500">Comunicada na <LinkSessao id={l.sessao} /></div>
              </li>
            ))}
            {v.vetos.map((x) => (
              <li key={x.key} className="p-4 text-sm">
                <span className="mr-2 rounded bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-800">Veto {x.tipo}</span>
                <b className="text-slate-900">{x.projeto}</b> — {x.resumo}
                <div className="mt-1 text-xs text-slate-500">Comunicado na <LinkSessao id={x.sessao} /></div>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {honrarias.length > 0 && (
        <Secao titulo={`Honrarias e decretos legislativos (${honrarias.length})`}>
          <p className="-mt-2 mb-3 text-sm text-slate-500">Títulos de cidadão, cartões de prata, diplomas e similares. Aparecem aqui, mas não contam na nota.</p>
          <ListaProposicoes itens={honrarias} vazio="" />
        </Secao>
      )}

      {v.adiadas.length > 0 && (
        <Secao titulo={`Itens adiados porque o autor faltou (${v.adiadas.length})`}>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
            {v.adiadas.map((a, k) => (
              <li key={k} className="p-4">
                <div className="text-slate-700">{a.item}…</div>
                <div className="mt-1 text-xs text-slate-500"><LinkSessao id={a.sessao} /></div>
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </>
  );
}

function ListaProposicoes({ itens, vazio }: { itens: typeof dados.vereadores[number]["proposicoes"]; vazio: string }) {
  if (!itens.length) return <p className="text-sm text-slate-500">{vazio}</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {itens.map((p) => (
        <li key={p.key} className="p-4 text-sm">
          <div className="font-medium text-slate-900">
            {TIPO_NOME[p.tipo] ?? p.tipo} nº {p.numero}/{p.ano}
            {p.classe && (
              <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${p.classe === "substantivo" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                {p.classe === "substantivo" ? "política pública" : "simbólico"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-slate-600">{p.ementa}</p>
          <div className="mt-1 text-xs text-slate-500">
            Visto pela primeira vez na <LinkSessao id={p.sessao} />
          </div>
        </li>
      ))}
    </ul>
  );
}
