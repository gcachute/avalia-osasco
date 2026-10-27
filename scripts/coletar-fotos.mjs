// Baixa as fotos dos políticos para public/fotos, para o site não depender de imagens hospedadas em outro lugar.
// Ordem de preferência: foto oficial do site da Câmara; se não der, a foto da candidatura de 2024 no TSE.
// O TSE publica todas as fotos de SP num zip de mais de 2 GB: lemos só o índice do zip e as fotos de
// que precisamos, com pedidos parciais (HTTP Range). Gera data/fotos.json com a fonte de cada foto.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "fflate";

const ZIP_TSE = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2024/fotos/foto_cand2024_SP_div.zip";
const FONTE_CAMARA = "Câmara Municipal de Osasco";
const FONTE_TSE = "TSE, fotos de candidatura das eleições de 2024";
const headers = { "User-Agent": "avalia-osasco/0.1 (coleta de dados publicos)" };

const dados = JSON.parse(readFileSync("src/data/dados.json", "utf8"));
const eleicao = existsSync("data/territorio/eleicao-2024.json") ? JSON.parse(readFileSync("data/territorio/eleicao-2024.json", "utf8")) : null;
const anterior = existsSync("data/fotos.json") ? JSON.parse(readFileSync("data/fotos.json", "utf8")) : {};
const norm = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/\s*\(suplente\)\s*$/i, "").replace(/\s+/g, " ").trim().toUpperCase();

