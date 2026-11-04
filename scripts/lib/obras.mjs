import { existsSync, readFileSync } from "node:fs";

// Obras do cadastro federal (Obrasgov) com o ponto que o próprio cadastro guarda para cada uma (scripts/coletar-cidade.mjs).
// Um mesmo ponto usado por 5 ou mais obras diferentes é um endereço genérico, e não o lugar da obra: esses pontos ficam
// fora do mapa e a obra fica sem bairro.
const PONTO_GENERICO = 5;
const chave = (p) => `${p.lon.toFixed(4)},${p.lat.toFixed(4)}`;

export function obrasFederais() {
  const arquivo = "data/cidade/obras-federais.json";
  if (!existsSync(arquivo)) return null;
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const uso = {};
  for (const o of dados.obras) for (const k of new Set((o.pontos ?? []).map(chave))) uso[k] = (uso[k] ?? 0) + 1;
  const obras = dados.obras.map((o) => {
    const pontos = (o.pontos ?? []).filter((p) => uso[chave(p)] < PONTO_GENERICO);
    return {
      ...o,
      pontos,
      bairros: [...new Set(pontos.map((p) => p.bairro))],
      localGenerico: (o.pontos ?? []).length > 0 && pontos.length === 0,
      valor: Math.round(o.fontes.reduce((s, f) => s + (f.valor ?? 0), 0) * 100) / 100,
    };
  });
  return { ...dados, obras };
}
