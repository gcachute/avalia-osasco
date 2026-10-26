import type { IndiceIegm } from "./dados";

export const INDICES_IEGM: { chave: IndiceIegm; nome: string }[] = [
  { chave: "iegm", nome: "IEG-M geral" },
  { chave: "iplanejamento", nome: "Planejamento" },
  { chave: "ifiscal", nome: "Gestão fiscal" },
  { chave: "ieduc", nome: "Educação" },
  { chave: "isaude", nome: "Saúde" },
  { chave: "iamb", nome: "Meio ambiente" },
  { chave: "icidade", nome: "Cidades e defesa civil" },
  { chave: "igov", nome: "Governança de TI" },
];

// Faixas oficiais do TCE-SP.
export const FAIXAS: Record<string, { nome: string; classe: string }> = {
  A: { nome: "Altamente efetiva", classe: "bg-emerald-100 text-emerald-900 ring-emerald-300" },
  "B+": { nome: "Muito efetiva", classe: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  B: { nome: "Efetiva", classe: "bg-lime-50 text-lime-800 ring-lime-200" },
  "C+": { nome: "Em fase de adequação", classe: "bg-amber-50 text-amber-800 ring-amber-200" },
  C: { nome: "Baixo nível de adequação", classe: "bg-rose-50 text-rose-800 ring-rose-200" },
};
