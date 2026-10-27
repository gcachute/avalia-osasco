// Geometria dos bairros projetada uma vez, na geração do site: as páginas recebem caminhos SVG prontos.
// Osasco é comprida no sentido norte–sul: a altura é fixa e a largura sai da própria geometria.
import { geoMercator, geoPath, type GeoPath, type GeoProjection } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import geo from "@/data/bairros-geo.json";

export const ALTURA_MAPA = 760;
const MARGEM = 8;

export type Contorno = { id: string; d: string; cx: number; cy: number; distancia: number };

let cache: { largura: number; altura: number; contornos: Contorno[]; projecao: GeoProjection; caminho: GeoPath } | null = null;

export function geometriaBairros() {
  if (cache) return cache;
  const colecao = geo as unknown as FeatureCollection<Geometry, { id: string }>;
  const projecao = geoMercator().fitHeight(ALTURA_MAPA - 2 * MARGEM, colecao);
  const [[x0, y0], [x1]] = geoPath(projecao).bounds(colecao);
  const [tx, ty] = projecao.translate();
  projecao.translate([tx - x0 + MARGEM, ty - y0 + MARGEM]);
  const caminho = geoPath(projecao).digits(1);
  const [cx0, cy0] = caminho.centroid(colecao);
  const contornos = colecao.features.map((f) => {
    const [cx, cy] = caminho.centroid(f);
    return { id: f.properties.id, d: caminho(f) ?? "", cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10, distancia: Math.hypot(cx - cx0, cy - cy0) };
  });
  cache = { largura: Math.ceil(x1 - x0 + 2 * MARGEM), altura: ALTURA_MAPA, contornos, projecao, caminho };
  return cache;
}
