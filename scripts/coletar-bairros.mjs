// Limites e população dos bairros oficiais de Osasco (IBGE, Censo 2022).
// Gera data/bairros.json (lista com população) e src/data/bairros-geo.json (geometria simplificada para o mapa).
import { readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { emCache } from "./lib/baixar.mjs";
import { lerShapefile } from "./lib/shp.mjs";
import { readWorkbook } from "./lib/xlsx.mjs";

const MUNICIPIO = "3534401";
const BASE = "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/";
const URL_MALHA = BASE + "bairros/shp/UF/SP_bairros_CD2022.zip";
const URL_POP = BASE + "tabelas_complementares/Populacao_residente_por_bairros_sexo_idade.xlsx";

const zip = unzipSync(new Uint8Array(readFileSync(await emCache(URL_MALHA, "SP_bairros_CD2022.zip"))));
const features = lerShapefile(zip["SP_bairros_CD2022.shp"], zip["SP_bairros_CD2022.dbf"]).filter((f) => String(f.properties.CD_MUN) === MUNICIPIO);

// População total por bairro: código do bairro na 6ª coluna, total na 7ª.
const populacao = {};
for (const aba of readWorkbook(readFileSync(await emCache(URL_POP, "Populacao_residente_por_bairros.xlsx"))))
  for (const linha of aba.rows) if (/^\d{10}$/.test(linha[5] ?? "") && linha[5].startsWith(MUNICIPIO)) populacao[linha[5]] = Number(linha[6]) || 0;

// Simplificação Douglas-Peucker (tolerância em graus, ~12 m) e 5 casas decimais (~1 m): o arquivo fica leve para o navegador.
const TOL = 0.00012;
function simplifica(pts) {
  if (pts.length < 5) return pts;
  const manter = new Uint8Array(pts.length);
  manter[0] = manter[pts.length - 1] = 1;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop();
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1e-12;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / len;
      if (d > max) (max = d), (idx = i);
    }
    if (max > TOL) {
      manter[idx] = 1;
      pilha.push([a, idx], [idx, b]);
    }
  }
  const out = pts.filter((_, i) => manter[i]);
  return out.length >= 4 ? out : pts;
}
const arredonda = (anel) => simplifica(anel).map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);
const slug = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const bairros = features
  .map((f) => ({ id: slug(f.properties.NM_BAIRRO), codigo: f.properties.CD_BAIRRO, nome: f.properties.NM_BAIRRO, populacao: populacao[f.properties.CD_BAIRRO] ?? null }))
  .sort((a, b) => a.nome.localeCompare(b.nome));

const geo = {
  type: "FeatureCollection",
  features: features.map((f) => {
    const g = f.geometry;
    const coordinates = g.type === "Polygon" ? g.coordinates.map(arredonda) : g.coordinates.map((p) => p.map(arredonda));
    return { type: "Feature", properties: { id: slug(f.properties.NM_BAIRRO) }, geometry: { type: g.type, coordinates } };
  }),
};

writeFileSync(
  "data/bairros.json",
  JSON.stringify({ fonte: "IBGE, Censo Demográfico 2022: malha de bairros e população residente por bairro", url: BASE, bairros }, null, 1),
);
writeFileSync("src/data/bairros-geo.json", JSON.stringify(geo));
console.log(`${bairros.length} bairros, população total ${bairros.reduce((a, b) => a + (b.populacao ?? 0), 0).toLocaleString("pt-BR")}`);
