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

// Ruas, córregos e lugares com nome (data/territorio/lugares.json, do OpenStreetMap): devolve todos os bairros por onde
// passa cada um que o texto cita. "R. XV de Novembro", "Rua 15 de Novembro" e "Rua Quinze de Novembro" são a mesma rua.
const NUMEROS = ["", "UM", "DOIS", "TRES", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE", "DEZ", "ONZE", "DOZE", "TREZE", "QUATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE", "VINTE", "VINTE E UM", "VINTE E DOIS", "VINTE E TRES", "VINTE E QUATRO", "VINTE E CINCO", "VINTE E SEIS", "VINTE E SETE", "VINTE E OITO", "VINTE E NOVE", "TRINTA", "TRINTA E UM"];
const ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI"];
const ABREVIACOES = [
  [/ R /g, " RUA "],
  [/ AV /g, " AVENIDA "],
  [/ ESTR /g, " ESTRADA "],
  [/ TRAV /g, " TRAVESSA "],
  [/ TV /g, " TRAVESSA "],
  [/ AL /g, " ALAMEDA "],
  [/ PCA /g, " PRACA "],
  [/ CORR /g, " CORREGO "],
  [/ PRIMEIRO /g, " 1 "],
  [/ 1O /g, " 1 "],
];
const formaLugar = (s) => {
  let t = maiusculo(s);
  for (const [re, por] of ABREVIACOES) t = t.replace(re, por);
  // Números por extenso (os compostos primeiro) e romanos viram algarismos, só antes de "DE" (datas: "XV DE NOVEMBRO").
  for (let n = 31; n >= 1; n--) t = t.replace(new RegExp(` (${NUMEROS[n]}|${ROMANOS[n]}) DE `, "g"), ` ${n} DE `);
  return t;
};
const GENERICOS = /^ (RUA|AVENIDA|TRAVESSA|ESTRADA|ALAMEDA|PRACA|VIELA|PASSAGEM|ACESSO|RUA PARTICULAR|ESCOLA|IGREJA|CRECHE|PADARIA|MERCADO|FARMACIA|BAR|LANCHONETE|ESTACIONAMENTO|POSTO|ACADEMIA|SALAO)( [A-Z0-9]{1,2})? $/;

export function reconhecedorDeLugares() {
  if (!existsSync("data/territorio/lugares.json")) return () => [];
  const lugares = JSON.parse(readFileSync("data/territorio/lugares.json", "utf8"))
    .lugares.map((l) => ({ ...l, forma: formaLugar(l.nome) }))
    // Nomes curtos ou genéricos ("Rua A", "Escola", "Praça 1") confundem mais do que ajudam.
    .filter((l) => l.forma.trim().length >= 10 && l.forma.trim().split(" ").length >= 2 && !GENERICOS.test(l.forma))
    // Lugares (prédios, praças, comércios) precisam de nome com 3 palavras ou mais.
    .filter((l) => l.tipo !== "lugar" || l.forma.trim().split(" ").length >= 3)
    .sort((a, b) => b.forma.length - a.forma.length);
  return (texto) => {
    let t = formaLugar(texto);
    const achados = [];
    for (const l of lugares) {
      const i = t.indexOf(l.forma);
      if (i < 0) continue;
      achados.push({ nome: l.nome, tipo: l.tipo, bairros: l.bairros });
      // Apaga o trecho achado, para "Rua Pedro Rissato" não casar também com um lugar "Pedro Rissato".
      t = t.slice(0, i) + " ".repeat(l.forma.length) + t.slice(i + l.forma.length);
    }
    return achados;
  };
}

// Endereços com número ("Rua Newton Estilac Leal, nº 643"): a chave normalizada serve para achar o bairro do número no
// cadastro de endereços (data/territorio/enderecos.json, preenchido por scripts/coletar-lugares.mjs).
const RE_ENDERECO = /(?:^| )((?:RUA|AVENIDA|ESTRADA|TRAVESSA|ALAMEDA|PRACA) [A-Z ]{3,60}?) (?:N |NO |NUMERO )?(\d{1,5})(?= |$)/g;
export function enderecosDe(texto) {
  const t = formaLugar(texto);
  return [...t.matchAll(RE_ENDERECO)]
    .map((m) => ({ rua: m[1].trim(), numero: m[2], chave: `${m[1].trim()} ${m[2]}` }))
    // "S N" (sem número), cidade ou código de contrato no meio do nome: não é um endereço com número.
    .filter((e) => !/ S N( |$)| OSASCO | SP | CT$| CONTRATO$| PROCESSO$/.test(` ${e.rua} `) && e.rua.split(" ").length <= 7);
}

// Localiza o texto nos bairros, do mais preciso para o menos preciso:
// 1. endereço com número achado no cadastro de endereços: só o bairro daquele número (e escolas ou unidades de saúde citadas);
// 2. bairro citado pelo nome junto de uma rua que passa por ele ("Av. dos Autonomistas - Vila Yara"): só esse bairro;
// 3. rua, córrego ou lugar sem mais nada: todos os bairros por onde passa.
export function localizadorDeTexto({ acha, achaEquipamento, achaLugares }) {
  const cadastro = existsSync("data/territorio/enderecos.json") ? JSON.parse(readFileSync("data/territorio/enderecos.json", "utf8")).enderecos : {};
  // "jaCitados": bairros já achados no texto completo (o texto guardado dos pagamentos é cortado em 240 caracteres).
  return (texto, jaCitados = []) => {
    if (!texto) return { bairros: [...jaCitados], via: [] };
    const equipamentos = achaEquipamento(texto).map((e) => e.bairro);
    const enderecos = enderecosDe(texto).filter((e) => cadastro[e.chave]?.bairro);
    if (enderecos.length) {
      const bairros = [...new Set([...enderecos.map((e) => cadastro[e.chave].bairro), ...equipamentos])];
      return { bairros, via: enderecos.map((e) => `${titulo(e.rua)}, ${e.numero}`) };
    }
    const nomeados = new Set([...acha(texto), ...equipamentos, ...jaCitados]);
    const bairros = new Set(nomeados);
    const via = [];
    for (const l of achaLugares(texto)) {
      const naRua = l.bairros.filter((b) => nomeados.has(b));
      if (naRua.length) via.push(`${l.nome} (só ${naRua.length === 1 ? "o trecho no bairro citado" : "os trechos nos bairros citados"})`);
      else {
        l.bairros.forEach((b) => bairros.add(b));
        via.push(l.nome);
      }
    }
    return { bairros: [...bairros], via };
  };
}
const titulo = (s) => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()).replace(/ (De|Da|Do|Dos|Das|E) /g, (m) => m.toLowerCase());
