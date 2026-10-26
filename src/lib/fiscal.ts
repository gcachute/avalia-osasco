import type { AnoFiscal, CidadeFiscal, IndicadoresFiscais } from "./dados";
import { milhoes } from "./formato";

export type ChaveFiscal = "saude" | "educacao" | "fundeb" | "pessoal" | "investimento";

export const INDICADORES: { chave: ChaveFiscal; nome: string; maiorMelhor: boolean }[] = [
  { chave: "saude", nome: "Saúde", maiorMelhor: true },
  { chave: "educacao", nome: "Educação", maiorMelhor: true },
  { chave: "fundeb", nome: "FUNDEB p/ professores", maiorMelhor: true },
  { chave: "pessoal", nome: "Pessoal / RCL", maiorMelhor: false },
  { chave: "investimento", nome: "Investimento", maiorMelhor: true },
];

export const rotuloPeriodo = (a: AnoFiscal) => (a.completo ? "ano fechado" : `parcial, até o ${a.rreoPeriodo}º bimestre`);

// "3º de 7" entre as cidades com dado válido.
export function ranking(cidades: CidadeFiscal[], c: CidadeFiscal, k: ChaveFiscal) {
  const v = c.indicadores[k];
  const maiorMelhor = INDICADORES.find((i) => i.chave === k)!.maiorMelhor;
  const validos = cidades.map((x) => x.indicadores[k]).filter((x): x is number => x != null);
  if (v == null) return null;
  const melhores = validos.filter((x) => (maiorMelhor ? x > v : x < v)).length;
  return `${melhores + 1}º de ${validos.length}`;
}

export const primarioTexto = (p: IndicadoresFiscais["primario"]) => (p ? `${milhoes(p.resultado)} (meta ${milhoes(p.meta)})` : "—");
