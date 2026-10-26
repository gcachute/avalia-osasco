// Leitor mínimo de .xlsx: devolve as planilhas como matrizes de texto.
// As planilhas da Câmara são montadas à mão, então só precisamos do texto de cada célula.
import { unzipSync, strFromU8 } from "fflate";

const decodeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

const textOf = (xml) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");

const colIndex = (ref) => {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

export function readWorkbook(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const read = (path) => (files[path] ? strFromU8(files[path]) : null);

  const shared = [];
  const sst = read("xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));

  // Ordem das abas segundo o workbook (sheet1.xml nem sempre é a primeira aba).
  const rels = read("xl/_rels/workbook.xml.rels") ?? "";
  const target = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/Id="([^"]+)"/)?.[1];
    const t = m[0].match(/Target="([^"]+)"/)?.[1];
    if (id && t) target[id] = "xl/" + t.replace(/^\/?xl\//, "").replace(/^\//, "");
  }
  const wb = read("xl/workbook.xml") ?? "";
  const sheets = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(m[0].match(/name="([^"]*)"/)?.[1] ?? "");
    const rid = m[0].match(/r:id="([^"]+)"/)?.[1];
    const xml = read(target[rid]);
    if (xml) sheets.push({ name, rows: parseSheet(xml, shared) });
  }
  return sheets;
}

function parseSheet(xml, shared) {
  const rows = [];
  for (const rm of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const r = Number(rm[1].match(/r="(\d+)"/)?.[1]) - 1;
    const cells = [];
    for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref || !cm[2]) continue;
      const type = attrs.match(/t="([^"]+)"/)?.[1];
      let value;
      if (type === "inlineStr") value = textOf(cm[2]);
      else {
        const v = cm[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (v === undefined) continue;
        value = type === "s" ? shared[Number(v)] : decodeXml(v);
      }
      cells[colIndex(ref)] = value ?? "";
    }
    rows[r] = Array.from(cells, (c) => c ?? "");
  }
  return Array.from(rows, (r) => r ?? []);
}
