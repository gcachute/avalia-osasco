// Baixa as planilhas de "Registros de Presença e Votação" da Câmara de Osasco para data/raw.
// Só baixa o que ainda não existe e espera entre pedidos para não sobrecarregar o servidor.
// Rode com: npm run coletar   (depois: npm run dados)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SITE = "https://www.osasco.sp.leg.br/";
const PAGINA = SITE + "registros-de-presenca-e-votacao";
const RAW = "data/raw";
const CACHE = "data/links-cache.txt";
const PAUSA_MS = Number(process.env.PAUSA_MS ?? 4000);
const ANO_MINIMO = Number(process.env.ANO_MINIMO ?? 2025);
const headers = { "User-Agent": "avalia-osasco/0.1 (coleta de dados publicos)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listarLinks() {
  try {
    const html = await (await fetch(PAGINA, { headers, signal: AbortSignal.timeout(30000) })).text();
    const links = [...new Set([...html.matchAll(/href="(?:\.\.\/)?([^"]+\.xlsx)"/g)].map((m) => m[1].replace(/^\//, "")))];
    if (links.length) {
      writeFileSync(CACHE, links.join("\n") + "\n");
      return links;
    }
  } catch (e) {
    console.warn(`Não foi possível ler ${PAGINA} (${e.message}); usando a lista salva em ${CACHE}.`);
  }
  return existsSync(CACHE) ? readFileSync(CACHE, "utf8").split(/\r?\n/).filter(Boolean) : [];
}

mkdirSync(RAW, { recursive: true });
const links = (await listarLinks()).filter((l) => {
  const ano = decodeURIComponent(l).match(/(20\d{2})\d{4}/)?.[1];
  return !ano || Number(ano) >= ANO_MINIMO;
});
const faltando = links.filter((l) => !existsSync(`${RAW}/${l.split("/").pop()}`));
console.log(`${links.length} planilhas listadas, ${faltando.length} para baixar.`);

let falhas = 0;
for (const [i, link] of faltando.entries()) {
  const nome = link.split("/").pop();
  try {
    const res = await fetch(SITE + link, { headers, signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(`${RAW}/${nome}`, Buffer.from(await res.arrayBuffer()));
    console.log(`[${i + 1}/${faltando.length}] ${decodeURIComponent(nome)}`);
    falhas = 0;
  } catch (e) {
    console.warn(`[${i + 1}/${faltando.length}] falhou ${decodeURIComponent(nome)}: ${e.message}`);
    if (++falhas >= 5) {
      console.error("5 falhas seguidas: o servidor pode estar bloqueando. Tente de novo mais tarde.");
      process.exit(1);
    }
  }
  await sleep(PAUSA_MS);
}
