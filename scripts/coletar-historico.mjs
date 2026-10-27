// Séries históricas para comparar o presente com o passado, por bairro e para a cidade:
//  - IBGE, Censo 2010 por bairro (universo por setor censitário, somado pelo nome do bairro), com as mesmas
//    medidas do Censo 2022 que o mapa usa
//  - TSE, eleições municipais de 2016, 2020 e 2024 por bairro: comparecimento, brancos e nulos, prefeito e partidos
//  - IBGE (SIDRA), população de Osasco nos Censos desde 1970 e nas estimativas anuais
//  - IBGE, IPCA entre os Censos de 2010 e 2022, para comparar a renda em reais de 2022
// Gera data/historico/{censo-2010,eleicoes,populacao,ipca}.json. Rode depois de npm run coletar:territorio.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { emCache } from "./lib/baixar.mjs";
import { carregarBairros, localizadorDeBairros, reconhecedorDeBairros } from "./lib/bairros.mjs";
import { camposCsv, linhasDoZip } from "./lib/zip-linhas.mjs";

const IBGE_MUN = "3534401";
const malha = carregarBairros();
if (!malha) throw new Error("Rode antes: npm run coletar:bairros");
const localiza = await localizadorDeBairros();
const reconhece = reconhecedorDeBairros(malha.bairros);
const porTexto = (t) => reconhece(t)[0] ?? null;
const dobra = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
const numero = (s) => {
  const n = Number(String(s ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
mkdirSync("data/historico", { recursive: true });

// ---------- IBGE: Censo 2010 por bairro ----------
// Em 2010 o IBGE já publicava o nome do bairro de cada setor de Osasco; os nomes são quase os mesmos de 2022.
const APELIDOS_2010 = { rochale: "rochdale", "vila menk": "vila-menck" };
const idPorNome = new Map(malha.bairros.map((b) => [dobra(b.nome), b.id]));
const idDoBairro2010 = (nome) => APELIDOS_2010[dobra(nome)] ?? idPorNome.get(dobra(nome)) ?? null;

const zip2010 = await emCache(
  "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2010/Resultados_do_Universo/Agregados_por_Setores_Censitarios/SP_Exceto_Capital_20260615.zip",
  "censo2010/SP_Exceto_Capital.zip",
);
async function planilha2010(nome, aoLer) {
  let cab = null;
  for await (const l of linhasDoZip(zip2010, { arquivo: new RegExp(`CSV/${nome}_SP2\\.csv$`, "i") })) {
    const c = camposCsv(l);
    if (!cab) {
      cab = Object.fromEntries(c.map((k, i) => [k.trim(), i]));
      continue;
    }
    aoLer(c, cab);
  }
}
const setorBairro = new Map();
const semNome = new Set();
await planilha2010("Basico", (c, cab) => {
  if (c[cab.Cod_municipio] !== IBGE_MUN) return;
  const id = idDoBairro2010(c[cab.Nome_do_bairro]);
  if (id) setorBairro.set(c[cab.Cod_setor], id);
  else semNome.add(c[cab.Nome_do_bairro]);
});
console.log(`Censo 2010: ${setorBairro.size} setores de Osasco ligados a bairros; sem bairro correspondente: ${[...semNome].join(", ") || "nenhum"}`);

// Valores de cada setor, por planilha. Setores pequenos têm dados sigilosos ("X"): uma razão só soma os
// setores que têm o numerador e o denominador, para que o sigilo não vire zero.
const setores = new Map(); // setor -> "Planilha.Vxxx" -> valor
const faixaV = (de, ate) => Array.from({ length: ate - de + 1 }, (_, i) => `V${String(de + i).padStart(3, "0")}`);
const em = (arquivo, vs) => vs.map((v) => `${arquivo}.${v}`);
const ENTORNO = Object.fromEntries(
  // Cada item do entorno tem 6 colunas: próprios, alugados e cedidos, com "existe" e "não existe" alternados.
  [["iluminacao", 8], ["pavimentacao", 14], ["calcada", 20], ["bueiro", 32], ["rampa", 38], ["arvores", 44]].map(([k, ini]) => [
    k,
    { num: em("Entorno01", [ini, ini + 2, ini + 4].map((n) => `V${String(n).padStart(3, "0")}`)), den: em("Entorno01", faixaV(ini, ini + 5)) },
  ]),
);
const RAZOES = {
  agua: { num: em("Domicilio01", ["V012"]), den: em("Domicilio01", ["V002"]) },
  esgoto: { num: em("Domicilio01", ["V017"]), den: em("Domicilio01", ["V002"]) },
  lixo: { num: em("Domicilio01", ["V035"]), den: em("Domicilio01", ["V002"]) },
  alfabetizados: { num: em("Pessoa01", faixaV(12, 77)), den: em("Pessoa13", faixaV(49, 134)) },
  negros: { num: em("Pessoa03", ["V003", "V005"]), den: em("Pessoa03", ["V001"]) },
  criancas: { num: em("Pessoa13", ["V022", ...faixaV(35, 48)]), den: em("Pessoa13", ["V001"]) },
  idosos: { num: em("Pessoa13", faixaV(94, 134)), den: em("Pessoa13", ["V001"]) },
  ...ENTORNO,
};
const usadas = { Basico: ["V001", "V002", "V007"] };
for (const r of Object.values(RAZOES))
  for (const k of [...r.num, ...r.den]) {
    const [arq, v] = k.split(".");
    (usadas[arq] ??= []).includes(v) || usadas[arq].push(v);
  }
for (const [arquivo, vars] of Object.entries(usadas)) {
  await planilha2010(arquivo, (c, cab) => {
    const cod = c[cab.Cod_setor];
    if (!setorBairro.has(cod)) return;
    const s = setores.get(cod) ?? setores.set(cod, {}).get(cod);
    for (const v of vars) s[`${arquivo}.${v}`] = numero(c[cab[v]]);
  });
  console.log(`  ${arquivo} lido`);
}
const somaDe = (s, ks) => (ks.every((k) => s[k] != null) ? ks.reduce((a, k) => a + s[k], 0) : null);
const censo2010 = malha.bairros.map((b) => {
  const lista = [...setores.entries()].filter(([cod]) => setorBairro.get(cod) === b.id).map(([, s]) => s);
  if (!lista.length) return { id: b.id, pessoas: null };
  const total = (k) => lista.reduce((a, s) => a + (s[k] ?? 0), 0);
  const razao = ({ num, den }) => {
    let n = 0, d = 0;
    for (const s of lista) {
      const a = somaDe(s, num), z = somaDe(s, den);
      if (a == null || z == null) continue;
      (n += a), (d += z);
    }
    return pct(n, d);
  };
  // Renda média do responsável com rendimento (V007), ponderada pelo número de domicílios do setor.
  const comRenda = lista.filter((s) => s["Basico.V007"] != null && s["Basico.V001"]);
  const dom = comRenda.reduce((a, s) => a + s["Basico.V001"], 0);
  return {
    id: b.id,
    pessoas: total("Pessoa03.V001") || null,
    domicilios: total("Basico.V001") || null,
    moradoresPorDomicilio: total("Basico.V001") ? Math.round((total("Basico.V002") / total("Basico.V001")) * 100) / 100 : null,
    rendaMediaNominal: dom ? Math.round(comRenda.reduce((a, s) => a + s["Basico.V007"] * s["Basico.V001"], 0) / dom) : null,
    ...Object.fromEntries(Object.entries(RAZOES).map(([k, r]) => [k, razao(r)])),
  };
});

// ---------- IBGE: IPCA entre julho de 2010 e julho de 2022 (datas de referência dos dois Censos) ----------
const sidra = async (q) => (await (await fetch(`https://apisidra.ibge.gov.br/values/${q}`)).json()).slice(1);
const indices = Object.fromEntries((await sidra("t/1737/n1/all/v/2266/p/201007,202207")).map((r) => [r.D3C, Number(r.V)]));
const fatorIpca = Math.round((indices["202207"] / indices["201007"]) * 10000) / 10000;
writeFileSync(
  "data/historico/ipca.json",
  JSON.stringify({ fonte: "IBGE, IPCA número-índice (tabela 1737), via SIDRA", url: "https://sidra.ibge.gov.br/tabela/1737", de: "2010-07", ate: "2022-07", indices, fator: fatorIpca }, null, 1),
);
console.log(`IPCA de jul/2010 a jul/2022: fator ${fatorIpca}`);
for (const b of censo2010) b.rendaMedia = b.rendaMediaNominal != null ? Math.round(b.rendaMediaNominal * fatorIpca) : null;

writeFileSync(
  "data/historico/censo-2010.json",
  JSON.stringify(
    {
      fonte: "IBGE, Censo Demográfico 2010, resultados do universo por setor censitário, somados por bairro",
      url: "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2010/Resultados_do_Universo/Agregados_por_Setores_Censitarios/",
      notaRenda: `Renda média do responsável com rendimento, corrigida pelo IPCA para julho de 2022 (fator ${fatorIpca}).`,
      bairros: censo2010,
    },
    null,
    1,
  ),
);
console.log(`Censo 2010: ${censo2010.filter((b) => b.pessoas).length} bairros, ${censo2010.reduce((a, b) => a + (b.pessoas ?? 0), 0)} moradores`);

// ---------- TSE: eleições municipais de 2016, 2020 e 2024 por bairro ----------
const TSE = "https://cdn.tse.jus.br/estatistica/sead/odsele/";
const atual = JSON.parse(readFileSync("data/territorio/eleicao-2024.json", "utf8"));
// Locais de votação de 2024 e 2020 têm coordenadas; em 2016 não. Para 2016, o local é procurado pelo mesmo número
// (zona e local) ou pelo mesmo nome em 2020/2024 e, por último, pelo bairro escrito no endereço.
const bairroDoLocal = new Map(atual.locais.filter((l) => l.bairro).map((l) => [l.id, l.bairro]));
const bairroDoNome = new Map(atual.locais.filter((l) => l.bairro).map((l) => [dobra(l.nome), l.bairro]));

async function locaisDe(ano) {
  const zip = await emCache(`${TSE}eleitorado_locais_votacao/eleitorado_local_votacao_${ano}.zip`, `tse/eleitorado_local_votacao_${ano}.zip`);
  const locais = new Map();
  let cab = null;
  for await (const l of linhasDoZip(zip)) {
    if (!cab) {
      cab = Object.fromEntries(camposCsv(l).map((k, i) => [k, i]));
      continue;
    }
    if (!l.includes('"OSASCO"')) continue;
    const c = camposCsv(l);
    if (c[cab.SG_UF] !== "SP" || c[cab.NM_MUNICIPIO] !== "OSASCO") continue;
    const id = `${c[cab.NR_ZONA]}-${c[cab.NR_LOCAL_VOTACAO]}`;
    if (locais.has(id)) continue;
    const lat = Number(c[cab.NR_LATITUDE]), lon = Number(c[cab.NR_LONGITUDE]);
    const bairro =
      (lat && lat !== -1 ? localiza(lon, lat) : null) ??
      bairroDoLocal.get(id) ??
      bairroDoNome.get(dobra(c[cab.NM_LOCAL_VOTACAO])) ??
      porTexto(`bairro ${c[cab.NM_BAIRRO]}`);
    locais.set(id, bairro);
    if (bairro) (bairroDoLocal.has(id) || bairroDoLocal.set(id, bairro), bairroDoNome.has(dobra(c[cab.NM_LOCAL_VOTACAO])) || bairroDoNome.set(dobra(c[cab.NM_LOCAL_VOTACAO]), bairro));
  }
  return locais;
}

const NAO_CANDIDATO = /^(VOTO )?(BRANCO|NULO)$/i;
const titulo = (s) => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase());

async function eleicao(ano, locais) {
  const zipVotos = await emCache(`${TSE}votacao_secao/votacao_secao_${ano}_SP.zip`, `tse/votacao_secao_${ano}_SP.zip`);
  const prefeito = {}; // turno -> { candidatos: nome -> {numero, votos}, porBairro: bairro -> nome -> votos }
  const partidos = { nomes: {}, total: {}, porBairro: {} };
  let cab = null;
  for await (const l of linhasDoZip(zipVotos)) {
    if (!cab) {
      cab = Object.fromEntries(camposCsv(l).map((k, i) => [k, i]));
      continue;
    }
    if (!l.includes('"OSASCO"')) continue;
    const c = camposCsv(l);
    if (c[cab.NM_MUNICIPIO] !== "OSASCO") continue;
    const cargo = c[cab.DS_CARGO].toLowerCase();
    const bairro = locais.get(`${c[cab.NR_ZONA]}-${c[cab.NR_LOCAL_VOTACAO]}`) ?? "sem-bairro";
    const nome = c[cab.NM_VOTAVEL];
    const nr = c[cab.NR_VOTAVEL];
    const q = numero(c[cab.QT_VOTOS]) ?? 0;
    if (cargo === "prefeito") {
      const t = (prefeito[c[cab.NR_TURNO]] ??= { candidatos: {}, porBairro: {} });
      (t.candidatos[nome] ??= { numero: nr, votos: 0 }).votos += q;
      t.porBairro[bairro] ??= {};
      t.porBairro[bairro][nome] = (t.porBairro[bairro][nome] ?? 0) + q;
    } else if (cargo === "vereador" && !["95", "96"].includes(nr) && /^\d{2}(\d{3})?$/.test(nr)) {
      const pt = nr.slice(0, 2);
      if (nr.length === 2) partidos.nomes[pt] = nome;
      partidos.total[pt] = (partidos.total[pt] ?? 0) + q;
      partidos.porBairro[bairro] ??= {};
      partidos.porBairro[bairro][pt] = (partidos.porBairro[bairro][pt] ?? 0) + q;
    }
  }

  const zipDetalhe = await emCache(`${TSE}detalhe_votacao_secao/detalhe_votacao_secao_${ano}.zip`, `tse/detalhe_votacao_secao_${ano}.zip`);
  const comparecimento = {};
  cab = null;
  for await (const l of linhasDoZip(zipDetalhe)) {
    if (!cab) {
      cab = Object.fromEntries(camposCsv(l).map((k, i) => [k, i]));
      continue;
    }
    if (!l.includes('"OSASCO"')) continue;
    const c = camposCsv(l);
    if (c[cab.SG_UF] !== "SP" || c[cab.NM_MUNICIPIO] !== "OSASCO" || c[cab.DS_CARGO].toLowerCase() !== "prefeito" || c[cab.NR_TURNO] !== "1") continue;
    const b = locais.get(`${c[cab.NR_ZONA]}-${c[cab.NR_LOCAL_VOTACAO]}`) ?? "sem-bairro";
    const x = (comparecimento[b] ??= { aptos: 0, compareceram: 0, brancos: 0, nulos: 0 });
    x.aptos += numero(c[cab.QT_APTOS]) ?? 0;
    x.compareceram += numero(c[cab.QT_COMPARECIMENTO]) ?? 0;
    x.brancos += numero(c[cab.QT_VOTOS_BRANCOS]) ?? 0;
    x.nulos += numero(c[cab.QT_VOTOS_NULOS]) ?? 0;
  }

  const turnos = Object.fromEntries(
    Object.entries(prefeito).map(([turno, t]) => [
      turno,
      {
        candidatos: Object.entries(t.candidatos)
          .filter(([n]) => !NAO_CANDIDATO.test(n))
          .map(([n, x]) => ({ nome: titulo(n), numero: x.numero, partido: partidos.nomes[x.numero.slice(0, 2)] ?? null, votos: x.votos }))
          .sort((a, b) => b.votos - a.votos),
        porBairro: Object.fromEntries(
          Object.entries(t.porBairro).map(([b, nomes]) => [b, Object.fromEntries(Object.entries(nomes).filter(([n]) => !NAO_CANDIDATO.test(n)).map(([n, q]) => [titulo(n), q]))]),
        ),
      },
    ]),
  );
  const semBairro = [...locais.values()].filter((b) => !b).length;
  console.log(`TSE ${ano}: ${locais.size} locais (${semBairro} sem bairro); prefeito ${Object.keys(turnos).length} turno(s), eleito ${turnos[Object.keys(turnos).at(-1)].candidatos[0]?.nome}`);
  return { turnos, partidos, comparecimento };
}

const eleicoes = {};
for (const ano of [2024, 2020, 2016]) {
  const locais = ano === 2024 ? new Map(atual.locais.map((l) => [l.id, l.bairro])) : await locaisDe(ano);
  eleicoes[ano] = await eleicao(ano, locais);
}
writeFileSync(
  "data/historico/eleicoes.json",
  JSON.stringify(
    {
      fonte: "Tribunal Superior Eleitoral, resultados por seção e locais de votação, eleições municipais de 2016, 2020 e 2024",
      url: "https://dadosabertos.tse.jus.br/",
      anos: eleicoes,
    },
    null,
    1,
  ),
);

// ---------- IBGE (SIDRA): população de Osasco ----------
const censos = [...(await sidra(`t/200/n6/${IBGE_MUN}/v/93/p/all/c2/0/c1/0/c58/0`)), ...(await sidra(`t/4709/n6/${IBGE_MUN}/v/93/p/all`))]
  .map((r) => ({ ano: Number(r.D3N), pessoas: numero(r.V) }))
  .filter((r) => r.pessoas);
const estimativas = (await sidra(`t/6579/n6/${IBGE_MUN}/v/9324/p/all`)).map((r) => ({ ano: Number(r.D3N), pessoas: numero(r.V) })).filter((r) => r.pessoas);
writeFileSync(
  "data/historico/populacao.json",
  JSON.stringify({ fonte: "IBGE, Censos Demográficos (tabelas 200 e 4709) e estimativas anuais (tabela 6579), via SIDRA", url: "https://sidra.ibge.gov.br/", censos, estimativas }, null, 1),
);
console.log(`População: Censos ${censos.map((c) => `${c.ano}: ${c.pessoas}`).join(", ")}`);
