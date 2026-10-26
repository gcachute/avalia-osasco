// Utilitários de download compartilhados pelos coletores.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function baixar(url, { tentativas = 3, timeout = 120000, ...opcoes } = {}) {
  for (let t = 1; t <= tentativas; t++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { "User-Agent": "avalia-osasco/0.1 (coleta de dados publicos)" }, ...opcoes });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      console.warn(`  tentativa ${t} falhou (${e.message}): ${url}`);
      if (t === tentativas) throw e;
      await sleep(5000 * t);
    }
  }
}

// Arquivos grandes ficam em data/cache (fora do git) e só são baixados uma vez.
export async function emCache(url, nome) {
  mkdirSync("data/cache", { recursive: true });
  const caminho = `data/cache/${nome}`;
  if (!existsSync(caminho)) {
    console.log(`Baixando ${url} ...`);
    const res = await baixar(url, { timeout: 30 * 60 * 1000 });
    writeFileSync(caminho, Buffer.from(await res.arrayBuffer()));
  }
  return caminho;
}

// Consulta às bases Pentaho/CDA dos painéis públicos do TCE-SP. O acesso anônimo
// (userid=anony&password=zero) é o que o próprio site do TCE-SP usa ao abrir os painéis.
export async function consultaCda(base, path, dataAccessId, params = {}) {
  const qs = Object.entries(params)
    .map(([k, v]) => `&param${k}=${encodeURIComponent(v)}`)
    .join("");
  const res = await baixar(`${base}/pentaho/plugin/cda/api/doQuery?path=${path}&userid=anony&password=zero&outputType=json&dataAccessId=${dataAccessId}${qs}`);
  const { metadata, resultset } = await res.json();
  await sleep(1000);
  return resultset.map((r) => Object.fromEntries(metadata.map((m) => [m.colName, r[m.colIndex]])));
}
