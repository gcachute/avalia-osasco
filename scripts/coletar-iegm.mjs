// Baixa o IEG-M (Índice de Efetividade da Gestão Municipal, TCE-SP) de Osasco e das cidades pares
// para data/iegm/iegm.json. Rode com: npm run coletar:iegm   (depois: npm run dados)
//
// Usa as mesmas consultas do painel público do TCE-SP (painel.tce.sp.gov.br), incluindo a
// exportação oficial "Listagem com as faixas dos índices temáticos de todos os municípios".
// O acesso anônimo (userid=anony&password=zero) é o que o próprio site do TCE-SP usa ao
// redirecionar qualquer visitante para o painel.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CDA = "https://painel.tce.sp.gov.br/pentaho/plugin/cda/api/doQuery?path=/public/ieg_m/iegm.cda&userid=anony&password=zero&outputType=json";
const PAINEL = "https://www.tce.sp.gov.br/iegm";
const ANO_BASE_MINIMO = 2019;
const pares = JSON.parse(readFileSync("data/pares.json", "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function consulta(dataAccessId, params = {}) {
  const qs = Object.entries(params)
    .map(([k, v]) => `&param${k}=${encodeURIComponent(v)}`)
    .join("");
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const res = await fetch(`${CDA}&dataAccessId=${dataAccessId}${qs}`, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { metadata, resultset } = await res.json();
      await sleep(1000);
      return resultset.map((r) => Object.fromEntries(metadata.map((m) => [m.colName, r[m.colIndex]])));
    } catch (e) {
      console.warn(`  ${dataAccessId}: tentativa ${tentativa} falhou (${e.message})`);
      await sleep(5000 * tentativa);
    }
  }
  throw new Error(`Não foi possível consultar ${dataAccessId}`);
}

const exercicios = (await consulta("exercicioDS")).filter((e) => e.exercicio >= ANO_BASE_MINIMO);
const valorFaixa = Object.fromEntries((await consulta("faixaValorDS")).map((f) => [f.faixa, f.vl_padrao]));
const ibges = new Set(pares.cidades.map((c) => c.ibge));

const anos = [];
for (const e of exercicios) {
  const linhas = await consulta("faixaTodosMunicipiosPeriodo", { pExercicio_mapa: e.exercicio, pRegiao: -1 });
  const publicacoes = await consulta("arquivos", { pExercicio: e.exercicio });
  anos.push({
    anoBase: e.exercicio,
    descricao: e.descricao,
    totalMunicipios: linhas.length,
    publicacoes: publicacoes.filter((p) => p.caminho_oficial).map((p) => ({ tipo: p.tipo, url: p.caminho_oficial })),
    cidades: linhas.filter((l) => ibges.has(l.codigo_municipio)),
  });
  console.log(`${e.descricao}: ${linhas.length} municípios, ${anos.at(-1).cidades.length} das cidades comparadas`);
}

mkdirSync("data/iegm", { recursive: true });
writeFileSync("data/iegm/iegm.json", JSON.stringify({ coletadoEm: new Date().toISOString(), fonte: PAINEL, valorFaixa, anos }, null, 1));
