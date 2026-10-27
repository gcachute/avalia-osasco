// Baixa os logos dos partidos dos vereadores e do prefeito para public/partidos, a partir do Wikidata
// (propriedade P154, "logotipo") e do Wikimedia Commons. Quando o Commons não tem o logo atual, usa o
// arquivo publicado no site oficial do partido. Gera data/partidos.json com a fonte de cada um.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const headers = { "User-Agent": "avalia-osasco/0.1 (https://github.com/gcachute/avalia-osasco; dados publicos)" };
const dados = JSON.parse(readFileSync("src/data/dados.json", "utf8"));
const politicos = JSON.parse(readFileSync("data/politicos.json", "utf8"));
const siglas = [...new Set([...dados.vereadores.map((v) => v.partido), politicos.prefeito.partido].filter(Boolean))];

// Siglas do site → nomes ou siglas como aparecem no Wikidata.
const APELIDOS = {
  PODE: ["Podemos"],
  Podemos: ["PODE"],
  UNIAO: ["União", "União Brasil", "UNIÃO"],
  PCdoB: ["PC do B", "Partido Comunista do Brasil"],
  REPUBLICANOS: ["Republicanos"],
  AVANTE: ["Avante"],
};
const norm = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const consulta = `
SELECT ?p ?nome ?sigla ?logo ?fim WHERE {
  ?p wdt:P31/wdt:P279* wd:Q7278; wdt:P17 wd:Q155; p:P154 ?st.
  ?st ps:P154 ?logo.
  OPTIONAL { ?st pq:P582 ?fim }
  FILTER NOT EXISTS { ?p wdt:P576 ?extinto }
  OPTIONAL { ?p wdt:P1813 ?sigla }
  ?p rdfs:label ?nome. FILTER(LANG(?nome) = "pt")
}`;
const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(consulta)}`, { headers, signal: AbortSignal.timeout(60000) });
if (!res.ok) throw new Error(`Wikidata: HTTP ${res.status}`);
// Logos com data de fim (marcas antigas) vão para o fim da lista: fica o vigente.
const linhas = (await res.json()).results.bindings
  .map((b) => ({ id: b.p.value.split("/").pop(), nome: b.nome.value, sigla: b.sigla?.value ?? "", logo: b.logo.value, antigo: !!b.fim }))
  .sort((a, b) => Number(a.antigo) - Number(b.antigo));

// Arquivos do Commons conferidos à mão, para partidos sem logo no Wikidata.
const FIXOS = { AVANTE: "Avante 70 (Brasil) logo.svg" };
// Sem logo atual no Commons (o do Podemos ainda tem o número antigo, 19): arquivo do site oficial do partido.
const PODEMOS = { url: "https://podemos.org.br/__l5e/assets-v1/58d38adc-fd17-4eeb-b20e-0596b3a0b495/podemos-logo.png", site: "https://podemos.org.br/", nome: "Podemos" };
const OFICIAIS = {
  REPUBLICANOS: { url: "https://republicanos10.org.br/img/logo-claro.webp", site: "https://republicanos10.org.br/", nome: "Republicanos" },
  PODE: PODEMOS,
  Podemos: PODEMOS,
};
const SEM_LOGO = new Set();
const navegador = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };
console.log(`${linhas.length} partidos brasileiros com logo no Wikidata`);

mkdirSync("public/partidos", { recursive: true });
const anterior = existsSync("data/partidos.json") ? JSON.parse(readFileSync("data/partidos.json", "utf8")) : {};
const saida = {};
for (const sigla of siglas) {
  const chaves = [sigla, ...(APELIDOS[sigla] ?? [])].map(norm);
  if (SEM_LOGO.has(sigla)) {
    console.log(`-- ${sigla}: sem logo atual confiável; o site mostra a sigla`);
    continue;
  }
  if (OFICIAIS[sigla]) {
    const o = OFICIAIS[sigla];
    try {
      const img = await fetch(o.url, { headers: navegador, signal: AbortSignal.timeout(60000) });
      if (!img.ok) throw new Error(`HTTP ${img.status}`);
      const ext = o.url.split(".").pop();
      const caminho = `/partidos/${norm(sigla).toLowerCase()}.${ext}`;
      writeFileSync(`public${caminho}`, Buffer.from(await img.arrayBuffer()));
      saida[sigla] = { arquivo: caminho, nome: o.nome, fonte: `Site oficial do partido (${new URL(o.site).host})`, url: o.site };
      console.log(`ok ${sigla}: ${o.nome} (site oficial)`);
    } catch (e) {
      console.warn(`-- ${sigla}: falhou ao baixar do site oficial (${e.message})`);
      if (anterior[sigla]) saida[sigla] = anterior[sigla];
    }
    continue;
  }
  const achado = FIXOS[sigla]
    ? { nome: sigla, logo: `http://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(FIXOS[sigla])}` }
    : (linhas.find((l) => chaves.includes(norm(l.sigla))) ?? linhas.find((l) => chaves.includes(norm(l.nome))));
  if (!achado) {
    console.warn(`-- ${sigla}: logo não encontrado no Wikidata`);
    if (anterior[sigla]) saida[sigla] = anterior[sigla];
    continue;
  }
  const arquivo = decodeURIComponent(achado.logo.split("/").pop());
  try {
    const img = await fetch(`${achado.logo.replace(/^http:/, "https:")}?width=96`, { headers, signal: AbortSignal.timeout(60000) });
    if (!img.ok) throw new Error(`HTTP ${img.status}`);
    const tipo = img.headers.get("content-type") ?? "";
    const ext = /svg/.test(tipo) ? "svg" : /jpe?g/.test(tipo) ? "jpg" : "png";
    const caminho = `/partidos/${norm(sigla).toLowerCase()}.${ext}`;
    writeFileSync(`public${caminho}`, Buffer.from(await img.arrayBuffer()));
    saida[sigla] = { arquivo: caminho, nome: achado.nome, fonte: `Wikimedia Commons, ${arquivo}`, url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(arquivo)}` };
    console.log(`ok ${sigla}: ${achado.nome} (${arquivo})`);
  } catch (e) {
    console.warn(`-- ${sigla}: falhou ao baixar ${arquivo} (${e.message})`);
    if (anterior[sigla]) saida[sigla] = anterior[sigla];
  }
}
writeFileSync("data/partidos.json", JSON.stringify(saida, null, 1));
