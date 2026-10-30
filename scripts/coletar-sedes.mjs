// Cidade da sede de cada empresa ou entidade mostrada na página de verbas.
// Rode com: npm run coletar:sedes   (depois: npm run dados)
//
// Consulta o cadastro público de CNPJ da Receita Federal pela BrasilAPI, uma consulta a cada 1,5 s, e guarda só município e
// estado em data/dinheiro/sedes.json. CNPJ já consultado não é consultado de novo. Só entram CNPJs (14 dígitos): pessoa
// física nunca é consultada. Depois de 3 recusas seguidas a coleta para e o que já veio fica guardado.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ARQUIVO = "data/dinheiro/sedes.json";
const d = JSON.parse(readFileSync("src/data/dinheiro.json", "utf8"));
const antes = existsSync(ARQUIVO) ? JSON.parse(readFileSync(ARQUIVO, "utf8")).sedes : {};

const cnpjs = new Set();
for (const g of d.gastos)
  for (const k of ["federal", "estadual", "emendasFederais", "emendasEstaduais", "emendasVereadores"]) for (const f of g[k]?.fornecedores ?? []) cnpjs.add(f.cnpj);
for (const p of d.integridade?.punidos ?? []) cnpjs.add(p.cnpj);
for (const x of d.integridade?.dispensasEmendas ?? []) cnpjs.add(x.cnpj);
for (const a of d.emendas.autores) for (const e of a.emendas) for (const r of e.recebimentos ?? []) if (r.entidade) cnpjs.add(r.cnpj);

const faltam = [...cnpjs].filter((c) => /^\d{14}$/.test(c ?? "") && !antes[c]);
console.log(`${cnpjs.size} CNPJs, ${faltam.length} a consultar`);

const sedes = { ...antes };
const grava = () =>
  writeFileSync(
    ARQUIVO,
    `${JSON.stringify({ fonte: "Receita Federal, cadastro de CNPJ (BrasilAPI)", url: "https://brasilapi.com.br/docs", coletadoEm: new Date().toISOString().slice(0, 10), sedes }, null, 2)}\n`,
  );

let recusas = 0;
for (const [n, c] of faltam.entries()) {
  const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`, { headers: { "User-Agent": "avalia-osasco/0.1 (coleta de dados publicos)" } }).catch(() => null);
  if (r?.ok) {
    const j = await r.json();
    if (j.municipio && j.uf) sedes[c] = { municipio: j.municipio, uf: j.uf };
    recusas = 0;
  } else if (r?.status !== 404) {
    recusas++;
    console.log(`Recusa ${recusas} (${r?.status ?? "sem resposta"})`);
    if (recusas >= 3) {
      console.log("Três recusas seguidas: parando.");
      break;
    }
  }
  if (n % 40 === 39) grava();
  await new Promise((f) => setTimeout(f, 1500));
}
grava();
console.log(`${Object.keys(sedes).length} sedes guardadas`);
