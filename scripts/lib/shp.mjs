// Leitor mínimo de shapefile (polígonos) + dBASE, o suficiente para as malhas do IBGE.
// Devolve features GeoJSON com as propriedades do .dbf.

export function lerDbf(buf, encoding = "utf-8") {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const n = dv.getUint32(4, true);
  const tamCabecalho = dv.getUint16(8, true);
  const tamRegistro = dv.getUint16(10, true);
  const dec = new TextDecoder(encoding);
  const campos = [];
  for (let p = 32; buf[p] !== 0x0d; p += 32) {
    const nome = dec.decode(buf.subarray(p, p + 11)).replace(/\0.*$/, "");
    campos.push({ nome, tipo: String.fromCharCode(buf[p + 11]), tam: buf[p + 16] });
  }
  const registros = [];
  for (let i = 0; i < n; i++) {
    let p = tamCabecalho + i * tamRegistro + 1;
    const r = {};
    for (const c of campos) {
      const bruto = dec.decode(buf.subarray(p, p + c.tam)).trim();
      r[c.nome] = c.tipo === "N" || c.tipo === "F" ? (bruto === "" ? null : Number(bruto)) : bruto;
      p += c.tam;
    }
    registros.push(r);
  }
  return registros;
}

export function lerShp(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const geometrias = [];
  let p = 100;
  while (p < buf.byteLength) {
    const tamanho = dv.getInt32(p + 4, false) * 2;
    const tipo = dv.getInt32(p + 8, true);
    if (tipo === 0) {
      geometrias.push(null);
    } else if (tipo === 5 || tipo === 15 || tipo === 25) {
      const nPartes = dv.getInt32(p + 44, true);
      const nPontos = dv.getInt32(p + 48, true);
      const partes = Array.from({ length: nPartes }, (_, k) => dv.getInt32(p + 52 + 4 * k, true));
      const base = p + 52 + 4 * nPartes;
      const aneis = partes.map((ini, k) => {
        const fim = k + 1 < nPartes ? partes[k + 1] : nPontos;
        const anel = [];
        for (let j = ini; j < fim; j++) anel.push([dv.getFloat64(base + 16 * j, true), dv.getFloat64(base + 16 * j + 8, true)]);
        return anel;
      });
      geometrias.push(agruparAneis(aneis));
    } else throw new Error(`Tipo de shape ${tipo} não suportado`);
    p += 8 + tamanho;
  }
  return geometrias;
}

// No shapefile, anéis externos giram no sentido horário e buracos no anti-horário.
const areaAssinada = (anel) => anel.reduce((a, [x1, y1], i) => {
  const [x2, y2] = anel[(i + 1) % anel.length];
  return a + (x2 - x1) * (y2 + y1);
}, 0);

function agruparAneis(aneis) {
  const poligonos = [];
  for (const anel of aneis) {
    if (areaAssinada(anel) > 0 || !poligonos.length) poligonos.push([anel]);
    else poligonos.at(-1).push(anel);
  }
  return poligonos.length === 1 ? { type: "Polygon", coordinates: poligonos[0] } : { type: "MultiPolygon", coordinates: poligonos };
}

export function lerShapefile(shp, dbf, encoding) {
  const props = lerDbf(dbf, encoding);
  return lerShp(shp).map((geometry, i) => ({ type: "Feature", properties: props[i], geometry }));
}
