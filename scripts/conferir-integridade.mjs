// Confere a lista de contas julgadas irregulares do TCE-SP (atualizada todo mês) contra os nomes completos dos
// vereadores e do prefeito, e mostra quem aparece. Não muda nada no site: cada caso novo precisa ser conferido à mão
// (dígitos do CPF que a lista mostra) e só então entra em data/integridade.json. Passo a passo em data/manual/LEIAME.md.
// Rode com: npm run conferir:integridade
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readWorkbook } from "./lib/xlsx.mjs";

const PAGINA = "https://www.tce.sp.gov.br/relacao-de-responsaveis-por-contas-julgadas-irregulares";
const PASTA = "data/cache/tce-irregulares";
const norm = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/\s+/g, " ").trim();

const html = await (await fetch(PAGINA, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
const planilhas = [...new Set([...html.matchAll(/href="([^"]+_CPF_anonimizado\.xlsx)"/g)].map((m) => m[1]))].filter((u) => /1900/.test(u));
if (!planilhas.length) throw new Error("Não achei as planilhas na página do TCE-SP; o endereço pode ter mudado.");
mkdirSync(PASTA, { recursive: true });

const dados = JSON.parse(readFileSync("src/data/dados.json", "utf8"));
const integridade = JSON.parse(readFileSync("data/integridade.json", "utf8"));
const conhecidos = new Set(integridade.registros.map((r) => r.processo.replace(/^TC-/, "")));
const pessoas = [
  ...dados.vereadores.map((v) => ({ id: v.id, nome: v.perfil?.nomeCompleto ?? v.nome })),
  { id: "prefeito", nome: dados.prefeito.nomeCompleto ?? dados.prefeito.nome },
].map((p) => ({ ...p, alvo: norm(p.nome.replace(/\(suplente\)/i, "")) }));

let novos = 0;
for (const url of planilhas) {
  const arquivo = `${PASTA}/${decodeURIComponent(url.split("/").pop())}`;
  writeFileSync(arquivo, Buffer.from(await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })).arrayBuffer()));
  const linhas = readWorkbook(readFileSync(arquivo))[0].rows.map((r) => r.map((c) => String(c ?? "").trim()));
  console.log(`${arquivo.split("/").pop()}: ${linhas.length} linhas`);
  for (const p of pessoas)
    for (const l of linhas.filter((l) => l.some((c) => norm(c) === p.alvo))) {
      const processo = l.find((c) => /^\d+\/\d{3}\/\d{2}$/.test(c));
      const ja = conhecidos.has(processo);
      if (!ja) novos++;
      console.log(`  ${ja ? "já registrado" : "NOVO, conferir"}: ${p.id} | ${l.filter(Boolean).slice(1).join(" | ").replace(/\d{3}\.XXX\.XXX-\d{2}/, "[cpf]")}`);
    }
}
console.log(novos ? `${novos} caso(s) novo(s) para conferir à mão.` : "Nenhum caso novo.");
if (!existsSync("data/integridade.json")) console.warn("data/integridade.json não existe.");
