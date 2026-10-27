// Dados oficiais por bairro de Osasco para o mapa:
//  - IBGE, Censo 2022 agregado por bairro: renda, saneamento, alfabetização, idade, cor ou raça e entorno das casas
//  - TSE, eleições 2024: votos por local de votação (com coordenadas), somados por bairro
//  - Ministério da Saúde, CNES: unidades de saúde que atendem pelo SUS, com coordenadas
// Gera data/territorio/{censo,eleicao-2024,saude}.json. Rode depois de npm run coletar:bairros.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { emCache } from "./lib/baixar.mjs";
import { carregarBairros, localizadorDeBairros, reconhecedorDeBairros } from "./lib/bairros.mjs";
import { camposCsv, linhasDoZip } from "./lib/zip-linhas.mjs";

const IBGE_MUN = "3534401";
const malha = carregarBairros();
if (!malha) throw new Error("Rode antes: npm run coletar:bairros");
const ids = new Map(malha.bairros.map((b) => [b.codigo, b.id]));
const localiza = await localizadorDeBairros();
const reconhece = reconhecedorDeBairros(malha.bairros);
const porTexto = (t) => reconhece(t)[0] ?? null;
mkdirSync("data/territorio", { recursive: true });
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const numero = (s) => {
  const n = Number(String(s ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// ---------- IBGE: Censo 2022 por bairro ----------
const CENSO = "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/";
const AGREG = CENSO + "Agregados_por_Setores_Censitarios/Agregados_por_Bairro_csv/";
const ENTORNO = CENSO + "Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/Agregados_por_Bairro_csv/";
const ARQUIVOS = {
  basico: AGREG + "Agregados_por_bairros_basico_BR_20260520.zip",
  domicilio2: AGREG + "Agregados_por_bairros_caracteristicas_domicilio2_BR_20250417.zip",
  alfabetizacao: AGREG + "Agregados_por_bairros_alfabetizacao_BR.zip",
  cor: AGREG + "Agregados_por_bairros_cor_ou_raca_BR.zip",
  demografia: AGREG + "Agregados_por_bairros_demografia_BR.zip",
  entorno: ENTORNO + "Agregados_por_bairros_entorno_domic%c3%adlios_BR.zip",
  renda: CENSO + "Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/Agregados_por_bairros_renda_responsavel_BR_20260508_csv.zip",
};

async function tabelaCenso(nome) {
  const zip = unzipSync(new Uint8Array(readFileSync(await emCache(ARQUIVOS[nome], `censo-${nome}.zip`))));
  const csv = Object.entries(zip).find(([k]) => k.endsWith(".csv"))[1];
  const linhas = new TextDecoder("utf-8").decode(csv).split(/\r?\n/);
  const cab = camposCsv(linhas[0]);
  const out = {};
  for (const l of linhas.slice(1)) {
    if (!l.startsWith(`"${IBGE_MUN}`)) continue;
    const c = camposCsv(l);
    out[c[0]] = Object.fromEntries(cab.map((k, i) => [k.toUpperCase(), c[i]]));
  }
  return out;
}

const t = {};
for (const nome of Object.keys(ARQUIVOS)) t[nome] = await tabelaCenso(nome);
const v = (tab, cod, ...vars) => vars.reduce((a, k) => a + (numero(t[tab][cod]?.[k]) ?? 0), 0);
const faixa = (pref, de, ate) => Array.from({ length: ate - de + 1 }, (_, i) => `${pref}${String(de + i).padStart(5, "0")}`);

const censo = malha.bairros.map((b) => {
  const c = b.codigo;
  const pessoas = v("basico", c, "V0001");
  const dppo = v("domicilio2", c, ...faixa("V", 111, 118)); // domicílios que declararam a forma de abastecimento
  const alfTotal = v("alfabetizacao", c, ...faixa("V", 644, 656));
  const alfSim = v("alfabetizacao", c, ...faixa("V", 748, 760));
  const entornoTotal = v("entorno", c, "V05000");
  const e = (k) => pct(v("entorno", c, k), entornoTotal);
  return {
    id: b.id,
    areaKm2: numero(t.basico[c]?.AREA_KM2),
    pessoas,
    domicilios: v("basico", c, "V0007"),
    moradoresPorDomicilio: numero(t.basico[c]?.V0005),
    rendaMedia: numero(t.renda[c]?.V06004),
    rendaMediana: numero(t.renda[c]?.V06006),
    agua: pct(v("domicilio2", c, "V00111"), dppo),
    esgoto: pct(v("domicilio2", c, "V00309", "V00310"), dppo),
    lixo: pct(v("domicilio2", c, "V00397", "V00398"), dppo),
    alfabetizados: pct(alfSim, alfTotal),
    negros: pct(v("cor", c, "V01318", "V01320"), v("cor", c, "V01317", "V01318", "V01319", "V01320", "V01321")),
    criancas: pct(v("demografia", c, "V01031", "V01032", "V01033"), v("demografia", c, "V01006")),
    idosos: pct(v("demografia", c, "V01040", "V01041"), v("demografia", c, "V01006")),
    pavimentacao: e("V05006"),
    bueiro: e("V05009"),
    iluminacao: e("V05012"),
    onibus: e("V05015"),
    calcada: e("V05021"),
    rampa: e("V05027"),
    arvores: pct(v("entorno", c, "V05031", "V05032", "V05033"), entornoTotal),
  };
});
writeFileSync(
  "data/territorio/censo.json",
  JSON.stringify({ fonte: "IBGE, Censo Demográfico 2022, agregados por bairro (universo e entorno dos domicílios)", url: CENSO, bairros: censo }, null, 1),
);
console.log(`Censo: ${censo.length} bairros; renda média em Osasco de R$ ${Math.min(...censo.map((x) => x.rendaMedia ?? Infinity)).toFixed(0)} a R$ ${Math.max(...censo.map((x) => x.rendaMedia ?? 0)).toFixed(0)}`);

// ---------- TSE: eleições municipais de 2024 ----------
const TSE = "https://cdn.tse.jus.br/estatistica/sead/odsele/";
const zipLocais = await emCache(TSE + "eleitorado_locais_votacao/eleitorado_local_votacao_2024.zip", "tse/eleitorado_local_votacao_2024.zip");
const zipVotos = await emCache(TSE + "votacao_secao/votacao_secao_2024_SP.zip", "tse/votacao_secao_2024_SP.zip");

const locais = new Map();
let cab = null;
for await (const l of linhasDoZip(zipLocais)) {
  if (!cab) {
    cab = Object.fromEntries(camposCsv(l).map((k, i) => [k, i]));
    continue;
  }
  if (!l.includes('"OSASCO"')) continue;
  const c = camposCsv(l);
  if (c[cab.SG_UF] !== "SP" || c[cab.NM_MUNICIPIO] !== "OSASCO" || c[cab.NR_TURNO] !== "1") continue;
  const id = `${c[cab.NR_ZONA]}-${c[cab.NR_LOCAL_VOTACAO]}`;
  const lat = numero(c[cab.NR_LATITUDE]?.replace(".", ",")), lon = numero(c[cab.NR_LONGITUDE]?.replace(".", ","));
  const local = locais.get(id) ?? {
    id,
    nome: c[cab.NM_LOCAL_VOTACAO],
    endereco: c[cab.DS_ENDERECO],
    lat: lat && lat !== -1 ? lat : null,
    lon: lon && lon !== -1 ? lon : null,
    bairro: localiza(lon, lat) ?? porTexto(`bairro ${c[cab.NM_BAIRRO]}`),
    eleitores: 0,
  };
  local.eleitores += numero(c[cab.QT_ELEITOR_SECAO]) ?? 0;
  locais.set(id, local);
}
const semBairro = [...locais.values()].filter((l) => !l.bairro);
console.log(`TSE: ${locais.size} locais de votação em Osasco, ${semBairro.length} sem bairro identificado`);

// Votos somados por bairro, por cargo e turno.
const votos = {}; // cargo|turno -> bairro -> nome -> votos
const totais = {}; // cargo|turno -> nome -> {numero, votos}
const partidos = { nomes: {}, total: {}, porBairro: {} }; // vereador: votos somados pelo número do partido (2 primeiros dígitos)
cab = null;
for await (const l of linhasDoZip(zipVotos)) {
  if (!cab) {
    cab = Object.fromEntries(camposCsv(l).map((k, i) => [k, i]));
    continue;
  }
  if (!l.includes('"OSASCO"')) continue;
  const c = camposCsv(l);
  if (c[cab.NM_MUNICIPIO] !== "OSASCO") continue;
  const chave = `${c[cab.DS_CARGO]}|${c[cab.NR_TURNO]}`;
  const local = locais.get(`${c[cab.NR_ZONA]}-${c[cab.NR_LOCAL_VOTACAO]}`);
  const bairro = local?.bairro ?? "sem-bairro";
  const nome = c[cab.NM_VOTAVEL];
  const q = numero(c[cab.QT_VOTOS]) ?? 0;
  votos[chave] ??= {};
  votos[chave][bairro] ??= {};
  votos[chave][bairro][nome] = (votos[chave][bairro][nome] ?? 0) + q;
  totais[chave] ??= {};
  totais[chave][nome] ??= { numero: c[cab.NR_VOTAVEL], sq: c[cab.SQ_CANDIDATO], votos: 0 };
  totais[chave][nome].votos += q;
  const nr = c[cab.NR_VOTAVEL];
  if (c[cab.DS_CARGO] === "Vereador" && !["95", "96"].includes(nr) && /^\d{2}(\d{3})?$/.test(nr)) {
    const pt = nr.slice(0, 2);
    if (nr.length === 2) partidos.nomes[pt] = nome;
    partidos.total[pt] = (partidos.total[pt] ?? 0) + q;
    partidos.porBairro[bairro] ??= {};
    partidos.porBairro[bairro][pt] = (partidos.porBairro[bairro][pt] ?? 0) + q;
  }
}

const NAO_CANDIDATO = /^(VOTO )?(BRANCO|NULO)$/i;
const eleicao = {
  fonte: "Tribunal Superior Eleitoral, resultados por seção e locais de votação, eleições municipais de 2024",
  url: "https://dadosabertos.tse.jus.br/",
  partidos,
  locais: [...locais.values()].map(({ id, nome, endereco, lat, lon, bairro, eleitores }) => ({ id, nome, endereco, lat, lon, bairro, eleitores })),
  cargos: Object.fromEntries(
    Object.entries(totais).map(([chave, cand]) => {
      const [cargo, turno] = chave.split("|");
      const lista = Object.entries(cand)
        .map(([nome, x]) => ({ nome, numero: x.numero, sq: x.sq && x.sq !== "-1" ? x.sq : null, votos: x.votos, valido: !NAO_CANDIDATO.test(nome) }))
        .sort((a, b) => b.votos - a.votos);
      // Vereador: só candidatos com votação relevante, para o arquivo não ficar enorme.
      const guardados = new Set(lista.filter((x) => !x.valido || cargo !== "Vereador" || x.votos >= 1000).map((x) => x.nome));
      const porBairro = Object.fromEntries(
        Object.entries(votos[chave]).map(([b, nomes]) => [
          b,
          {
            validos: Object.entries(nomes).reduce((a, [n, q]) => a + (NAO_CANDIDATO.test(n) ? 0 : q), 0),
            votos: Object.fromEntries(Object.entries(nomes).filter(([n]) => guardados.has(n))),
          },
        ]),
      );
      return [`${cargo.toLowerCase()}-${turno}`, { cargo, turno: Number(turno), candidatos: lista.filter((x) => guardados.has(x.nome)), porBairro }];
    }),
  ),
};
// Comparecimento e abstenção (eleição para prefeito, 1º turno), somados por bairro.
const zipDetalhe = await emCache(TSE + "detalhe_votacao_secao/detalhe_votacao_secao_2024.zip", "tse/detalhe_votacao_secao_2024.zip");
const comparecimento = {};
cab = null;
for await (const l of linhasDoZip(zipDetalhe)) {
  if (!cab) {
    cab = Object.fromEntries(camposCsv(l).map((k, i) => [k, i]));
    continue;
  }
  if (!l.includes('"OSASCO"')) continue;
  const c = camposCsv(l);
  if (c[cab.SG_UF] !== "SP" || c[cab.NM_MUNICIPIO] !== "OSASCO" || c[cab.DS_CARGO] !== "Prefeito" || c[cab.NR_TURNO] !== "1") continue;
  const b = locais.get(`${c[cab.NR_ZONA]}-${c[cab.NR_LOCAL_VOTACAO]}`)?.bairro ?? "sem-bairro";
  const x = (comparecimento[b] ??= { aptos: 0, compareceram: 0, brancos: 0, nulos: 0 });
  x.aptos += numero(c[cab.QT_APTOS]) ?? 0;
  x.compareceram += numero(c[cab.QT_COMPARECIMENTO]) ?? 0;
  x.brancos += numero(c[cab.QT_VOTOS_BRANCOS]) ?? 0;
  x.nulos += numero(c[cab.QT_VOTOS_NULOS]) ?? 0;
}
eleicao.comparecimento = comparecimento;
writeFileSync("data/territorio/eleicao-2024.json", JSON.stringify(eleicao, null, 1));
console.log(`TSE: cargos ${Object.keys(eleicao.cargos).join(", ")}`);

// ---------- Ministério da Saúde: CNES ----------
const zipCnes = await emCache("https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/CNES/cnes_estabelecimentos.zip", "saude/cnes_estabelecimentos.zip");
const TIPOS = {
  "01": "Atenção básica", "02": "Atenção básica", "71": "Atenção básica", "74": "Atenção básica",
  "05": "Hospital", "07": "Hospital", "15": "Hospital", "62": "Hospital",
  "20": "Urgência", "21": "Urgência", "73": "Urgência",
  "04": "Especialidades", "36": "Especialidades", "39": "Exames e terapias",
  "70": "Saúde mental",
  "85": "Vacinação", "50": "Vigilância",
};
const unidades = [];
cab = null;
for await (const l of linhasDoZip(zipCnes)) {
  if (!cab) {
    cab = Object.fromEntries(camposCsv(l).map((k, i) => [k, i]));
    continue;
  }
  const c = camposCsv(l);
  if (c[cab.CO_IBGE] !== IBGE_MUN.slice(0, 6) || c[cab.CO_AMBULATORIAL_SUS] !== "SIM") continue;
  const tipo = TIPOS[c[cab.TP_UNIDADE].padStart(2, "0")];
  if (!tipo) continue;
  const lat = Number(c[cab.NU_LATITUDE]), lon = Number(c[cab.NU_LONGITUDE]);
  unidades.push({
    cnes: c[cab.CO_CNES],
    nome: c[cab.NO_FANTASIA].replace(/\s+/g, " ").trim(),
    tipo,
    publica: /prefeitura|munic[ií]pio|secretaria|estado de s|governo|funda[cç][aã]o/i.test(c[cab.NO_RAZAO_SOCIAL]),
    lat: lat || null,
    lon: lon || null,
    bairro: localiza(lon, lat) ?? porTexto(`bairro ${c[cab.NO_BAIRRO]}`),
    turno: c[cab.DS_TURNO_ATENDIMENTO] || null,
  });
}
writeFileSync(
  "data/territorio/saude.json",
  JSON.stringify({ fonte: "Ministério da Saúde, Cadastro Nacional de Estabelecimentos de Saúde (CNES), unidades que atendem pelo SUS", url: "https://dadosabertos.saude.gov.br/", unidades }, null, 1),
);
console.log(`CNES: ${unidades.length} unidades SUS em Osasco, ${unidades.filter((u) => !u.bairro).length} sem bairro identificado`);

// ---------- INEP: escolas (Censo Escolar 2024) e IDEB 2025 por escola ----------
// O Censo Escolar traz o bairro escrito pela escola; ligamos ao bairro oficial pelo nome. Coordenadas vêm
// do local de votação do TSE quando a escola também é seção eleitoral (o nome é comparado sem siglas).
const INEP = "https://download.inep.gov.br/";
const zipEscolar = await emCache(INEP + "dados_abertos/microdados_censo_escolar_2024.zip", "escolas/microdados_censo_escolar_2024.zip");
const REDES = { 1: "Federal", 2: "Estadual", 3: "Municipal", 4: "Privada" };
const escolas = [];
cab = null;
for await (const l of linhasDoZip(zipEscolar, { arquivo: /microdados_ed_basica_2024\.csv$/i })) {
  if (!cab) {
    cab = Object.fromEntries(l.split(";").map((k, i) => [k, i]));
    continue;
  }
  if (!l.includes(`;${IBGE_MUN};`)) continue;
  const c = l.split(";");
  if (c[cab.CO_MUNICIPIO] !== IBGE_MUN || c[cab.TP_SITUACAO_FUNCIONAMENTO] !== "1") continue;
  const etapas = [["IN_INF", "Infantil"], ["IN_FUND_AI", "Fundamental I"], ["IN_FUND_AF", "Fundamental II"], ["IN_MED", "Médio"], ["IN_EJA", "EJA"]]
    .filter(([k]) => c[cab[k]] === "1")
    .map(([, n]) => n);
  escolas.push({
    codigo: c[cab.CO_ENTIDADE],
    nome: c[cab.NO_ENTIDADE],
    rede: REDES[c[cab.TP_DEPENDENCIA]] ?? "Outra",
    bairroTexto: c[cab.NO_BAIRRO],
    bairro: porTexto(`bairro ${c[cab.NO_BAIRRO]}`),
    etapas,
    matriculas: numero(c[cab.QT_MAT_BAS]) ?? null,
  });
}

async function idebPorEscola(arquivo) {
  const z = unzipSync(new Uint8Array(readFileSync(await emCache(INEP + `ideb/resultados/${arquivo}`, `escolas/${arquivo}`))), { filter: (f) => f.name.endsWith(".xlsx") });
  const { readWorkbook } = await import("./lib/xlsx.mjs");
  const [aba] = readWorkbook(Object.values(z)[0]);
  const linhaCab = aba.rows.findIndex((r) => r[0] === "SG_UF");
  const col = Object.fromEntries(aba.rows[linhaCab].map((k, i) => [k, i]));
  const out = {};
  for (const r of aba.rows.slice(linhaCab + 1))
    if (r[col.CO_MUNICIPIO] === IBGE_MUN) {
      const v25 = Number(r[col.VL_OBSERVADO_2025]), v23 = Number(r[col.VL_OBSERVADO_2023]);
      out[r[col.ID_ESCOLA]] = { 2025: Number.isFinite(v25) ? v25 : null, 2023: Number.isFinite(v23) ? v23 : null };
    }
  return out;
}
const idebAI = await idebPorEscola("divulgacao_anos_iniciais_escolas_2025.zip");
const idebAF = await idebPorEscola("divulgacao_anos_finais_escolas_2025.zip");

const nucleo = (s) =>
  ` ${s} `
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/ (E ?M ?E ?I ?E ?F|E ?M ?E ?F|E ?M ?E ?I|E ?E|EMEIEF|EMEF|EMEI|EE|ESCOLA|ESTADUAL|MUNICIPAL|PROFESSORA?|PROFA?|PROF|DOUTORA?|DRA?|DE|DA|DO|DAS|DOS|ENSINO|FUNDAMENTAL|INFANTIL|MEDIO|CEU|CRECHE)(?= )/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const locaisPorNome = new Map([...locais.values()].map((l) => [nucleo(l.nome), l]));
for (const e of escolas) {
  const local = locaisPorNome.get(nucleo(e.nome));
  if (local) Object.assign(e, { lat: local.lat, lon: local.lon, bairro: local.bairro ?? e.bairro });
  const ai = idebAI[e.codigo], af = idebAF[e.codigo];
  e.idebIniciais = ai?.[2025] ?? ai?.[2023] ?? null;
  e.idebFinais = af?.[2025] ?? af?.[2023] ?? null;
}
writeFileSync(
  "data/territorio/escolas.json",
  JSON.stringify(
    {
      fonte: "INEP, Censo Escolar 2024 e IDEB 2025 por escola (com 2023 quando 2025 não foi divulgado)",
      url: "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos",
      escolas,
    },
    null,
    1,
  ),
);
const publicas = escolas.filter((e) => e.rede !== "Privada");
console.log(
  `Escolas: ${escolas.length} em funcionamento (${publicas.length} públicas); ${escolas.filter((e) => !e.bairro).length} sem bairro; ${escolas.filter((e) => e.lat).length} com coordenadas; ${escolas.filter((e) => e.idebIniciais || e.idebFinais).length} com IDEB`,
);


// ---------- IBGE: favelas e comunidades urbanas (Censo 2022) ----------
// Moradores de cada bairro que vivem em setores censitários classificados como favela ou comunidade urbana,
// e o contorno de cada comunidade para desenhar no mapa.
const zipSetores = await emCache(AGREG.replace("Agregados_por_Bairro_csv/", "Agregados_por_Setor_csv/") + "Agregados_por_setores_basico_BR_20260520.zip", "censo/setores_basico.zip");
const porCodigo = new Map(malha.bairros.map((b) => [b.codigo, b.id]));
const comunidades = {}; // código FCU -> {nome, moradores, bairros: {id: moradores}}
const emFavela = {}; // bairro -> moradores
cab = null;
for await (const l of linhasDoZip(zipSetores)) {
  if (!cab) {
    cab = Object.fromEntries(camposCsv(l).map((k, i) => [k.toUpperCase(), i]));
    continue;
  }
  if (!l.startsWith(`"${IBGE_MUN}`)) continue;
  const c = camposCsv(l);
  const fcu = c[cab.CD_FCU];
  if (!fcu || fcu === ".") continue;
  const pessoasSetor = numero(c[cab.V0001]) ?? 0;
  const bairro = porCodigo.get(c[cab.CD_BAIRRO]) ?? null;
  const x = (comunidades[fcu] ??= { codigo: fcu, nome: c[cab.NM_FCU], moradores: 0, bairros: {} });
  x.moradores += pessoasSetor;
  if (bairro) {
    x.bairros[bairro] = (x.bairros[bairro] ?? 0) + pessoasSetor;
    emFavela[bairro] = (emFavela[bairro] ?? 0) + pessoasSetor;
  }
}
const { lerShapefile } = await import("./lib/shp.mjs");
const zipFcu = unzipSync(
  new Uint8Array(
    readFileSync(await emCache(CENSO + "Favelas_e_comunidades_urbanas_Resultados_do_universo/arquivos_vetoriais/poligonos_FCUs_shp.zip", "favelas/poligonos_FCUs_shp.zip")),
  ),
);
const shpFcu = Object.keys(zipFcu).find((k) => k.endsWith(".shp"));
const contornos = lerShapefile(zipFcu[shpFcu], zipFcu[shpFcu.replace(/\.shp$/, ".dbf")])
  .filter((f) => String(f.properties.cd_mun) === IBGE_MUN)
  .map((f) => ({ type: "Feature", properties: { codigo: String(f.properties.cd_fcu) }, geometry: f.geometry }));
writeFileSync(
  "data/territorio/favelas.json",
  JSON.stringify(
    {
      fonte: "IBGE, Censo 2022, Favelas e Comunidades Urbanas (setores e polígonos)",
      url: CENSO + "Favelas_e_comunidades_urbanas_Resultados_do_universo/",
      emFavela,
      comunidades: Object.values(comunidades)
        .map((x) => ({ ...x, nome: x.nome.replace(/\s+-\s+[A-Z]{1,3}$/, "") }))
        .sort((a, b) => b.moradores - a.moradores),
    },
    null,
    1,
  ),
);
writeFileSync("data/territorio/favelas-contornos.json", JSON.stringify({ type: "FeatureCollection", features: contornos }));
console.log(`Favelas: ${Object.keys(comunidades).length} comunidades, ${Object.values(emFavela).reduce((a, b) => a + b, 0).toLocaleString("pt-BR")} moradores, ${contornos.length} contornos`);

// ---------- SSP-SP: ocorrências criminais registradas em 2025 ----------
// Cada linha da planilha é uma natureza de crime em um boletim de ocorrência, com o local do fato.
// Publicamos só a contagem por bairro e por grupo; nenhum endereço ou boletim individual.
const { linhasXlsx } = await import("./lib/xlsx-fluxo.mjs");
const ANO_SSP = 2025;
const planilhaSsp = await emCache(`https://www.ssp.sp.gov.br/assets/estatistica/transparencia/spDados/SPDadosCriminais_${ANO_SSP}.xlsx`, `ssp/SPDadosCriminais_${ANO_SSP}.xlsx`);
const GRUPOS = [
  ["mortes", /^(HOMIC[IÍ]DIO DOLOSO$|LATROC[IÍ]NIO|LES[AÃ]O CORPORAL SEGUIDA DE MORTE)/],
  ["roubos", /^ROUBO/],
  ["furtos", /^FURTO/],
  ["violencia", /^(LES[AÃ]O CORPORAL DOLOSA|TENTATIVA DE HOMIC)/],
  ["sexual", /^ESTUPRO/],
  ["transito", /(ACIDENTE DE TR[AÂ]NSITO)/],
  ["drogas", /ENTORPECENTES/],
];
const crimes = {}; // bairro -> grupo -> n
const vistos = new Set();
let semLocal = 0, total = 0;
cab = null;
for await (const r of linhasXlsx(planilhaSsp, new RegExp(String(ANO_SSP)))) {
  if (!cab) {
    cab = Object.fromEntries(r.map((k, i) => [k, i]));
    continue;
  }
  if (r[0] === "NOME_DEPARTAMENTO" || r[cab.CD_IBGE] !== IBGE_MUN) continue;
  const nat = r[cab.NATUREZA_APURADA];
  const chave = `${r[cab.NUM_BO]}|${r[cab.ANO_BO]}|${r[cab.NOME_DELEGACIA]}|${nat}`;
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  const grupo = GRUPOS.find(([, re]) => re.test(nat))?.[0];
  if (!grupo) continue;
  total++;
  const lat = Number(r[cab.LATITUDE]), lon = Number(r[cab.LONGITUDE]);
  const bairro = localiza(lon, lat) ?? porTexto(`bairro ${r[cab.BAIRRO]}`);
  if (!bairro) {
    semLocal++;
    continue;
  }
  crimes[bairro] ??= {};
  crimes[bairro][grupo] = (crimes[bairro][grupo] ?? 0) + 1;
}
writeFileSync(
  "data/territorio/seguranca.json",
  JSON.stringify(
    {
      fonte: `Secretaria da Segurança Pública de SP, dados criminais (boletins de ocorrência) de ${ANO_SSP}`,
      url: "https://www.ssp.sp.gov.br/estatistica/dados-mensais",
      ano: ANO_SSP,
      total,
      semLocal,
      porBairro: crimes,
    },
    null,
    1,
  ),
);
console.log(`SSP ${ANO_SSP}: ${total} ocorrências em Osasco nos grupos escolhidos, ${semLocal} sem bairro identificado`);
