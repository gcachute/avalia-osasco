import type { Metadata } from "next";
import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { MapaBairros, type BairroDesenho, type FavelaDesenho, type PontoDesenho } from "@/components/MapaBairros";
import { Secao } from "@/components/ui";
import { dados, dataBR, num } from "@/lib/dados";
import geo from "@/data/bairros-geo.json";
import geoFavelas from "@/data/favelas-geo.json";

export const metadata: Metadata = { title: "Mapa por bairro" };

// Osasco é comprida no sentido norte–sul: a altura é fixa e a largura sai da própria geometria.
const ALTURA = 760;
const MARGEM = 8;

export default function PaginaMapa() {
  const mapa = dados.mapa;
  if (!mapa) return <p className="text-slate-600">Rode npm run coletar:bairros e npm run dados para gerar o mapa.</p>;

  // A projeção é calculada aqui, na geração do site: o navegador recebe os caminhos SVG prontos.
  const colecao = geo as unknown as FeatureCollection<Geometry, { id: string }>;
  const projecao = geoMercator().fitHeight(ALTURA - 2 * MARGEM, colecao);
  const [[x0, y0], [x1]] = geoPath(projecao).bounds(colecao);
  const [tx, ty] = projecao.translate();
  projecao.translate([tx - x0 + MARGEM, ty - y0 + MARGEM]);
  const LARGURA = Math.ceil(x1 - x0 + 2 * MARGEM);
  const caminho = geoPath(projecao).digits(1);
  const [cx0, cy0] = caminho.centroid(colecao);
  const info = new Map(mapa.bairros.map((b) => [b.id, b]));
  const desenhos: BairroDesenho[] = colecao.features.map((f) => {
    const b = info.get(f.properties.id)!;
    const [cx, cy] = caminho.centroid(f);
    return { ...b, d: caminho(f) ?? "", cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10, distancia: Math.hypot(cx - cx0, cy - cy0) };
  });
  const pontos: PontoDesenho[] = mapa.pontos.flatMap((p) => {
    const xy = projecao([p.lon, p.lat]);
    return xy && xy[0] >= 0 && xy[0] <= LARGURA && xy[1] >= 0 && xy[1] <= ALTURA ? [{ ...p, x: Math.round(xy[0] * 10) / 10, y: Math.round(xy[1] * 10) / 10 }] : [];
  });

  const favelas: FavelaDesenho[] = (geoFavelas as unknown as FeatureCollection<Geometry, { codigo: string; nome: string; moradores: number }>).features.map((f) => ({
    ...f.properties,
    d: caminho(f) ?? "",
  }));

  // ---------- achados (calculados com os dados, não escritos à mão) ----------
  const habitados = mapa.bairros.filter((b) => b.censo && !b.censo.poucosMoradores && b.censo.rendaMedia != null);
  const porRenda = habitados.slice().sort((a, b) => a.censo!.rendaMedia! - b.censo!.rendaMedia!);
  const quarto = Math.max(1, Math.floor(porRenda.length / 4));
  const taxa = (lista: typeof habitados) => (lista.reduce((a, b) => a + b.citacoes, 0) / lista.reduce((a, b) => a + b.censo!.pessoas, 0)) * 1e4;
  const pobres = porRenda.slice(0, quarto);
  const ricos = porRenda.slice(-quarto);
  const menosEsgoto = habitados.filter((b) => b.censo!.esgoto != null).sort((a, b) => a.censo!.esgoto! - b.censo!.esgoto!)[0];
  const menor = (k: "calcada" | "bueiro" | "iluminacao") => habitados.filter((b) => b.censo![k] != null).sort((a, b) => a.censo![k]! - b.censo![k]!)[0];
  const semCalcada = menor("calcada");
  const semBueiro = menor("bueiro");
  // Saúde: bairro mais populoso sem nenhuma unidade do SUS cadastrada.
  const semUnidade = habitados.filter((b) => !b.saude?.length).sort((a, b) => b.censo!.pessoas - a.censo!.pessoas);
  const maisCrime = habitados.filter((b) => b.seguranca).sort((a, b) => b.seguranca!.roubos.n - a.seguranca!.roubos.n)[0];

  const semCitacao = mapa.bairros.filter((b) => b.citacoes === 0);
  const popSem = semCitacao.reduce((a, b) => a + (b.censo?.pessoas ?? b.populacao ?? 0), 0);
  const unidadesSus = mapa.bairros.reduce((a, b) => a + (b.saude?.length ?? 0), 0);
  const escolasPublicas = mapa.bairros.reduce((a, b) => a + (b.escolas?.filter((e) => e.rede !== "Privada").length ?? 0), 0);

  const achados = [
    habitados.length > 8 && {
      rotulo: "Renda × atenção",
      texto: `Nos ${quarto} bairros mais pobres saíram ${num(taxa(pobres), 1)} documentos por 10 mil moradores; nos ${quarto} mais ricos, ${num(taxa(ricos), 1)}.`,
    },
    menosEsgoto && {
      rotulo: "Saneamento",
      texto: `${menosEsgoto.nome} tem só ${num(menosEsgoto.censo!.esgoto!, 0)}% das casas na rede de esgoto (Osasco: ${num(mapa.cidade?.esgoto ?? 0, 0)}%) e foi citado em ${menosEsgoto.citacoes} ${menosEsgoto.citacoes === 1 ? "documento" : "documentos"}.`,
    },
    semCalcada &&
      semBueiro && {
        rotulo: "Rua",
        texto: `Em ${semCalcada.nome}, só ${num(semCalcada.censo!.calcada!, 0)}% das casas têm calçada na quadra (Osasco: ${num(mapa.cidade?.calcada ?? 0, 0)}%). Bueiro, o pior é ${semBueiro.nome}: ${num(semBueiro.censo!.bueiro!, 0)}% (Osasco: ${num(mapa.cidade?.bueiro ?? 0, 0)}%).`,
      },
    semUnidade.length > 0 && {
      rotulo: "Saúde",
      texto: `${semUnidade.length} bairros com moradores não têm nenhuma unidade do SUS cadastrada; o maior é ${semUnidade[0].nome}, com ${semUnidade[0].censo!.pessoas.toLocaleString("pt-BR")} moradores. Osasco tem ${num((unidadesSus / (mapa.cidade?.pessoas ?? 1)) * 1e4, 1)} unidades por 10 mil habitantes.`,
    },
    maisCrime && {
      rotulo: "Segurança",
      texto: `${maisCrime.nome} teve ${maisCrime.seguranca!.roubos.n.toLocaleString("pt-BR")} roubos registrados em ${mapa.anoSeguranca}, o maior número entre os bairros com moradores.`,
    },
  ].filter(Boolean) as { rotulo: string; texto: string; href?: string }[];

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-7 sm:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-100 opacity-60 blur-3xl" aria-hidden />
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
            ].map((c) => (
              <div key={c.t} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">{c.t}</dt>
                <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{c.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {achados.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {achados.map((a) => {
            const corpo = (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-800">{a.rotulo}</div>
                <p className="mt-1 text-sm text-slate-700">{a.texto}</p>
              </>
            );
            return a.href ? (
              <Link key={a.rotulo} href={a.href} className="revelar rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                {corpo}
              </Link>
            ) : (
              <div key={a.rotulo} className="revelar rounded-2xl border border-slate-200 bg-white p-4">
                {corpo}
              </div>
            );
          })}
        </div>
      )}

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
          anoSeguranca={mapa.anoSeguranca ?? null}
        />
      </div>

      <Secao titulo="Como ler o mapa">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
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
        </ul>
      </Secao>
    </>
  );
}
