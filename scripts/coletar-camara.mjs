// Despesas da Câmara Municipal de Osasco enviadas ao TCE-SP (sistema AUDESP), pela API aberta do
// Portal da Transparência Municipal: https://transparencia.tce.sp.gov.br/api/json/despesas/{municipio}/{ano}/{mes}
// Gera data/camara-despesas.json com totais por ano e mês e os maiores fornecedores.
// Pagamentos a pessoas físicas entram só no total, sem nome nem documento.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { baixar, sleep } from "./lib/baixar.mjs";

const MUNICIPIO = "osasco";
const ORGAO = /c[aâ]mara municipal/i;
// Desde o primeiro ano da gestão anterior, para comparar com o passado. Anos já fechados e baixados antes não são
// pedidos de novo (cada mês da API tem alguns MB): só o ano atual e o anterior são atualizados.
const DESDE = Number(process.env.DESDE ?? 2017);
const ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: ATUAL - DESDE + 1 }, (_, i) => DESDE + i);
const ARQUIVO = "data/camara-despesas.json";
const anterior = existsSync(ARQUIVO) ? JSON.parse(readFileSync(ARQUIVO, "utf8")).anos : {};
const valor = (s) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;
const EVENTO = { Empenhado: "empenhado", "Valor Liquidado": "liquidado", "Valor Pago": "pago", "Anulação": "anulado" };

const anos = {};
for (const ano of ANOS) {
  if (anterior[ano] && ano < ATUAL - 1) {
    anos[ano] = anterior[ano];
    continue;
  }
  const meses = [];
  const fornecedores = {};
  for (let mes = 1; mes <= 12; mes++) {
    const linhas = await (await baixar(`https://transparencia.tce.sp.gov.br/api/json/despesas/${MUNICIPIO}/${ano}/${mes}`)).json();
    await sleep(500);
    const daCamara = Array.isArray(linhas) ? linhas.filter((l) => ORGAO.test(l.orgao)) : [];
    if (!daCamara.length) continue;
    const m = { mes, empenhado: 0, liquidado: 0, pago: 0, anulado: 0 };
    for (const l of daCamara) {
      const ev = EVENTO[l.evento];
      if (!ev) continue;
      m[ev] += valor(l.vl_despesa);
      if (ev !== "pago") continue;
      const pf = /f[ií]sica/i.test(l.id_fornecedor);
      const nome = pf ? "Pessoas físicas (servidores e outros)" : l.nm_fornecedor.replace(/\s+/g, " ").trim();
      fornecedores[nome] = (fornecedores[nome] ?? 0) + valor(l.vl_despesa);
    }
    meses.push(m);
    console.log(`${ano}-${String(mes).padStart(2, "0")}: ${daCamara.length} lançamentos, pago R$ ${m.pago.toLocaleString("pt-BR")}`);
  }
  if (!meses.length) continue;
  const soma = (k) => Math.round(meses.reduce((a, m) => a + m[k], 0) * 100) / 100;
  anos[ano] = {
    meses,
    empenhado: soma("empenhado"),
    liquidado: soma("liquidado"),
    pago: soma("pago"),
    anulado: soma("anulado"),
    maioresFornecedores: Object.entries(fornecedores)
      .map(([nome, pago]) => ({ nome, pago: Math.round(pago * 100) / 100 }))
      .sort((a, b) => b.pago - a.pago)
      .slice(0, 12),
  };
}

writeFileSync(
  ARQUIVO,
  JSON.stringify(
    {
      fonte: "TCE-SP, Portal da Transparência Municipal (dados do sistema AUDESP)",
      url: "https://transparencia.tce.sp.gov.br/",
      coletadoEm: new Date().toISOString().slice(0, 10),
      anos,
    },
    null,
    1,
  ),
);
console.log(`Gravado ${ARQUIVO}: ${Object.keys(anos).join(", ")}`);
