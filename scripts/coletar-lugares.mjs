// Ruas, córregos e lugares com nome em Osasco (OpenStreetMap), com os bairros por onde cada um passa.
// Rode com: npm run coletar:lugares   (depois: npm run dados)
//
// Textos oficiais de emendas e pagamentos raramente citam o bairro; citam a rua ("Rua Pedro Rissato"), o córrego
// ("Córrego Rico") ou o prédio ("Espaço Cultural Grande Otelo"). Uma consulta ao Overpass (servidor público do
// OpenStreetMap) traz as vias, os cursos d'água e os lugares com nome dentro do município; cada vértice é localizado no
// bairro oficial do IBGE. Ruas com o mesmo nome em pontos diferentes da cidade (trechos que não se ligam) ficam marcadas
// como ambíguas e não são usadas. Gera data/territorio/lugares.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { localizadorDeBairros } from "./lib/bairros.mjs";

const CONSULTA = `[out:json][timeout:180];
area["name"="Osasco"]["boundary"="administrative"]["admin_level"="8"]->.a;
(
  way["highway"]["name"](area.a);
  way["waterway"]["name"](area.a);
  nwr["amenity"]["name"](area.a);
  nwr["leisure"]["name"](area.a);
  nwr["building"]["name"](area.a);
  nwr["tourism"]["name"](area.a);
);
out body geom;`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "avalia-osasco/0.1 (coleta de dados publicos)" },
  body: new URLSearchParams({ data: CONSULTA }),
});
if (!res.ok) throw new Error(`Overpass respondeu ${res.status}`);
const { elements } = await res.json();
console.log(`OpenStreetMap: ${elements.length} elementos com nome`);

const localiza = await localizadorDeBairros();
const tipoDe = (t) => (t.highway ? "via" : t.waterway ? "curso d'água" : "lugar");

// Agrupa por nome e tipo; vias e cursos d'água com o mesmo nome só contam como um lugar quando os trechos se ligam
// (compartilham um nó). Senão, o nome é ambíguo.
const grupos = new Map();
for (const e of elements) {
  const nome = e.tags?.name?.trim();
  if (!nome) continue;
  const tipo = tipoDe(e.tags);
  const k = `${tipo}|${nome}`;
  const g = grupos.get(k) ?? { nome, tipo, partes: [] };
  const pontos = e.geometry ?? (e.lat != null ? [{ lon: e.lon, lat: e.lat }] : e.center ? [{ lon: e.center.lon, lat: e.center.lat }] : e.bounds ? [{ lon: (e.bounds.minlon + e.bounds.maxlon) / 2, lat: (e.bounds.minlat + e.bounds.maxlat) / 2 }] : []);
  g.partes.push({ nos: e.nodes ?? [], pontos });
  grupos.set(k, g);
}

const lugares = [];
let ambiguos = 0;
for (const g of grupos.values()) {
  // Componentes ligados (união por nós compartilhados).
  const pai = g.partes.map((_, i) => i);
  const acha = (i) => (pai[i] === i ? i : (pai[i] = acha(pai[i])));
  const porNo = new Map();
  g.partes.forEach((p, i) => {
    for (const n of p.nos) {
      if (porNo.has(n)) pai[acha(i)] = acha(porNo.get(n));
      else porNo.set(n, i);
    }
  });
  const componentes = new Set(g.partes.map((_, i) => acha(i)));
  if (g.tipo !== "lugar" && componentes.size > 1) {
    ambiguos++;
    continue;
  }
  if (g.tipo === "lugar" && g.partes.length > 1) {
    ambiguos++;
    continue;
  }
  const bairros = new Set();
  for (const p of g.partes) for (const pt of p.pontos) {
    const b = localiza(pt.lon, pt.lat);
    if (b) bairros.add(b);
  }
  if (bairros.size) lugares.push({ nome: g.nome, tipo: g.tipo, bairros: [...bairros].sort() });
}
lugares.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
console.log(`Lugares: ${lugares.length} (${lugares.filter((l) => l.tipo === "via").length} vias, ${lugares.filter((l) => l.tipo === "curso d'água").length} cursos d'água); ${ambiguos} nomes ambíguos ficaram de fora`);
mkdirSync("data/territorio", { recursive: true });
writeFileSync(
  "data/territorio/lugares.json",
  JSON.stringify({ fonte: "OpenStreetMap (colaboradores), via Overpass", url: "https://www.openstreetmap.org/copyright", coletadoEm: new Date().toISOString().slice(0, 10), lugares }, null, 0),
);
