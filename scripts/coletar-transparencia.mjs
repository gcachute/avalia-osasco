// Pilar E (transparência e entregas): baixa para data/transparencia/
//  - índice de transparência do PNTP/Atricon (base aberta, um ciclo por ano)
//  - obras públicas por situação no Painel de Obras do TCE-SP
// de Osasco e das cidades pares. Rode com: npm run coletar:transparencia   (depois: npm run dados)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { readWorkbook } from "./lib/xlsx.mjs";
import { consultaCda, emCache } from "./lib/baixar.mjs";

const pares = JSON.parse(readFileSync("data/pares.json", "utf8"));
const CICLO_PNTP = Number(process.env.CICLO_PNTP ?? 2025);
const ibges = new Set(pares.cidades.map((c) => String(c.ibge)));
mkdirSync("data/transparencia", { recursive: true });

// ---------- PNTP ----------
// O ZIP tem ~320 MB (inclui todas as respostas); só a planilha de avaliações é lida.
const urlPntp = `https://cdn.atricon.org.br/2026/08/dados_pntp_${CICLO_PNTP}.zip`;
const zip = unzipSync(readFileSync(await emCache(urlPntp, `dados_pntp_${CICLO_PNTP}.zip`)), { filter: (f) => /avaliacoes_pntp_\d+\.xlsx$/.test(f.name) });
const [cab, ...linhas] = readWorkbook(Buffer.from(Object.values(zip)[0]))[0].rows;
const c = (nome) => cab.indexOf(nome);
const avaliacoes = linhas
  .filter((r) => ibges.has(String(r[c("ibge")])) && r[c("Esfera")] === "Municipal")
  .map((r) => ({
    ibge: Number(r[c("ibge")]),
    poder: r[c("Poder")],
    entidade: r[c("Unidade Gestora")],
    indice: Number(r[c("Índice de Transparência")]),
    essenciais: Number(r[c("% das Essenciais")]),
    nivel: r[c("Nível de Transparência")],
    variacao: Number(r[c("% de Variação de Índice")]),
    validada: r[c("Avaliação Validada?")] === "Sim",
    site: r[c("Link Site Principal")],
  }));
writeFileSync(
  "data/transparencia/pntp.json",
  JSON.stringify({ ciclo: CICLO_PNTP, fonte: "https://pntp.atricon.org.br/dados-abertos/", arquivo: urlPntp, coletadoEm: new Date().toISOString(), avaliacoes }, null, 1),
);
console.log(`PNTP ${CICLO_PNTP}: ${avaliacoes.length} avaliações das cidades comparadas`);

// ---------- Painel de Obras do TCE-SP ----------
const OBRAS = "https://paineldeobras.tce.sp.gov.br";
const CDA = "/public/Obra/painel_obras.cda";
const [periodo] = await consultaCda(OBRAS, CDA, "selPeriodo");
const obras = {};
for (const cidade of pares.cidades) {
  const linhasObras = await consultaCda(OBRAS, CDA, "obrasTabela", {
    pMunicipio: cidade.ibge,
    pPeriodo: periodo.id,
    pFonteRecurso: -1,
    pContratado: -1,
    pContratante: -1,
    pSituacao: -1,
  });
  obras[cidade.ibge] = linhasObras.map((o) => ({
    situacao: o.ds_situacao,
    esfera: o.esfera,
    contratante: o.ds_entidade,
    contratado: o.nome,
    valor: Number(o.vl_ajuste),
    ano: o.ano_ajuste,
    objeto: o.objeto_ajuste,
  }));
  console.log(`Obras ${cidade.nome}: ${obras[cidade.ibge].length}`);
}
writeFileSync(
  "data/transparencia/obras.json",
  JSON.stringify({ fonte: "https://www.tce.sp.gov.br/paineldeobras", dataBase: periodo.descricao_periodo.replace(/^Data Base:\s*/, ""), coletadoEm: new Date().toISOString(), obras }, null, 1),
);
