import type { Metadata } from "next";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { MapaBairros, type BairroDesenho } from "@/components/MapaBairros";
import { Secao } from "@/components/ui";
import { dados, dataBR } from "@/lib/dados";
import geo from "@/data/bairros-geo.json";

export const metadata: Metadata = { title: "Mapa por bairro" };

// Osasco é comprida no sentido norte–sul: a altura é fixa e a largura sai da própria geometria.
const ALTURA = 760;
const MARGEM = 8;

export default function PaginaMapa() {
  const mapa = dados.mapa;
  if (!mapa) return <p className="text-slate-600">Rode npm run coletar:bairros e npm run dados para gerar o mapa.</p>;

  // A projeção é calculada aqui, na geração do site: o navegador só recebe os caminhos SVG prontos.
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
    return {
      id: b.id,
      nome: b.nome,
      populacao: b.populacao,
      d: caminho(f) ?? "",
      cx: Math.round(cx * 10) / 10,
      cy: Math.round(cy * 10) / 10,
      area: Math.round(caminho.area(f)),
      distancia: Math.hypot(cx - cx0, cy - cy0),
    };
  });

  const citados = mapa.bairros.filter((b) => b.citacoes > 0).length;
  const semCitacao = mapa.bairros.filter((b) => b.citacoes === 0);
  const popSem = semCitacao.reduce((a, b) => a + (b.populacao ?? 0), 0);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-7 sm:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-100 opacity-60 blur-3xl" aria-hidden />
        <div className="relative max-w-3xl">
          <p className="text-sm font-medium text-blue-800">Mapa de Osasco</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Onde a política chega em cada bairro</h1>
          <p className="mt-3 text-slate-600">
            Projetos de lei, moções, pedidos de informação, leis sancionadas, vetos e decretos que citam um bairro pelo nome, nos documentos oficiais
            lidos nas sessões da Câmara. Aperte o play para ver a legislatura acontecer mês a mês.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { t: "Bairros oficiais", v: mapa.bairros.length.toString() },
              { t: "Citados ao menos uma vez", v: citados.toString() },
              { t: "Documentos com bairro", v: mapa.itens.length.toString() },
              { t: "Moradores em bairros nunca citados", v: `${Math.round(popSem / 1000).toLocaleString("pt-BR")} mil` },
            ].map((c) => (
              <div key={c.t} className="rounded-xl bg-slate-50 p-3">
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
          largura={LARGURA}
          altura={ALTURA}
          inicio={dados.periodo.inicio}
          fim={dados.periodo.fim}
        />
      </div>

      <Secao titulo="Como ler o mapa">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Os limites e a população são os bairros oficiais do IBGE no Censo 2022. Um documento conta para um bairro quando o texto cita o nome dele
            (ou uma grafia conhecida, como Quitaúna e Rochdalle). Nomes que também são palavras comuns, como Aliança ou Santo Antônio, só contam
            quando vêm com Jardim, Vila ou Bairro.
          </li>
          <li>
            A maioria dos projetos vale para a cidade inteira e não aparece aqui. O mapa mostra só o que é dirigido a um lugar: nome de praça, obra
            pedida, homenagem a um morador ou entidade do bairro.
          </li>
          <li>
            Indicações (pedidos de asfalto, poda, iluminação) trazem rua e bairro, mas a Câmara só as publica numa busca com captcha. Quando elas
            entrarem, o mapa fica bem mais completo.
          </li>
          <li>
            Período: {dataBR(dados.periodo.inicio)} a {dataBR(dados.periodo.fim)}. Fonte: {mapa.fonte}, e planilhas oficiais das sessões da Câmara.
          </li>
        </ul>
      </Secao>
    </>
  );
}
