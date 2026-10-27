// Bairros oficiais de Osasco (IBGE, Censo 2022) e reconhecimento de bairros citados em textos
// (ementas de projetos, moções, requerimentos, leis).
import { existsSync, readFileSync } from "node:fs";

const dobra = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[’'`´]/g, "'")
    .toLowerCase();

// Prefixos que, antes de um nome, indicam que se trata de um lugar.
const LUGAR = "(?:jardim|jd\\.?|vila|vl\\.?|parque|pq\\.?|bairro|bairros|conjunto|residencial|cidade|regiao d[oa])\\s+(?:d[aoe]s?\\s+)?";

// Nomes que também são palavras comuns, santos ou rodovias: só contam com um prefixo de lugar.
const AMBIGUOS = new Set([
  "alianca", "bandeiras", "bela vista", "bonfim", "castelo branco", "centro", "padroeira", "platina", "raposo tavares", "santa fe",
  "santa maria", "santo antonio", "sao pedro", "metalurgicos", "pestana", "veloso", "baronesa", "remedios", "umuarama", "bonanca",
]);

// Grafias alternativas encontradas nos documentos.
const VARIANTES = {
  quintauna: ["quitauna", "quintauna"],
  rochdale: ["rochdale", "rochdalle", "rochdalle"],
  "km 18": ["km 18", "km18", "quilometro 18"],
  iapi: ["iapi", "conjunto iapi"],
  "jardim d'abril": ["jardim d'abril", "jardim d abril", "jardim dabril", "jd\\.? d'abril"],
  "portal d'oeste": ["portal d'oeste", "portal do oeste", "portal d oeste"],
  "munhoz junior": ["munhoz junior", "munhoz jr\\.?"],
  "city bussocaba": ["city bussocaba"],
  "cidade de deus": ["cidade de deus"],
  "setor militar": ["setor militar"],
  "vila militar": ["vila militar"],
  "industrial remedios": ["industrial remedios", "industrial dos remedios"],
};

export function carregarBairros() {
  if (!existsSync("data/bairros.json")) return null;
  return JSON.parse(readFileSync("data/bairros.json", "utf8"));
}

// Monta um reconhecedor para a lista de bairros. Nomes mais longos primeiro, para
// "City Bussocaba" não virar também "Bussocaba", e "Industrial Remédios" não virar "Remédios".
export function reconhecedorDeBairros(bairros) {
  const regras = bairros
    .map((b) => {
      const chave = dobra(b.nome);
      const formas = VARIANTES[chave] ?? [chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")];
      const nucleo = `(?:${formas.join("|")})`;
      const prefixo = AMBIGUOS.has(chave) ? LUGAR : `(?:${LUGAR})?`;
      return { id: b.id, tam: chave.length, re: new RegExp(`(?<![\\p{L}\\d])${prefixo}${nucleo}(?![\\p{L}\\d])`, "gu") };
    })
    .sort((a, b) => b.tam - a.tam);

  return (texto) => {
    let t = dobra(texto);
    const achados = new Set();
    for (const r of regras) {
      t = t.replace(r.re, (m) => {
        achados.add(r.id);
        return " ".repeat(m.length);
      });
    }
    return [...achados];
  };
}
