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
  "santa maria", "santo antonio", "sao pedro", "metalurgicos", "veloso", "baronesa", "remedios", "umuarama", "bonanca",
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
  pestana: ["(?:do|no|bairro|jardim|jd\\.?|vila) pestana"],
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

// Documentos que citam uma unidade de saúde ou escola pelo nome ("UBS José Groff", "Hospital Municipal
// Antônio Giglio"), sem dizer o bairro. O bairro vem do cadastro da unidade (CNES e Censo Escolar).
// Para não confundir com nomes de pessoas homenageadas, o tipo do equipamento precisa vir logo antes do nome.
const PREFIXO_EQUIPAMENTO =
  /^(UBS|USF|UNIDADE BASICA DE SAUDE|CENTRO DE SAUDE|PA|PS|UPA|CAPS( AD| IJ| II| III)?|AMA|HOSPITAL|POLICLINICA|EMEF|EMEI|EMEIEF|EE|E E|ESCOLA ESTADUAL|ESCOLA MUNICIPAL|CEMEI|CEU|CRECHE|COLEGIO|ESCOLA|CENTRO DE ESPECIALIDADES|AMBULATORIO)( (DE|DA|DO|DR|DRA|PROF|PROFA|PROFESSOR|PROFESSORA|PE|PADRE|ENSINO FUNDAMENTAL|EDUCACAO INFANTIL))*\s+/;
const TIPO_ANTES =
  /(UBS|USF|UNIDADE BASICA|POSTO DE SAUDE|PRONTO SOCORRO|PRONTO ATENDIMENTO|UPA|HOSPITAL|CAPS|POLICLINICA|AMBULATORIO|ESCOLA|EMEF|EMEI|EMEIEF|CEMEI|CRECHE|COLEGIO| EE | E E |CEU)( [A-Z]+){0,4} $/;
const maiusculo = (s) => ` ${String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim()} `;

export function reconhecedorDeEquipamentos() {
  const ler = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
  const saude = ler("data/territorio/saude.json")?.unidades ?? [];
  const escolas = (ler("data/territorio/escolas.json")?.escolas ?? []).filter((e) => e.rede !== "Privada");
  const equipamentos = [...saude, ...escolas]
    .filter((x) => x.bairro)
    .map((x) => ({ nome: x.nome, bairro: x.bairro, nucleo: ` ${maiusculo(x.nome).trim().replace(PREFIXO_EQUIPAMENTO, "").trim()} ` }))
    .filter((x) => x.nucleo.trim().split(" ").length >= 2 && x.nucleo.trim().length >= 10);
  return (texto) => {
    const t = maiusculo(texto);
    const achados = [];
    for (const e of equipamentos) {
      const i = t.indexOf(e.nucleo);
      if (i >= 0 && TIPO_ANTES.test(t.slice(Math.max(0, i - 45), i + 1)) && !achados.some((a) => a.bairro === e.bairro)) achados.push(e);
    }
    return achados.map(({ nome, bairro }) => ({ nome, bairro }));
  };
}
