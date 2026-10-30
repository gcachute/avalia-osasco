import type { Metadata } from "next";
import Link from "next/link";
import { ComposicaoEntradas, GastosPorAno } from "@/components/Dinheiro";
import { QuemMandou } from "@/components/dinheiro/Emendas";
import { ConferenciasIntegridade } from "@/components/dinheiro/Integridade";
import { GraficoLinha } from "@/components/GraficoLinha";
import { Cartao, Secao } from "@/components/ui";
import { dados, dataBR } from "@/lib/dados";
import bruto from "@/data/dinheiro.json";
import { nomeProprio, type PaginaDinheiro } from "@/lib/dinheiro";
import { dinheiroCurto } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Dinheiro de fora",
  description: "Quanto a União e o Estado mandam para Osasco, quais deputados e senadores mandaram emendas, com quem a Prefeitura gastou esse dinheiro e o que a conferência de integridade encontrou.",
};

const dinheiro = bruto as unknown as PaginaDinheiro;

export default function PaginaDinheiro() {
  const { entradas, emendas, vereadores, pixEstaduais, gastos, fontes, convenios, integridade } = dinheiro;
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
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-balance text-slate-900">Dinheiro de fora</h1>
        <p className="mt-2 text-slate-600">
          Quanto a União e o Estado mandam para Osasco e por qual motivo, quem mandou cada emenda, com quem a Prefeitura gastou esse dinheiro e o que a
          conferência nas listas oficiais de punidos encontrou. Tudo a partir dos registros oficiais, com o link de cada fonte.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cartao titulo={`Da União em ${ultimo.ano}`} valor={dinheiroCurto(ultimo.uniao.total)} detalhe="FPM, SUS, educação, convênios" />
        <Cartao titulo={`Do Estado em ${ultimo.ano}`} valor={dinheiroCurto(ultimo.estado.total)} detalhe="ICMS, IPVA, SUS, convênios" />
        <Cartao titulo={`FUNDEB em ${ultimo.ano}`} valor={dinheiroCurto(ultimo.fundeb)} detalhe="fundo da educação básica" />
        <Cartao titulo={`Emendas federais em ${anoEmendas}`} valor={dinheiroCurto(recebidoUltimo)} detalhe={`${dinheiroCurto(totalEmendas)} desde ${anosRecebido[0]}`} />
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
            Valores brutos, sem correção pela inflação. O ano de {ultimo.ano + 1} entra quando a Prefeitura entregar as contas anuais.
          </p>
        </div>
        <div className="mt-4">
          <ComposicaoEntradas anos={entradas} />
        </div>
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
          .
        </p>
      </Secao>

      <Secao
        titulo="Quem mandou emendas"
        id="quem-mandou"
        subtitulo="Cada político com o valor que de fato chegou à Prefeitura e aos fundos municipais. Toque no nome para abrir a ficha; abra as emendas para ver o detalhe de cada uma, até as compras que ela pagou."
      >
        <QuemMandou autores={emendas.autores} vereadores={vereadores} porPartido={emendas.porPartido} />

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

      <Secao titulo="Nos bairros" id="nos-bairros" subtitulo="Emendas, convênios e pagamentos cujo texto oficial cita o nome do bairro, uma escola ou uma unidade de saúde dele.">
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
            Emendas aparecem pelo valor que chegou a Osasco, não pelo valor prometido. O partido mostrado em cada emenda é o do autor quando ela foi
            apresentada (em novembro do ano anterior); o da ficha é o de hoje.
          </li>
          <li>
            O rastro até a nota aparece quando o histórico do pagamento, escrito pela Prefeitura, cita o número da emenda. Quando não cita, dá para ver com
            quem a área gastou, mas não qual nota cada emenda pagou.
          </li>
          <li>Se a obra ou o serviço foi entregue não aparece nesses registros. Para obras, veja a camada de obras no mapa.</li>
        </ul>
      </Secao>
    </>
  );
}
