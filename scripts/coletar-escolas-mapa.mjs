// Coordenadas das escolas que não são locais de votação, porque o INEP não publica coordenadas em arquivo aberto.
// Rode com: npm run coletar:escolas-mapa   (depois: npm run dados)
//
// Usa o Cadastro Nacional de Endereços do Censo 2022 (CNEFE, IBGE), que traz coordenadas de cada endereço e o nome dos
// estabelecimentos de ensino. Procura primeiro pelo endereço informado ao Censo Escolar (rua e número iguais) e depois pelo
// nome da escola no mesmo bairro. Sem correspondência única, a escola fica fora do mapa, mas continua na lista do bairro.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { localizadorDeBairros } from "./lib/bairros.mjs";

const IBGE_MUN = "3534401";
const CACHE = "data/cache/cnefe/3534401_OSASCO.zip";
const URL_CNEFE = "https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/35_SP/3534401_OSASCO.zip";
const CENSO_ESCOLAR = "data/cache/escolas/microdados_censo_escolar_2024.zip";
const DESTINO = "data/territorio/escolas-coordenadas.json";

const dobra = (t) =>
  (t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
// "EMEF PROF ANTONIO DE SOUZA" e "Escola Municipal Professor Antônio de Souza" viram a mesma coisa.
const SIGLAS = /\b(EMEF|EMEI|EMEB|EMESP|EE|EEI|EM|ETEC|FATEC|CEMEI|CEI|CEEJA|CIEJA|ESCOLA|ESTADUAL|MUNICIPAL|CRECHE|COLEGIO|CENTRO|EDUCACIONAL|EDUCACAO|INFANTIL|ENSINO|FUNDAMENTAL|MEDIO|PROF|PROFA|PROFESSOR|PROFESSORA|DR|DRA|DOUTOR|DOUTORA|DE|DA|DO|DAS|DOS|E)\b/g;
const chaveNome = (t) => dobra(t).replace(SIGLAS, " ").replace(/\s+/g, " ").trim();
const TIPOS = /^(RUA|R|AVENIDA|AV|ALAMEDA|AL|TRAVESSA|TV|PRACA|PC|ESTRADA|EST|VIELA|VL|PASSAGEM|LARGO)\b/;
const chaveRua = (t) => dobra(t).replace(TIPOS, "").replace(SIGLAS, " ").replace(/\s+/g, " ").trim();

if (!existsSync(CACHE)) {
  mkdirSync("data/cache/cnefe", { recursive: true });
  const r = await fetch(URL_CNEFE, { headers: { "User-Agent": "avalia-osasco/0.1 (coleta de dados publicos)" } });
  if (!r.ok) throw new Error(`IBGE respondeu ${r.status}`);
  writeFileSync(CACHE, Buffer.from(await r.arrayBuffer()));
}
const csv = unzipSync(new Uint8Array(readFileSync(CACHE)));
const linhas = new TextDecoder("latin1").decode(csv[Object.keys(csv)[0]]).split(/\r?\n/);
const cab = Object.fromEntries(linhas[0].split(";").map((k, i) => [k, i]));

// Endereço de cada escola no Censo Escolar.
const zipEscolar = unzipSync(new Uint8Array(readFileSync(CENSO_ESCOLAR)), { filter: (f) => /microdados_ed_basica_2024\.csv$/i.test(f.name) });
const tabela = new TextDecoder("latin1").decode(zipEscolar[Object.keys(zipEscolar)[0]]);
const fim = tabela.indexOf("\n");
const ce = Object.fromEntries(tabela.slice(0, fim).trim().split(";").map((k, i) => [k, i]));
const enderecos = {};
for (let i = fim + 1, j; (j = tabela.indexOf("\n", i)) >= 0; i = j + 1) {
  const l = tabela.slice(i, j);
  if (!l.includes(`;${IBGE_MUN};`)) continue;
  const c = l.split(";");
  if (c[ce.CO_MUNICIPIO] === IBGE_MUN) enderecos[c[ce.CO_ENTIDADE]] = { rua: c[ce.DS_ENDERECO], numero: c[ce.NU_ENDERECO], cep: c[ce.CO_CEP] };
}

const porEndereco = {};
const ensino = [];
for (const l of linhas.slice(1)) {
  const c = l.split(";");
  if (!c[cab.LATITUDE]) continue;
  const ponto = { lat: Number(c[cab.LATITUDE]), lon: Number(c[cab.LONGITUDE]) };
  const numero = c[cab.NUM_ENDERECO];
  if (numero && numero !== "0") {
    const k = `${chaveRua(`${c[cab.NOM_TITULO_SEGLOGR]} ${c[cab.NOM_SEGLOGR]}`)}|${numero}`;
    (porEndereco[k] ??= []).push(ponto);
    const so = `${chaveRua(c[cab.NOM_SEGLOGR])}|${numero}`;
    if (so !== k) (porEndereco[so] ??= []).push(ponto);
  }
  if (c[cab.COD_ESPECIE] === "4") ensino.push({ k: chaveNome(c[cab.DSC_ESTABELECIMENTO]), ...ponto });
}
// Vários registros do mesmo prédio contam como um ponto só; mais longe que isso (cerca de 300 m), o endereço é ambíguo.
const unico = (pontos) => {
  if (!pontos?.length) return null;
  const [a] = pontos;
  return pontos.every((p) => Math.abs(p.lat - a.lat) + Math.abs(p.lon - a.lon) < 0.003) ? a : null;
};

const { escolas } = JSON.parse(readFileSync("data/territorio/escolas.json", "utf8"));
const localiza = await localizadorDeBairros();
const achadas = {};
const contagem = { endereco: 0, nome: 0, foraDoBairro: 0 };
for (const e of escolas.filter((x) => !x.lat)) {
  const end = enderecos[e.codigo];
  const pelaRua = end?.numero && /^\d+$/.test(end.numero) ? unico(porEndereco[`${chaveRua(end.rua)}|${Number(end.numero)}`]) : null;
  const k = chaveNome(e.nome);
  const peloNome = k.length >= 5 ? unico(ensino.filter((x) => x.k === k && localiza(x.lon, x.lat) === e.bairro)) : null;
  // Rua e número iguais valem mesmo com outro bairro: o bairro do Censo Escolar é escrito pela escola, o do mapa é o oficial.
  const ponto = pelaRua ?? peloNome;
  if (!ponto) continue;
  achadas[e.codigo] = ponto;
  contagem[pelaRua ? "endereco" : "nome"]++;
  if (e.bairro && localiza(ponto.lon, ponto.lat) !== e.bairro) contagem.foraDoBairro++;
}
writeFileSync(DESTINO, `${JSON.stringify({ fonte: "IBGE, Cadastro Nacional de Endereços do Censo 2022 (CNEFE)", url: "https://www.ibge.gov.br/estatisticas/sociais/populacao/38734-cadastro-nacional-de-enderecos-para-fins-estatisticos.html", coletadoEm: new Date().toISOString().slice(0, 10), escolas: achadas }, null, 2)}\n`);
console.log(`${escolas.filter((e) => e.lat).length} com local de votação; ${contagem.endereco} pelo endereço; ${contagem.nome} pelo nome; ${contagem.foraDoBairro} em bairro diferente do declarado`);
console.log(`${escolas.filter((e) => e.lat || achadas[e.codigo]).length} de ${escolas.length} no mapa`);
