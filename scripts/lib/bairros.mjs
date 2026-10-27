// Bairros oficiais de Osasco (IBGE, Censo 2022) e reconhecimento de bairros citados em textos
// (ementas de projetos, moções, requerimentos, leis).
import { existsSync, readFileSync } from "node:fs";

const dobra = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[’'`´]/g, "'")
    .toLowerCase();

// Prefixos que, antes de um nome, indicam que se trata de um lugar.
const LUGAR = "(?:jardim|jd\\.?|vila|vl\\.?|parque|pq\\.?|bairro|bairros|conjunto|residencial|cidade|regiao d[oa])\\s+(?:d[aoe]s?\\s+)?";

// Nomes que também são palavras comuns, santos ou rodovias: só contam com um prefixo de lugar.
const AMBIGUOS = new Set([
  "alianca", "bandeiras", "bela vista", "bonfim", "castelo branco", "centro", "padroeira", "platina", "raposo tavares", "santa fe",
  "santa maria", "santo antonio", "sao pedro", "metalurgicos", "pestana", "veloso", "baronesa", "remedios", "umuarama", "bonanca",
]);

// Grafias alternativas encontradas nos documentos.
const VARIANTES = {
  quintauna: ["quitauna", "quintauna"],
  rochdale: ["rochdale", "rochdalle", "rochdalle"],
  "km 18": ["km 18", "km18", "quilometro 18"],
  iapi: ["iapi", "conjunto iapi", "i a p i"],
  "jardim d'abril": ["jardim d'abril", "jardim d abril", "jardim dabril", "jd\\.? d'abril"],
  "portal d'oeste": ["portal d'oeste", "portal do oeste", "portal d oeste", "portal doeste"],
  "jardim novo osasco": ["(?:jardim |jd\\.? )?novo osasco"],
  "jardim conceicao": ["jardim conceicao", "jd\\.? conceicao", "bairro conceicao"],
  "vila menck": ["vila menck", "vila menk", "vl\\.? menck"],
  "vila campesina": ["vila campesina", "bairro campesina"],
  "munhoz junior": ["munhoz junior", "munhoz jr\\.?"],
  "city bussocaba": ["city bussocaba"],
  "cidade de deus": ["cidade de deus"],
  "setor militar": ["setor militar"],
  "vila militar": ["vila militar"],
  "industrial remedios": ["industrial remedios", "industrial dos remedios"],
};

export function carregarBairros() {
  if (!existsSync("data/bairros.json")) return null;
  return JSON.parse(readFileSync("data/bairros.json", "utf8"));
}

// Monta um reconhecedor para a lista de bairros. Nomes mais longos primeiro, para
// "City Bussocaba" não virar também "Bussocaba", e "Industrial Remédios" não virar "Remédios".
export function reconhecedorDeBairros(bairros) {
  const regras = bairros
    .map((b) => {
      const chave = dobra(b.nome);
      const formas = VARIANTES[chave] ?? [chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")];
      const nucleo = `(?:${formas.join("|")})`;
      const prefixo = AMBIGUOS.has(chave) ? LUGAR : `(?:${LUGAR})?`;
      return { id: b.id, tam: chave.length, re: new RegExp(`(?<![\\p{L}\\d])${prefixo}${nucleo}(?![\\p{L}\\d])`, "gu") };
    })
    .sort((a, b) => b.tam - a.tam);

  return (texto) => {
    let t = dobra(texto);
    const achados = new Set();
    for (const r of regras) {
      t = t.replace(r.re, (m) => {
        achados.add(r.id);
        return " ".repeat(m.length);
      });
    }
    return [...achados];
  };
}

// Localiza um ponto (longitude, latitude) no bairro oficial do IBGE que o contém, usando a malha
// completa (sem simplificação). Pontos fora de qualquer bairro devolvem null.
export async function localizadorDeBairros() {
  const { unzipSync } = await import("fflate");
  const { lerShapefile } = await import("./shp.mjs");
  const zip = unzipSync(new Uint8Array(readFileSync("data/cache/SP_bairros_CD2022.zip")));
  const slug = (s) => dobra(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const areas = lerShapefile(zip["SP_bairros_CD2022.shp"], zip["SP_bairros_CD2022.dbf"])
    .filter((f) => String(f.properties.CD_MUN) === "3534401")
    .map((f) => {
      const poligonos = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      const pts = poligonos.flat(2);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return { id: slug(f.properties.NM_BAIRRO), poligonos, caixa: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
    });
  const dentroDoAnel = (x, y, anel) => {
    let dentro = false;
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const [xi, yi] = anel[i], [xj, yj] = anel[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  };
  return (lon, lat) => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    for (const a of areas) {
      const [x0, y0, x1, y1] = a.caixa;
      if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
      for (const [externo, ...buracos] of a.poligonos)
        if (dentroDoAnel(lon, lat, externo) && !buracos.some((b) => dentroDoAnel(lon, lat, b))) return a.id;
    }
    return null;
  };
}
