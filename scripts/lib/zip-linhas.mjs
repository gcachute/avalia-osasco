// Lê um .csv dentro de um .zip linha a linha, sem descompactar tudo na memória
// (o arquivo de votação por seção do TSE passa de 4 GB descompactado).
import { createReadStream } from "node:fs";
import { Unzip, UnzipInflate } from "fflate";

export async function* linhasDoZip(caminho, { arquivo = /\.csv$/i, encoding = "latin1" } = {}) {
  const fila = [];
  let fim = false;
  let erro = null;
  let acordar = null;
  const avisa = () => acordar?.();

  const dec = new TextDecoder(encoding);
  let resto = "";
  const unzip = new Unzip((f) => {
    if (!arquivo.test(f.name)) return;
    f.ondata = (err, dados, final) => {
      if (err) return (erro = err), avisa();
      const texto = resto + dec.decode(dados, { stream: !final });
      const linhas = texto.split(/\r?\n/);
      resto = final ? "" : linhas.pop();
      if (final && !linhas.at(-1)) linhas.pop();
      fila.push(...linhas);
      avisa();
    };
    f.start();
  });
  unzip.register(UnzipInflate);

  const leitor = createReadStream(caminho, { highWaterMark: 1 << 20 });
  leitor.on("data", (pedaco) => {
    unzip.push(new Uint8Array(pedaco));
    if (fila.length > 200000) leitor.pause();
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
      const lote = fila.splice(0, fila.length);
      for (const l of lote) yield l;
      if (leitor.isPaused()) leitor.resume();
      continue;
    }
    if (fim) return;
    await new Promise((r) => (acordar = r));
    acordar = null;
  }
}

// Divide uma linha de CSV com ";" e aspas duplas.
export const camposCsv = (linha) => linha.split(";").map((c) => c.replace(/^"|"$/g, ""));
