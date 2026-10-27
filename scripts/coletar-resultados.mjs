// Pilar D (resultados para o cidadão): baixa para data/resultados/
//  - IDEB dos anos iniciais da rede municipal (INEP)
//  - óbitos infantis (SIM) e nascidos vivos (SINASC) por município de residência (DataSUS/TabNet)
// de Osasco e das cidades pares. Rode com: npm run coletar:resultados   (depois: npm run dados)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { readWorkbook } from "./lib/xlsx.mjs";
import { baixar, emCache, sleep } from "./lib/baixar.mjs";

const pares = JSON.parse(readFileSync("data/pares.json", "utf8"));
const EDICAO_IDEB = Number(process.env.EDICAO_IDEB ?? 2025);
// Desde 2015, para a série histórica; o pilar usa só os anos do mandato.
const ANOS_SAUDE = Array.from({ length: new Date().getFullYear() - 2015 }, (_, i) => 2015 + i);
mkdirSync("data/resultados", { recursive: true });

// ---------- IDEB ----------
const urlIdeb = `https://download.inep.gov.br/ideb/resultados/divulgacao_anos_iniciais_municipios_${EDICAO_IDEB}.zip`;
const zip = unzipSync(readFileSync(await emCache(urlIdeb, `ideb_ai_municipios_${EDICAO_IDEB}.zip`)), { filter: (f) => f.name.endsWith(".xlsx") });
const linhas = readWorkbook(Buffer.from(Object.values(zip)[0]))[0].rows;
const cab = linhas.find((r) => r.includes("CO_MUNICIPIO"));
const col = (nome) => cab.indexOf(nome);
const anosIdeb = cab.map((c) => c.match(/^VL_OBSERVADO_(\d{4})$/)?.[1]).filter(Boolean).map(Number);
const ideb = {};
for (const r of linhas) {
  const ibge = Number(r[col("CO_MUNICIPIO")]);
  if (!pares.cidades.some((c) => c.ibge === ibge) || r[col("REDE")] !== "Municipal") continue;
  ideb[ibge] = Object.fromEntries(anosIdeb.map((a) => [a, Number(r[col(`VL_OBSERVADO_${a}`)]) || null]));
}
writeFileSync("data/resultados/ideb.json", JSON.stringify({ edicao: EDICAO_IDEB, rede: "Municipal", etapa: "Anos iniciais do ensino fundamental", fonte: urlIdeb, coletadoEm: new Date().toISOString(), cidades: ideb }, null, 1));
console.log(`IDEB ${EDICAO_IDEB}: ${Object.keys(ideb).length} cidades`);

// ---------- Mortalidade infantil (TabNet) ----------
// O TabNet usa o código IBGE de 6 dígitos (sem o dígito verificador).
async function tabnet(def, incremento, arquivo) {
  const corpo = new URLSearchParams({ Linha: "Município", Coluna: "--Não-Ativa--", Incremento: incremento, Arquivos: arquivo, formato: "prn", mostre: "Mostra" });
  // O formulário do TabNet espera ISO-8859-1.
  const latin1 = corpo.toString().replace(/%([0-9A-F]{2})%([0-9A-F]{2})/g, (m, a, b) => {
    const ch = Buffer.from([parseInt(a, 16), parseInt(b, 16)]).toString("utf8");
    return ch.length === 1 && ch.charCodeAt(0) < 256 ? "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0") : m;
  });
  const res = await baixar(`http://tabnet.datasus.gov.br/cgi/tabcgi.exe?${def}`, { method: "POST", body: latin1, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  const html = new TextDecoder("latin1").decode(await res.arrayBuffer());
  const pre = html.match(/<PRE>([\s\S]*?)<\/PRE>/i)?.[1];
  if (!pre) throw new Error(`TabNet sem tabela para ${def} ${arquivo}`);
  const valores = {};
  for (const m of pre.matchAll(/"(\d{6}) [^"]*";(\d+)/g)) valores[m[1]] = Number(m[2]);
  await sleep(1500);
  return valores;
}

const saude = {};
for (const ano of ANOS_SAUDE) {
  const aa = String(ano).slice(2);
  const obitos = await tabnet("sim/cnv/inf10sp.def", "Óbitos_p/Residênc", `infsp${aa}.dbf`);
  const nascidos = await tabnet("sinasc/cnv/nvsp.def", "Nascim_p/resid.mãe", `nvsp${aa}.dbf`);
  saude[ano] = Object.fromEntries(pares.cidades.map((c) => [c.ibge, { obitos: obitos[String(c.ibge).slice(0, 6)] ?? 0, nascidos: nascidos[String(c.ibge).slice(0, 6)] ?? null }]));
  console.log(`Mortalidade ${ano}: Osasco ${saude[ano][pares.foco].obitos} óbitos / ${saude[ano][pares.foco].nascidos} nascidos`);
}
writeFileSync(
  "data/resultados/mortalidade.json",
  JSON.stringify({ fonte: "http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sim/cnv/inf10sp.def", fonteNascidos: "http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sinasc/cnv/nvsp.def", coletadoEm: new Date().toISOString(), anos: saude }, null, 1),
);
