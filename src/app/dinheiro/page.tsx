import type { Metadata } from "next";
import Link from "next/link";
import { ComposicaoEntradas, GastosPorAno } from "@/components/Dinheiro";
import { GraficoLinha } from "@/components/GraficoLinha";
import { Cartao, Secao } from "@/components/ui";
import { dados, dataBR } from "@/lib/dados";
import bruto from "@/data/dinheiro.json";
import { nomeAutor, nomeFuncao, type PaginaDinheiro } from "@/lib/dinheiro";
import { dinheiroCurto } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Dinheiro de fora",
  description: "Quanto a União e o Estado mandam para Osasco, quais deputados mandaram emendas e com quem a Prefeitura gastou esse dinheiro.",
};

const dinheiro = bruto as unknown as PaginaDinheiro;

export default function PaginaDinheiro() {
  const { entradas, emendas, pix, pixEstaduais, gastos, fontes, convenios } = dinheiro;
  const ultimo = [...entradas].sort((a, b) => b.ano - a.ano)[0];
  const anoEmendas = String(ultimo.ano);
  const recebidoUltimo = emendas.recebidoPorAno[anoEmendas] ?? 0;
  const nomesBairro = new Map((dados.mapa?.bairros ?? []).map((b) => [b.id, b.nome]));
  const bairros = (dados.mapa?.bairros ?? [])
    .filter((b) => b.dinheiro && b.dinheiro.valor > 0)
    .sort((a, b) => b.dinheiro!.valor - a.dinheiro!.valor);
  const individuais = emendas.autores.filter((a) => !a.coletiva);
  const coletivas = emendas.autores.filter((a) => a.coletiva);
  const totalEmendas = Object.values(emendas.recebidoPorAno).reduce((a, b) => a + b, 0);
  const anosRecebido = Object.keys(emendas.recebidoPorAno).sort();

  return (
    <>
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-balance text-slate-900">Dinheiro de fora</h1>
        <p className="mt-2 text-slate-600">
          Quanto a União e o Estado mandam para Osasco, por qual motivo, quais deputados e senadores mandaram emendas e com quem a Prefeitura gastou
          esse dinheiro. Tudo a partir dos registros oficiais, com o link de cada fonte.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cartao titulo={`Da União em ${ultimo.ano}`} valor={dinheiroCurto(ultimo.uniao.total)} detalhe="FPM, SUS, educação, convênios" />
        <Cartao titulo={`Do Estado em ${ultimo.ano}`} valor={dinheiroCurto(ultimo.estado.total)} detalhe="ICMS, IPVA, SUS, convênios" />
        <Cartao titulo={`FUNDEB em ${ultimo.ano}`} valor={dinheiroCurto(ultimo.fundeb)} detalhe="fundo da educação básica" />
        <Cartao titulo={`Emendas federais recebidas em ${anoEmendas}`} valor={dinheiroCurto(recebidoUltimo)} detalhe={`${dinheiroCurto(totalEmendas)} desde ${anosRecebido[0]}`} />
      </div>

      <Secao titulo="Quanto chega por ano" id="quanto-chega" subtitulo="Receitas que a Prefeitura registrou como vindas da União e do Estado, ano a ano.">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <GraficoLinha
            rotulo="Dinheiro da União, do Estado e do FUNDEB recebido por Osasco, por ano"
            formato="milhoesReais"
            zeroNaBase
            altura={220}
            series={[
              { nome: "Estado", cor: "var(--grafico-2)", pontos: entradas.map((e) => ({ x: e.ano, y: e.estado.total })) },
              { nome: "FUNDEB", cor: "var(--grafico-3)", pontos: entradas.map((e) => ({ x: e.ano, y: e.fundeb || null })) },
              { nome: "União", cor: "var(--grafico-1)", pontos: entradas.map((e) => ({ x: e.ano, y: e.uniao.total })) },
            ]}
          />
          <p className="mt-2 text-xs text-slate-500">
            Valores brutos, sem correção pela inflação. O ano de{" "}
            {ultimo.ano + 1} entra quando a Prefeitura entregar as contas anuais.
          </p>
        </div>
        <div className="mt-4">
          <ComposicaoEntradas anos={entradas} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          O que é obrigatório (FPM, ICMS, IPVA, FUNDEB) chega por regra fixa e entra no caixa geral da Prefeitura, misturado aos impostos da própria
          cidade: não dá para seguir esse dinheiro até a nota. Saúde, educação, convênios e emendas chegam carimbados e podem ser seguidos (veja{" "}
          <a href="#para-onde-foi" className="underline">
            para onde foi
          </a>
          ). Fonte:{" "}
          <a href={fontes.entradas.url} className="underline">
            {fontes.entradas.nome}
          </a>
          .
        </p>
      </Secao>

      <Secao
        titulo="Quem mandou emendas"
        id="quem-mandou"
        subtitulo="Deputados federais e senadores cujas emendas chegaram à Prefeitura de Osasco ou aos fundos municipais, pelo valor efetivamente recebido."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <ol className="divide-y divide-slate-100">
              {individuais.map((a) => (
                <li key={a.nome} className="flex items-baseline gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">{nomeAutor(a.nome)}</span>
                    <span className="block text-xs text-slate-500">
                      {a.emendas === 1 ? "1 emenda" : `${a.emendas} emendas`} · recebido em {Object.keys(a.porAno).sort().join(", ")}
                      {a.funcoes.length > 0 && ` · ${a.funcoes.slice(0, 3).map(nomeFuncao).join(", ")}`}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(a.total)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-4">
            {coletivas.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Emendas sem um autor individual</div>
                <p className="mt-0.5 text-xs text-slate-500">De relator, comissão ou bancada: o registro não diz qual parlamentar pediu.</p>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {coletivas.map((a) => (
                    <li key={a.nome} className="flex items-baseline gap-3 py-1.5">
                      <span className="min-w-0 flex-1 text-slate-800">{nomeAutor(a.nome)}</span>
                      <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(a.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {emendas.entidades.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Entidades de Osasco que receberam emendas direto</div>
                <p className="mt-0.5 text-xs text-slate-500">Associações e institutos sediados na cidade. Esse dinheiro não passa pela Prefeitura.</p>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {emendas.entidades.slice(0, 10).map((e) => (
                    <li key={e.nome} className="flex items-baseline gap-3 py-1.5">
                      <span className="min-w-0 flex-1">
                        <span className="block text-slate-800">{e.nome}</span>
                        <span className="block text-[11px] text-slate-500">{e.autores.map(nomeAutor).join(", ")}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(e.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Ficam de fora {emendas.empresasForaDaConta.quantidade.toLocaleString("pt-BR")} pagamentos ({dinheiroCurto(emendas.empresasForaDaConta.total)}) a
              empresas com sede em Osasco que forneceram para programas nacionais: é dinheiro de emenda, mas não foi para a cidade. Fonte:{" "}
              <a href={fontes.emendas.url} className="underline">
                {fontes.emendas.nome}
              </a>
              .
            </p>
          </div>
        </div>
      </Secao>

      {pix.length > 0 && (
        <Secao
          titulo="Emendas com destino escrito"
          id="emendas-pix"
          subtitulo="Nas transferências especiais (as “emendas Pix”), a Prefeitura informa ao governo federal o que vai fazer com o dinheiro. Isto é o que ela escreveu."
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {pix.map((p, i) => (
              <li key={`${p.ano}-${p.parlamentar}-${i}`} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-slate-900">{p.parlamentar}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(p.valor)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Emenda de {p.ano}
                  {p.planoTrabalho?.fim && ` · prazo de execução até ${dataBR(p.planoTrabalho.fim)}`}
                </div>
                {p.objetos.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {p.objetos.map((o) => (
                      <li key={o.objeto} className="line-clamp-4 text-slate-700" title={o.objeto}>
                        {o.objeto}
                        {o.bairros.length > 0 && <span className="text-xs text-blue-800"> · {o.bairros.map((b) => nomesBairro.get(b) ?? b).join(", ")}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">A Prefeitura ainda não informou o que vai fazer com este dinheiro.</p>
                )}
              </li>
            ))}
          </ul>
          {pixEstaduais.length > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              O Estado também mandou {pixEstaduais.length} transferências especiais de deputados estaduais, somando{" "}
              {dinheiroCurto(pixEstaduais.reduce((a, r) => a + r.valor, 0))} até {dataBR(fontes.pixEstaduais!.posicao!)}, pela{" "}
              <a href={fontes.pixEstaduais!.url} className="underline">
                planilha publicada pelo TCE-SP
              </a>
              . O governo estadual não publica em arquivo aberto o nome do deputado que indicou cada uma.
            </p>
          )}
        </Secao>
      )}

      <Secao
        titulo="Para onde foi"
        id="para-onde-foi"
        subtitulo="Pagamentos da Prefeitura feitos com dinheiro carimbado da União e do Estado, como a própria Prefeitura informou ao Tribunal de Contas."
      >
        <GastosPorAno gastos={gastos} />
        <p className="mt-3 text-xs text-slate-500">
          Fonte:{" "}
          <a href={fontes.gastos.url} className="underline">
            {fontes.gastos.nome}
          </a>
          . O dinheiro do FPM, do ICMS e do IPVA não aparece aqui porque entra no caixa geral, sem carimbo.
        </p>
      </Secao>

      <Secao titulo="Nos bairros" id="nos-bairros" subtitulo="Emendas, convênios e pagamentos cujo texto oficial cita o nome do bairro, uma escola ou uma unidade de saúde dele.">
        {bairros.length ? (
          <>
            <ol className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {bairros.slice(0, 15).map((b) => (
                <li key={b.id} className="flex items-baseline gap-3 border-b border-slate-100 py-2 text-sm">
                  <span className="min-w-0 flex-1 text-slate-800">{b.nome}</span>
                  <span className="shrink-0 text-xs text-slate-500">{b.dinheiro!.quantidade === 1 ? "1 item" : `${b.dinheiro!.quantidade} itens`}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(b.dinheiro!.valor)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm">
              <Link href="/mapa?indicador=dinheiroCitado" className="font-medium text-blue-800 underline">
                Ver no mapa, bairro a bairro
              </Link>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Só entra o que cita o lugar no texto: um posto de saúde pago com dinheiro federal sem o nome do bairro na descrição não aparece aqui. Quando
              um item cita mais de um bairro, o valor é dividido entre eles. {convenios.length} convênios de emendas foram conferidos.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">Nenhum item cita bairro ainda.</p>
        )}
      </Secao>

      <Secao titulo="Como ler esta página" id="como-ler">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>
            Dinheiro obrigatório (FPM, ICMS, IPVA, FUNDEB) chega todo mês por regra fixa, sem pedido de ninguém. Emendas e convênios dependem de um
            parlamentar ou de um acordo.
          </li>
          <li>
            Emendas aparecem pelo valor que chegou a Osasco, não pelo valor prometido. A Prefeitura costuma lançar as emendas dentro da área (saúde,
            convênios), por isso o quadro de cima não tem uma linha só de emendas.
          </li>
          <li>
            O rastro completo, do parlamentar até a nota, existe para o que chega carimbado. Dinheiro repassado direto aos fundos de saúde e educação, e
            as “emendas Pix”, entram num caixa comum daquela área: dá para ver com quem a área gastou, mas não qual nota cada emenda pagou.
          </li>
          <li>Se a obra ou o serviço foi entregue não aparece nesses registros. Para obras, veja a camada de obras no mapa.</li>
        </ul>
      </Secao>
    </>
  );
}
