// Saúde (SIOPS, Ministério da Saúde) e educação (SIOPE, FNDE) de Osasco e das cidades pares, ano a ano.
// São os sistemas para onde as prefeituras declaram os gastos mínimos; o RREO enviado ao Tesouro (SICONFI)
// traz um resumo deles, mas Osasco não preencheu esse resumo antes de 2025.
// Gera data/siops-siope.json. Rode com: npm run coletar:siops   (depois: npm run dados)
//
// SIOPS: API pública da consulta (siops-consulta-publica-api.saude.gov.br), período 2 = ano fechado.
//   Indicador 3.2: % da receita própria aplicada em ações e serviços públicos de saúde (LC 141/2012).
// SIOPE: API de dados abertos do FNDE. Ano fechado = período 6 (até 2016, período 1).
//   Indicador 1.1: % das receitas de impostos aplicado em manutenção e desenvolvimento do ensino (mínimo 25%).
//   Indicador 1.2: % do FUNDEB na remuneração dos profissionais do magistério / da educação básica (mínimo 60% até 2020, 70% depois).
import { readFileSync, writeFileSync } from "node:fs";

const DESDE = Number(process.env.DESDE ?? 2015);
const ATE = Number(process.env.ATE ?? new Date().getFullYear() - 1);
const SIOPS = "https://siops-consulta-publica-api.saude.gov.br/v1/indicador/municipal";
const SIOPE = "https://www.fnde.gov.br/olinda-ide/servico/DADOS_ABERTOS_SIOPE/versao/v1/odata/Indicadores_Siope(Ano_Consulta=@a,Num_Peri=@p,Sig_UF=@u)";
const pares = JSON.parse(readFileSync("data/pares.json", "utf8")).cidades;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// SIOPS escreve "30,57 %"; SIOPE, "25.33".
const numSiope = (s) => (s == null || s === "" ? null : Number(s));
const pctSiops = (s) => (s == null || s === "" ? null : Number(String(s).replace("%", "").replace(/\./g, "").replace(",", ".").trim()));

async function json(url) {
  for (let t = 1; t <= 3; t++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120000), headers: { "User-Agent": "deolhoemoz/0.1 (dados publicos)" } });
      if (r.ok) return await r.json();
      if (r.status === 404 || r.status === 204) return null;
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (t === 3) throw e;
      await sleep(3000 * t);
    }
  }
}

const anos = {};
for (let ano = DESDE; ano <= ATE; ano++) {
  const cidades = {};
  // SIOPE devolve o estado inteiro de uma vez; filtra pelas cidades pares.
  const filtro = pares.map((c) => `COD_MUNI eq ${Math.floor(c.ibge / 10)}`).join(" or ");
  const url = (p) => `${SIOPE}?@a=${ano}&@p=${p}&@u='SP'&$format=json&$filter=(${filtro}) and (COD_EXIB eq '1.1' or COD_EXIB eq '1.2')`.replace(/ /g, "%20");
  let siope = (await json(url(6)))?.value ?? [];
  if (!siope.length) siope = (await json(url(1)))?.value ?? [];
  for (const c of pares) {
    const cod6 = Math.floor(c.ibge / 10);
    const linhas = siope.filter((r) => r.COD_MUNI === cod6);
    const ind = await json(`${SIOPS}/${cod6}/${ano}/2`).catch(() => null);
    const s = Array.isArray(ind) ? ind.find((r) => r.numero_indicador === "3.2") : null;
    cidades[c.ibge] = {
      nome: c.nome,
      saude: s ? pctSiops(s.indicador_calculado) : null,
      saudeAplicado: s?.numerador ?? null,
      saudeBase: s?.denominador ?? null,
      educacao: numSiope(linhas.find((r) => r.COD_EXIB === "1.1")?.VAL_INDI),
      fundeb: numSiope(linhas.find((r) => r.COD_EXIB === "1.2")?.VAL_INDI),
    };
    await sleep(300);
  }
  anos[ano] = cidades;
  const o = cidades[3534401];
  console.log(`${ano}: Osasco saúde ${o.saude ?? "—"}%, educação ${o.educacao ?? "—"}%, FUNDEB ${o.fundeb ?? "—"}% · ${Object.values(cidades).filter((x) => x.saude != null).length}/${pares.length} com saúde, ${Object.values(cidades).filter((x) => x.educacao != null).length}/${pares.length} com educação`);
}

writeFileSync(
  "data/siops-siope.json",
  JSON.stringify(
    {
      coletadoEm: new Date().toISOString().slice(0, 10),
      fontes: {
        saude: "Ministério da Saúde, SIOPS: indicador 3.2, % da receita própria aplicada em ações e serviços públicos de saúde (LC 141/2012)",
        educacao: "FNDE, SIOPE: indicador 1.1, % das receitas de impostos aplicado em manutenção e desenvolvimento do ensino; 1.2, % do FUNDEB na remuneração dos profissionais",
      },
      urls: { saude: "https://siops.datasus.gov.br/", educacao: "https://www.fnde.gov.br/siope/" },
      anos,
    },
    null,
    1,
  ),
);
console.log("Gravado data/siops-siope.json");
