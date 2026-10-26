// Baixa do site da Câmara a lista de vereadores e o perfil de cada um (partido, foto, contatos,
// formação, votos recebidos e comissões) para data/perfis.json.
// Rode com: npm run coletar:vereadores   (depois: npm run dados)
import { readFileSync, writeFileSync } from "node:fs";
import { baixar, sleep } from "./lib/baixar.mjs";

const SITE = "https://www.osasco.sp.leg.br";
const config = JSON.parse(readFileSync("data/politicos.json", "utf8"));

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const texto = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const absoluta = (u) => (u.startsWith("http") ? u : SITE + u);

async function pagina(url) {
  const res = await baixar(url, { tentativas: 2 }).catch(() => null);
  await sleep(2500);
  return res ? await res.text() : null;
}

function campo(html, rotulo) {
  const m = html.match(new RegExp(`<strong>${rotulo}:?</strong>([\\s\\S]*?)</li>`, "i"));
  return m ? texto(m[1]) || null : null;
}

function perfil(html) {
  const partido = campo(html, "Partido");
  const redes = [...html.matchAll(/href="(https?:\/\/(?:www\.)?(instagram|facebook|tiktok|youtube|x|twitter)\.com\/[^"]+)"/gi)]
    .map((m) => ({ rede: m[2].toLowerCase(), url: m[1] }))
    .filter((r) => !/camaradeosasco|camaraosasco|camaramunicipal/i.test(r.url));
  const inicioBio = html.indexOf("<strong>Gabinete:");
  const fimBio = html.indexOf("Outros mandatos");
  const bio = inicioBio > 0 ? [...html.slice(inicioBio, fimBio > 0 ? fimBio : undefined).matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => texto(m[1])).filter((p) => p && !/^Gabinete:/.test(p)) : [];
  const tabela = html.match(/Comiss[õo]es em que vereador atua[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  const comissoes = [...tabela.matchAll(/<tr>[\s\S]*?title="([^"]+)" href="([^"]+)"[\s\S]*?<td>([^<]*)<\/td>/g)].map((m) => ({
    nome: decode(m[1]).trim(),
    url: m[2],
    cargo: m[3].trim(),
    tipo: /frente parlamentar/i.test(m[1]) ? "frente" : /especial|cpi|inqu[ée]rito|processante/i.test(m[1]) ? "temporaria" : "permanente",
  }));
  return {
    nomeCompleto: campo(html, "Nome Completo"),
    partido: partido?.split(/\s+-\s+/)[0] ?? null,
    partidoNome: partido?.split(/\s+-\s+/)[1] ?? null,
    votos: Number(campo(html, "Número de votos")) || null,
    telefone: campo(html, "Telefone"),
    email: campo(html, "Email"),
    naturalidade: campo(html, "Naturalidade"),
    ocupacao: campo(html, "Ocupação"),
    instrucao: campo(html, "Grau de Instrução"),
    nascimento: campo(html, "Nascimento"),
    gabinete: texto(html.match(/<strong>Gabinete:([\s\S]*?)<\/strong>/)?.[1] ?? "") || null,
    redes,
    bio,
    comissoes,
  };
}

const lista = await pagina(`${SITE}/vereadores`);
if (!lista) throw new Error("Site da Câmara indisponível. Tente mais tarde.");
const cards = [...lista.matchAll(/<a href="(https:\/\/www\.osasco\.sp\.leg\.br\/vereadores\/([a-z0-9-]+))"[^>]*>\s*<img src="([^"]+)"[\s\S]*?sigla-partido">([^<]*)<[\s\S]*?panel-title[^>]*>([^<]+)</g)].map((m) => ({
  url: m[1],
  slug: m[2],
  foto: absoluta(m[3]),
  partido: m[4].trim(),
  nome: decode(m[5]).trim(),
}));
console.log(`${cards.length} vereadores na página oficial`);

// Quem saiu da Câmara não aparece na lista; tentamos o perfil pelo mesmo padrão de endereço.
const ativos = new Set(cards.map((c) => c.slug));
const extras = config.vereadores.filter((v) => !ativos.has(v.id)).map((v) => ({ url: `${SITE}/vereadores/${v.id}`, slug: v.id, nome: v.nome }));

const perfis = {};
for (const c of [...cards, ...extras]) {
  const html = await pagina(c.url);
  if (!html || !html.includes("Nome Completo")) {
    console.log(`  sem perfil: ${c.nome}`);
    continue;
  }
  const foto = c.foto ?? html.match(/<img src="([^"]*\/images\/vereadores\/400x533\/[^"]+)"/)?.[1];
  perfis[c.slug] = { slug: c.slug, nome: c.nome, url: c.url, foto: foto ? absoluta(foto) : null, emExercicioNoSite: ativos.has(c.slug), ...perfil(html), partido: c.partido || perfil(html).partido };
  console.log(`  ${c.nome}: ${perfis[c.slug].partido ?? "?"}, ${perfis[c.slug].comissoes.length} comissões`);
}
// Mesa Diretora: quem está nela costuma ficar fora das comissões permanentes.
const mesaHtml = await pagina(`${SITE}/vereadores/mesa-diretora`);
const mesa = [];
if (mesaHtml) {
  const t = texto(mesaHtml.slice(mesaHtml.indexOf('id="s-content"')));
  for (const m of t.matchAll(/((?:\d\S*\s+)?(?:Vice-)?(?:Presidente|Secret\S+|Tesoureir\S+|Corregedor\S*))\s+Vereador[a]?\s+(.+?)\s+Partido:/g)) mesa.push({ cargo: m[1], nome: m[2] });
  for (const m of mesa) {
    const p = Object.values(perfis).find((x) => x.nome === m.nome);
    if (p) p.mesa = m.cargo;
  }
  console.log(`Mesa Diretora: ${mesa.map((m) => `${m.cargo} ${m.nome}`).join(", ")}`);
}
writeFileSync("data/perfis.json", JSON.stringify({ fonte: `${SITE}/vereadores`, coletadoEm: new Date().toISOString(), perfis }, null, 1));
