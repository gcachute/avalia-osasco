// Lê planilhas .xlsx gigantes (como as da SSP-SP, com milhões de linhas) linha a linha.
// Só os textos compartilhados ficam na memória; o XML das abas é processado em pedaços.
import { createReadStream, readFileSync } from "node:fs";
import { Unzip, UnzipInflate, unzipSync, strFromU8 } from "fflate";

const decodifica = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
const texto = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodifica(m[1])).join("");
const coluna = (ref) => {
  let n = 0;
  for (const ch of ref.match(/^[A-Z]+/)[0]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

// Gera as linhas (arrays de texto) das abas cujo nome casa com `abas`, na ordem do arquivo.
export async function* linhasXlsx(caminho, abas = /./) {
  const pequenos = unzipSync(new Uint8Array(readFileSync(caminho)), {
    filter: (f) => /^(xl\/sharedStrings\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels)$/.test(f.name),
  });
  const compartilhados = [];
  const sst = strFromU8(pequenos["xl/sharedStrings.xml"] ?? new Uint8Array());
  for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) compartilhados.push(texto(m[1]));
  const rels = strFromU8(pequenos["xl/_rels/workbook.xml.rels"]);
  const alvo = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/Id="([^"]+)"/)?.[1];
    const t = m[0].match(/Target="([^"]+)"/)?.[1];
    if (id && t) alvo[id] = "xl/" + t.replace(/^\/?xl\//, "");
  }
  const arquivos = new Set();
  for (const m of strFromU8(pequenos["xl/workbook.xml"]).matchAll(/<sheet\b[^>]*>/g)) {
    const nome = decodifica(m[0].match(/name="([^"]*)"/)?.[1] ?? "");
    if (abas.test(nome)) arquivos.add(alvo[m[0].match(/r:id="([^"]+)"/)?.[1]]);
  }

  const fila = [];
  let fim = false, erro = null, acordar = null;
  const avisa = () => acordar?.();
  const dec = new TextDecoder("utf-8");
  let resto = "";
  const linha = (xml) => {
    const cel = [];
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = c[1].match(/r="([A-Z]+)\d+"/)?.[1];
      if (!ref || !c[2]) continue;
      const tipo = c[1].match(/t="([^"]+)"/)?.[1];
      let v;
      if (tipo === "inlineStr") v = texto(c[2]);
      else {
        const bruto = c[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (bruto === undefined) continue;
        v = tipo === "s" ? compartilhados[Number(bruto)] : decodifica(bruto);
      }
      cel[coluna(ref)] = v;
    }
    return Array.from(cel, (x) => x ?? "");
  };

  const unzip = new Unzip((f) => {
    if (!arquivos.has(f.name)) return;
    f.ondata = (err, dados, final) => {
      if (err) return (erro = err), avisa();
      let t = resto + dec.decode(dados, { stream: !final });
      let ultimo = 0;
      for (const m of t.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        fila.push(linha(m[1]));
        ultimo = m.index + m[0].length;
      }
      resto = final ? "" : t.slice(ultimo);
      t = null;
      avisa();
    };
    f.start();
  });
  unzip.register(UnzipInflate);

  const leitor = createReadStream(caminho, { highWaterMark: 1 << 20 });
  leitor.on("data", (p) => {
    unzip.push(new Uint8Array(p));
    if (fila.length > 100000) leitor.pause();
  });
  leitor.on("end", () => {
    unzip.push(new Uint8Array(0), true);
    fim = true;
    avisa();
  });
  leitor.on("error", (e) => ((erro = e), avisa()));

  while (true) {
    if (erro) throw erro;
    if (fila.length) {
      for (const l of fila.splice(0, fila.length)) yield l;
      if (leitor.isPaused()) leitor.resume();
      continue;
    }
    if (fim) return;
    await new Promise((r) => (acordar = r));
    acordar = null;
  }
}
