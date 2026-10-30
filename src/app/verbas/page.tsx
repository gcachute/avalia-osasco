import type { Metadata } from "next";
import Link from "next/link";
import { ComposicaoEntradas, GastosPorAno } from "@/components/Dinheiro";
import { AnoEmAndamento, ConferirLinha } from "@/components/dinheiro/Conferencia";
import { QuemMandou } from "@/components/dinheiro/Emendas";
import { ConferenciasIntegridade } from "@/components/dinheiro/Integridade";
import { GraficoLinha } from "@/components/GraficoLinha";
import { Secao } from "@/components/ui";
import { DinheiroAnimado } from "@/components/Animacoes";
import { dados, dataBR } from "@/lib/dados";
import bruto from "@/data/dinheiro.json";
import { nomeProprio, type PaginaDinheiro } from "@/lib/dinheiro";
import { dinheiroCurto } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Verbas e receitas",
  description: "Quanto a União e o Estado mandam para Osasco, quais deputados e senadores mandaram emendas, com quem a Prefeitura gastou esse dinheiro e o que a conferência de integridade encontrou.",
};

const dinheiro = bruto as unknown as PaginaDinheiro;

export default function PaginaDinheiro() {
  const { entradas, emendas, vereadores, pixEstaduais, gastos, fontes, convenios, integridade, parcial, conferencias, fontesConferencia } = dinheiro;
  const ultimo = [...entradas].sort((a, b) => b.ano - a.ano)[0];
  const anoEmendas = String(ultimo.ano);
  const recebidoUltimo = emendas.recebidoPorAno[anoEmendas] ?? 0;
  const bairros = (dados.mapa?.bairros ?? [])
    .filter((b) => b.dinheiro && b.dinheiro.valor > 0)
    .sort((a, b) => b.dinheiro!.valor - a.dinheiro!.valor);
  const totalEmendas = Object.values(emendas.recebidoPorAno).reduce((a, b) => a + b, 0);
  const anosRecebido = Object.keys(emendas.recebidoPorAno).sort();
  const pagoEmendasEstaduais = gastos.reduce((s, g) => s + (g.emendasEstaduais?.total ?? 0), 0);
  const anosEstaduais = gastos.filter((g) => g.emendasEstaduais?.total).map((g) => g.ano);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-7">
        <div className="relative">
          <p className="text-sm font-medium text-blue-800">De onde vem e para onde vai o dinheiro da Prefeitura de Osasco</p>
          <h1 className="mt-1 max-w-3xl text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">Verbas e receitas</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            O que chega da União e do Estado e por qual motivo, o que a própria cidade arrecada, quem mandou cada emenda, com quem a Prefeitura gastou o
            dinheiro de fora e o que a conferência nas listas oficiais de punidos encontrou. Tudo a partir dos registros oficiais, com o link de cada fonte.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {[
              { t: `Da União em ${ultimo.ano}`, v: ultimo.uniao.total, d: "valor bruto: FPM, SUS, educação, convênios", cor: "var(--grafico-1)" },
              { t: `Do Estado em ${ultimo.ano}`, v: ultimo.estado.total, d: "valor bruto: ICMS, IPVA, SUS, convênios", cor: "var(--grafico-2)" },
              { t: `FUNDEB em ${ultimo.ano}`, v: ultimo.fundeb, d: "fundo da educação básica", cor: "var(--grafico-3)" },
              { t: `Emendas federais em ${anoEmendas}`, v: recebidoUltimo, d: `${dinheiroCurto(totalEmendas)} desde ${anosRecebido[0]}`, cor: "var(--grafico-4)" },
              { t: `Receita própria em ${ultimo.ano}`, v: ultimo.propria?.total ?? 0, d: "ISS, IPTU, ITBI, taxas e outras", cor: "var(--grafico-outro)" },
            ].map((c) => (
              <div key={c.t} className="@container relative overflow-hidden rounded-xl bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.cor }} aria-hidden />
                <dt className="text-xs text-slate-500">{c.t}</dt>
                <dd className="mt-0.5 font-semibold whitespace-nowrap tabular-nums text-slate-900 [font-size:clamp(1rem,17cqw,1.5rem)]">
                  <DinheiroAnimado valor={c.v} />
                </dd>
                <dd className="mt-0.5 text-[11px] text-slate-500">{c.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Secao
        titulo="De onde vem o dinheiro"
        id="quanto-chega"
        subtitulo="O que a Prefeitura recebeu da União, do Estado e do FUNDEB, ano a ano, e, para comparar, o que arrecadou sozinha. O ano em andamento vem logo abaixo.">
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
            Valores brutos, sem correção pela inflação. O ano de {ultimo.ano + 1} entra quando a Prefeitura entregar as contas anuais.
          </p>
        </div>
        <div className="mt-4">
          <ComposicaoEntradas anos={entradas} conferencias={conferencias} />
        </div>
        {parcial && (
          <div className="mt-4">
            <AnoEmAndamento p={parcial} />
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          O que é obrigatório (FPM, ICMS, IPVA, FUNDEB) chega por regra fixa e entra no caixa geral da Prefeitura, misturado aos impostos da própria
          cidade: não dá para seguir esse dinheiro até a nota. Saúde, educação, convênios e emendas chegam carimbados e podem ser seguidos (veja{" "}
          <a href="#com-quem-gastou" className="underline">
            com quem a Prefeitura gastou
          </a>
          ). Fonte:{" "}
          <a href={fontes.entradas.url} className="underline">
            {fontes.entradas.nome}
          </a>
          . Conferido com:{" "}
          {[fontesConferencia.rreo, fontesConferencia.estado, fontesConferencia.uniao]
            .filter((f) => f != null)
            .map((f, i, arr) => (
              <span key={f.url}>
                <a href={f.url} className="underline">
                  {f.nome}
                </a>
                {i < arr.length - 1 ? "; " : "."}
              </span>
            ))}
        </p>
      </Secao>

      <Secao
        titulo="Quem mandou emendas"
        id="quem-mandou"
        subtitulo="Cada político com o valor que de fato chegou à Prefeitura e aos fundos municipais. Toque no nome para abrir a ficha; abra as emendas para ver o detalhe de cada uma, até as compras que ela pagou."
      >
        <QuemMandou autores={emendas.autores} vereadores={vereadores} porPartido={emendas.porPartido} />
        <div className="mt-3 text-xs">
          <ConferirLinha
            conferencias={conferencias.filter((c) => ["emendasIndividuais", "pix"].includes(c.chave))}
            ano={Number(anoEmendas)}
            titulo={`Total de emendas de ${anoEmendas} conferido com outras fontes`}
          />
        </div>

        <div className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium text-slate-900">E os deputados estaduais?</div>
            <p className="mt-1 text-sm text-slate-600">
              O governo do Estado não publica em arquivo aberto quem indicou cada emenda estadual. Dá para ver o dinheiro, sem o nome:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {pagoEmendasEstaduais > 0 && (
                <li className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 text-slate-700">
                    Pago pela Prefeitura com dinheiro de emendas estaduais ({anosEstaduais[0]} a {anosEstaduais.at(-1)})
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(pagoEmendasEstaduais)}</span>
                </li>
              )}
              {pixEstaduais.length > 0 && (
                <li className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 text-slate-700">
                    {pixEstaduais.length} emendas Pix estaduais recebidas até {dataBR(fontes.pixEstaduais!.posicao!)} (
                    <a href={fontes.pixEstaduais!.url} className="underline">
                      planilha do TCE-SP
                    </a>
                    )
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(pixEstaduais.reduce((a, r) => a + r.valor, 0))}</span>
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Quem recebeu esse dinheiro está em{" "}
              <a href="#com-quem-gastou" className="underline">
                com quem a Prefeitura gastou
              </a>
              .
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Ficam de fora {emendas.empresasForaDaConta.quantidade.toLocaleString("pt-BR")} pagamentos ({dinheiroCurto(emendas.empresasForaDaConta.total)}) a
          empresas com sede em Osasco que forneceram para programas nacionais: é dinheiro de emenda, mas não foi para a cidade.
          {emendas.entidadesForaDaConta.length > 0 &&
            ` Pelo mesmo motivo ficam de fora ${dinheiroCurto(emendas.entidadesForaDaConta.reduce((t, x) => t + x.valor, 0))} recebidos por entidades com sede em Osasco para projetos em outro lugar (${emendas.entidadesForaDaConta
              .map((x) => `${x.autor} para ${nomeProprio(x.entidade)}${x.destino ? `, destino ${/v[aá]rias|m[uú]ltiplo/i.test(x.destino) ? "várias cidades" : x.destino}` : ""}`)
              .join("; ")}).`}{" "}
          Fontes:{" "}
          <a href={fontes.emendas.url} className="underline">
            {fontes.emendas.nome}
          </a>
          {fontes.pix && (
            <>
              ;{" "}
              <a href={fontes.pix.url} className="underline">
                {fontes.pix.nome}
              </a>
            </>
          )}
          {fontes.parlamentares && (
            <>
              ; cargos, partidos e fotos:{" "}
              <a href={fontes.parlamentares.url} className="underline">
                {fontes.parlamentares.nome}
              </a>
            </>
          )}
          .
        </p>
      </Secao>

      {integridade && (
        <Secao
          titulo="Conferências de integridade"
          id="integridade"
          subtitulo="Cruzamentos feitos com registros oficiais. Cada um diz o que foi conferido e o que apareceu; um ponto de atenção é um fato a olhar de perto, não uma acusação."
        >
          <ConferenciasIntegridade i={integridade} />
        </Secao>
      )}

      <Secao
        titulo="Com quem a Prefeitura gastou"
        id="com-quem-gastou"
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

      <Secao titulo="Nos bairros" id="nos-bairros" subtitulo="Emendas, convênios e pagamentos cujo texto oficial cita o bairro, uma escola, unidade de saúde, rua ou córrego dele.">
        {bairros.length ? (
          <>
            <ol className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {bairros.slice(0, 15).map((b) => (
                <li key={b.id} className="border-b border-slate-100">
                  <Link href={`/mapa?indicador=dinheiroCitado&bairro=${b.id}`} className="flex items-baseline gap-3 py-2 text-sm hover:bg-slate-50">
                    <span className="min-w-0 flex-1 text-slate-800">{b.nome}</span>
                    <span className="shrink-0 text-xs text-slate-500">{b.dinheiro!.quantidade === 1 ? "1 item" : `${b.dinheiro!.quantidade} itens`}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(b.dinheiro!.valor)}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm">
              <Link href="/mapa?indicador=dinheiroCitado" className="font-medium text-blue-800 underline">
                Ver no mapa, bairro a bairro
              </Link>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Quando o texto cita uma rua ou um córrego, entram todos os bairros por onde ele passa (pelo mapa de ruas do OpenStreetMap); quando cita vários
              bairros, o valor é dividido igualmente entre eles. O que vale para Osasco inteira, sem rua nem bairro no texto (&quot;diversas ruas do
              município&quot;), fica fora das estatísticas dos bairros. {convenios.length} convênios de emendas foram
              conferidos.
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
            FPM, ICMS e IPVA aparecem pelo valor bruto, como na declaração anual da Prefeitura. Desse valor, 20% fica retido para formar o FUNDEB e volta
            pela linha do FUNDEB. Por isso números de jornal ou do orçamento podem ser diferentes: o ICMS de 2025, por exemplo, foi de R$ 640 mi brutos e R$
            512 mi livres; o valor previsto no orçamento é outro.
          </li>
          <li>
            Emendas aparecem pelo valor que chegou a Osasco, não pelo valor prometido. O partido mostrado em cada emenda é o do autor quando ela foi
            apresentada (em novembro do ano anterior); o da ficha é o de hoje.
          </li>
          <li>
            O rastro até a nota aparece quando o histórico do pagamento, escrito pela Prefeitura, cita o número da emenda. Quando não cita, dá para ver com
            quem a área gastou, mas não qual nota cada emenda pagou.
          </li>
          <li>
            A receita da própria cidade (ISS, IPTU, ITBI, taxas) aparece só para comparar o tamanho do dinheiro de fora. A linha de previdência dos
            servidores é dinheiro reservado às aposentadorias.
          </li>
          <li>
            O ano em andamento vem do relatório bimestral, sem o detalhe de cada conta; os anos fechados vêm da declaração anual. Ao abrir uma linha, a
            conferência mostra o mesmo valor em outra fonte (relatório bimestral, repasses do Estado, governo federal), ano a ano.
          </li>
          <li>Se a obra ou o serviço foi entregue não aparece nesses registros. Para obras, veja a camada de obras no mapa.</li>
        </ul>
      </Secao>
    </>
  );
}
