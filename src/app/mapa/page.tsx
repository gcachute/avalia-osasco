import type { Metadata } from "next";
import { MapaBairros } from "@/components/MapaBairros";
import { ComoLer } from "@/components/ui";
import { dados, dataBR, num } from "@/lib/dados";
import { dadosDoMapaCompleto } from "@/lib/mapaGeo";

export const metadata: Metadata = { title: "Mapa por bairro" };

export default async function PaginaMapa() {
  const mapa = dados.mapa;
  if (!mapa) return <p className="text-slate-600">O mapa está indisponível no momento.</p>;

  const { largura: LARGURA, altura: ALTURA, bairros: desenhos, pontos, favelas, projecao } = await dadosDoMapaCompleto(mapa);

  const semCitacao = mapa.bairros.filter((b) => b.citacoes === 0);
  const popSem = semCitacao.reduce((a, b) => a + (b.censo?.pessoas ?? b.populacao ?? 0), 0);
  const unidadesSus = mapa.bairros.reduce((a, b) => a + (b.saude?.length ?? 0), 0);
  const escolasPublicas = mapa.bairros.reduce((a, b) => a + (b.escolas?.filter((e) => e.rede !== "Privada").length ?? 0), 0);


  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-7">
        <div className="relative">
          <p className="text-sm font-medium text-blue-800">Mapa de Osasco</p>
          <h1 className="mt-1 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Onde a política chega em cada bairro</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Documentos da Câmara e da Prefeitura que citam cada bairro, ao lado do retrato oficial de quem mora lá: renda, saneamento, rua, favelas,
            escolas, saúde, segurança, obras e como o bairro votou em 2024. Aperte o play para ver a legislatura acontecer mês a mês.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { t: "Bairros oficiais", v: mapa.bairros.length.toLocaleString("pt-BR") },
              { t: "Moradores (Censo 2022)", v: `${Math.round((mapa.cidade?.pessoas ?? 0) / 1000).toLocaleString("pt-BR")} mil` },
              { t: "Documentos com bairro", v: mapa.itens.length.toLocaleString("pt-BR") },
              { t: "Moradores em bairros nunca citados", v: `${Math.round(popSem / 1000).toLocaleString("pt-BR")} mil` },
              { t: "Unidades de saúde SUS", v: unidadesSus.toLocaleString("pt-BR") },
              { t: "Escolas públicas", v: escolasPublicas.toLocaleString("pt-BR") },
              { t: "Moradores em favelas e comunidades", v: `${num(mapa.cidade?.favelas ?? 0, 0)}%` },
              { t: `Ocorrências policiais em ${mapa.anoSeguranca ?? ""}`, v: Math.round(mapa.bairros.reduce((a, b) => a + Object.values(b.seguranca ?? {}).reduce((x, g) => x + g.n, 0), 0)).toLocaleString("pt-BR") },
            ].map((c, i) => (
              // No celular ficam só os quatro primeiros, para o mapa aparecer logo.
              <div key={c.t} className={`rounded-xl bg-slate-50 p-3 ${i >= 4 ? "max-sm:hidden" : ""}`}>
                <dt className="text-xs text-slate-500">{c.t}</dt>
                <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{c.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mt-6">
        <MapaBairros
          bairros={desenhos}
          itens={mapa.itens}
          pontos={pontos}
          largura={LARGURA}
          altura={ALTURA}
          inicio={dados.periodo.inicio}
          fim={dados.periodo.fim}
          cidade={mapa.cidade}
          votosVereador={mapa.votosVereador}
          vereadores={dados.vereadores.map((v) => ({ id: v.id, nome: v.nome }))}
          favelas={favelas}
          projecao={projecao}
          historico={dados.historico}
          anoSeguranca={mapa.anoSeguranca ?? null}
        />
      </div>

      <ComoLer>
          <li>
            <b>Documentos:</b> um documento conta para um bairro quando o texto cita o nome dele (ou uma grafia conhecida, como Quitaúna e
            Rochdalle). Nomes que também são palavras comuns, como Aliança ou Santo Antônio, só contam quando vêm com Jardim, Vila ou Bairro. A
            maioria dos projetos vale para a cidade inteira e não aparece aqui.
          </li>
          <li>
            <b>Censo 2022:</b> os números são do IBGE, já somados por bairro. Renda é o rendimento médio da pessoa responsável pelo domicílio. Os
            itens de rua (asfalto, bueiro, calçada, árvores) foram observados pelo IBGE na quadra de cada casa. Bairros com menos de{" "}
            {mapa.minimoMoradores} moradores, quase todos industriais, ficam sem porcentagem.
          </li>
          <li>
            <b>Eleição 2024:</b> votos somados pelos locais de votação de cada bairro. O eleitor vota na seção onde se cadastrou, que nem sempre
            fica no bairro onde mora, e há bairros sem local de votação.
          </li>
          <li>
            <b>Saúde e escolas:</b> unidades que atendem pelo SUS no CNES, com a localização informada ao Ministério da Saúde. Escolas em
            funcionamento no Censo Escolar 2024, ligadas ao bairro pelo endereço. O IDEB é o de 2025 (ou 2023, quando a escola não teve nota em
            2025). No mapa só aparecem as escolas que também são locais de votação, porque o INEP não publica coordenadas.
          </li>
          <li>
            <b>Segurança:</b> boletins de ocorrência de {mapa.anoSeguranca} da Secretaria da Segurança Pública, contados pelo local do fato. As taxas
            são por morador: em áreas de comércio e passagem, como o Centro, ficam altas porque muita gente circula e pouca gente mora. Nenhum
            endereço de ocorrência é mostrado.
          </li>
          <li>
            <b>Favelas e comunidades urbanas:</b> áreas delimitadas pelo IBGE no Censo 2022. <b>Obras:</b> contratos acompanhados pelo Painel de
            Obras do TCE-SP cujo objeto cita o bairro.
          </li>
          <li>Indicações (pedidos de asfalto, poda, iluminação) trazem rua e bairro, mas a Câmara só as publica numa busca com captcha. Quando elas entrarem, o mapa fica bem mais completo.</li>
          <li>
            Período dos documentos: {dataBR(dados.periodo.inicio)} a {dataBR(dados.periodo.fim)}. Fontes:{" "}
            {[{ nome: mapa.fonte, url: "https://www.ibge.gov.br/" }, ...mapa.fontes].map((f, k, l) => (
              <span key={f.nome}>
                <a href={f.url} className="underline">
                  {f.nome}
                </a>
                {k < l.length - 1 ? "; " : "."}
              </span>
            ))}
          </li>
      </ComoLer>
    </>
  );
}
