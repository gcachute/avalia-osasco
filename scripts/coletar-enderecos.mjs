// Bairro de cada endereço com número citado nos textos de verbas ("Rua Newton Estilac Leal, nº 643").
// Rode com: npm run coletar:enderecos   (depois: npm run dados)
//
// Procura o número no serviço de endereços do OpenStreetMap (Nominatim), uma consulta por segundo, como pede a política de
// uso dele, e guarda o resultado em data/territorio/enderecos.json: endereços já consultados não são consultados de novo.
// Só vale a resposta que acha o número exato (quando o serviço só acha a rua, o endereço fica sem bairro e a rua inteira
// continua valendo). O ponto achado é localizado no bairro oficial do IBGE.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { enderecosDe, localizadorDeBairros } from "./lib/bairros.mjs";

const ler = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
const textos = new Set();
for (const f of readdirSync("data/dinheiro").filter((f) => /^gastos-\d{4}\.json$/.test(f))) {
  for (const x of Object.values(ler(`data/dinheiro/${f}`).grupos)) {
    for (const i of x.itensBairro ?? []) textos.add(i.texto);
    for (const p of x.pagamentosEmendas ?? []) if (p.texto) textos.add(p.texto);
  }
}
for (const p of ler("data/dinheiro/pix-federais.json")?.planos ?? []) for (const o of p.objetos) if (o.objeto) textos.add(o.objeto);
for (const c of ler("data/dinheiro/emendas-federais.json")?.convenios ?? []) textos.add(c.objeto);

const destino = "data/territorio/enderecos.json";
const enderecos = ler(destino)?.enderecos ?? {};
const pendentes = new Map();
for (const t of textos) for (const e of enderecosDe(t)) if (!(e.chave in enderecos)) pendentes.set(e.chave, e);
console.log(`Endereços com número: ${Object.keys(enderecos).length} já consultados, ${pendentes.size} novos`);

// O mapa oficial de bairros fica só na pasta local (é grande demais para o repositório): sem ele, a etapa passa e os novos ficam para a próxima.
if (!pendentes.size || !existsSync("data/cache/SP_bairros_CD2022.zip")) {
  if (pendentes.size) console.log("Mapa de bairros ausente: rode npm run coletar:enderecos na máquina que tem data/cache.");
  process.exit(0);
}
const localiza = await localizadorDeBairros();
for (const e of pendentes.values()) {
  const q = new URLSearchParams({ street: `${e.numero} ${e.rua}`, city: "Osasco", state: "São Paulo", country: "Brasil", format: "jsonv2", addressdetails: "1", limit: "1" });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, { headers: { "User-Agent": "avalia-osasco/0.1 (De Olho em OZ, coleta de dados publicos)" } });
  const [r] = res.ok ? await res.json() : [];
  const exato = r?.address?.house_number && String(r.address.house_number).replace(/\D/g, "") === e.numero && /osasco/i.test(r.address.city ?? r.address.town ?? "");
  const bairro = exato ? localiza(Number(r.lon), Number(r.lat)) : null;
  enderecos[e.chave] = { bairro, consultadoEm: new Date().toISOString().slice(0, 10) };
  console.log(`  ${e.chave}: ${bairro ?? "número não encontrado"}`);
  await new Promise((ok) => setTimeout(ok, 1100));
}
mkdirSync("data/territorio", { recursive: true });
writeFileSync(destino, JSON.stringify({ fonte: "OpenStreetMap (Nominatim), número exato localizado no bairro do IBGE", url: "https://nominatim.org", enderecos }, null, 1));