async function baixar(url, opcoes = {}) {
  const res = await fetch(url, { headers: { ...headers, ...(opcoes.headers ?? {}) }, signal: AbortSignal.timeout(opcoes.timeout ?? 20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
const intervalo = (ini, fim) => baixar(ZIP_TSE, { headers: { Range: `bytes=${ini}-${fim}` }, timeout: 120000 });
const ehImagem = (b) => b.length > 1000 && ((b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50));

// ---------- índice do zip do TSE (diretório central, com suporte a ZIP64) ----------
let indice = null;
async function indiceTse() {
  if (indice) return indice;
  const tamanho = Number((await fetch(ZIP_TSE, { method: "HEAD", headers })).headers.get("content-length"));
  const cauda = await intervalo(tamanho - 65536, tamanho - 1);
  const dv = new DataView(cauda.buffer);
  let eocd = -1;
  for (let i = cauda.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  let inicioDir = dv.getUint32(eocd + 16, true);
  let tamDir = dv.getUint32(eocd + 12, true);
  if (inicioDir === 0xffffffff || tamDir === 0xffffffff) {
    const loc = eocd - 20; // localizador do ZIP64
    const ofsZ64 = Number(dv.getBigUint64(loc + 8, true));
    const rec = new DataView((await intervalo(ofsZ64, ofsZ64 + 55)).buffer);
    tamDir = Number(rec.getBigUint64(40, true));
    inicioDir = Number(rec.getBigUint64(48, true));
  }
  console.log(`Lendo o índice do zip do TSE (${(tamDir / 1e6).toFixed(1)} MB de ${(tamanho / 1e9).toFixed(2)} GB)...`);
  const dir = await intervalo(inicioDir, inicioDir + tamDir - 1);
  const d = new DataView(dir.buffer);
  const dec = new TextDecoder();
  indice = new Map();
  for (let p = 0; p + 46 <= dir.length && d.getUint32(p, true) === 0x02014b50; ) {
    const metodo = d.getUint16(p + 10, true);
    let comp = d.getUint32(p + 20, true);
    const nLen = d.getUint16(p + 28, true), xLen = d.getUint16(p + 30, true), cLen = d.getUint16(p + 32, true);
    let ofs = d.getUint32(p + 42, true);
    const nome = dec.decode(dir.subarray(p + 46, p + 46 + nLen));
    // Campos extras ZIP64: tamanhos e posição de 64 bits, na ordem em que estão marcados com 0xFFFFFFFF.
    for (let e = p + 46 + nLen; e < p + 46 + nLen + xLen; ) {
      const id = d.getUint16(e, true), sz = d.getUint16(e + 2, true);
      if (id === 0x0001) {
        let q = e + 4;
        if (d.getUint32(p + 24, true) === 0xffffffff) q += 8;
        if (comp === 0xffffffff) (comp = Number(d.getBigUint64(q, true))), (q += 8);
        if (ofs === 0xffffffff) ofs = Number(d.getBigUint64(q, true));
      }
      e += 4 + sz;
    }
    const sq = nome.match(/(\d{9,})/)?.[1];
    if (sq) indice.set(sq, { nome, metodo, comp, ofs });
    p += 46 + nLen + xLen + cLen;
  }
  console.log(`${indice.size} fotos no zip do TSE`);
  return indice;
}

async function fotoTse(sq) {
  const e = (await indiceTse()).get(String(sq));
  if (!e) return null;
  const cab = new DataView((await intervalo(e.ofs, e.ofs + 29)).buffer);
  const inicio = e.ofs + 30 + cab.getUint16(26, true) + cab.getUint16(28, true);
  const bruto = await intervalo(inicio, inicio + e.comp - 1);
  return e.metodo === 8 ? inflateSync(bruto) : bruto;
}

// ---------- quem precisa de foto ----------
const candidatos = new Map();
for (const cargo of Object.values(eleicao?.cargos ?? {})) for (const c of cargo.candidatos) if (c.sq) candidatos.set(norm(c.nome), c.sq);
const pessoas = [
  ...dados.vereadores.map((v) => ({
    id: v.id,
    pasta: "vereadores",
    nome: v.nome,
    url: v.foto && !v.foto.startsWith("/") ? v.foto : (anterior[v.id]?.original ?? null),
    sq: candidatos.get(norm(v.perfil?.nomeCompleto)) ?? candidatos.get(norm(dados.mapa?.votosVereador?.[v.id]?.nomeUrna)) ?? null,
  })),
  {
    id: "prefeito",
    pasta: "",
    nome: dados.prefeito.nome,
    url: dados.prefeito.foto && !dados.prefeito.foto.startsWith("/") ? dados.prefeito.foto : (anterior.prefeito?.original ?? null),
    sq: eleicao?.cargos["prefeito-1"]?.candidatos[0]?.sq ?? null,
  },
];

mkdirSync("public/fotos/vereadores", { recursive: true });
const saida = {};
for (const p of pessoas) {
  const arquivo = `/fotos/${p.pasta ? p.pasta + "/" : ""}${p.id}.jpg`;
  let img = null, fonte = null;
  if (p.url) {
    try {
      const b = await baixar(p.url);
      if (ehImagem(b)) (img = b), (fonte = /wikimedia/.test(p.url) ? FONTE_TSE : FONTE_CAMARA);
    } catch (e) {
      console.warn(`  ${p.nome}: foto original indisponível (${e.message})`);
    }
  }
  if (!img && p.sq) {
    try {
      const b = await fotoTse(p.sq);
      if (b && ehImagem(b)) (img = b), (fonte = FONTE_TSE);
    } catch (e) {
      console.warn(`  ${p.nome}: foto do TSE indisponível (${e.message})`);
    }
  }
  if (img) {
    writeFileSync(`public${arquivo}`, img);
    saida[p.id] = { arquivo, fonte, original: p.url ?? null };
  } else if (anterior[p.id] && existsSync(`public${anterior[p.id].arquivo}`)) {
    saida[p.id] = anterior[p.id]; // mantém a que já foi baixada antes
  }
  console.log(`${saida[p.id] ? "ok " : "-- "} ${p.nome}: ${saida[p.id]?.fonte ?? "sem foto (o site mostra as iniciais)"}`);
}
writeFileSync("data/fotos.json", JSON.stringify(saida, null, 1));
