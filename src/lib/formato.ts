// Formatação pura, sem importar os dados: pode ser usada em componentes do navegador.
export const num = (v: number | null | undefined, casas = 1) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Dinheiro nunca é arredondado para cima: as casas que não cabem são cortadas (R$ 639.773.139 vira "R$ 639,7 mi").
// O valor exato aparece no detalhe (reaisExato).
const corta = (v: number, casas: number) => {
  const f = 10 ** casas;
  return Math.trunc(v * f + (v >= 0 ? 1e-9 : -1e-9)) / f;
};
export const milhoes = (v: number) => `${v < 0 ? "−" : ""}R$ ${num(corta(Math.abs(v) / 1e6, 0), 0)} mi`;

export const reais = (v: number, casas = 0) => `R$ ${num(corta(v, casas), casas)}`;
export const milReais = (v: number) => `R$ ${num(corta(v / 1e3, 1), 1)} mil`;
// Valor completo, com centavos: R$ 639.773.139,17.
export const reaisExato = (v: number) => `${v < 0 ? "−" : ""}R$ ${num(Math.abs(v), 2)}`;
// Valores grandes de dinheiro, curtos e cortados (não arredondados): R$ 639,7 mi, R$ 2,1 mi, R$ 850 mil.
export const dinheiroCurto = (v: number): string =>
  v < 0
    ? `−${dinheiroCurto(-v)}`
    : v >= 1e6
      ? `R$ ${num(corta(v / 1e6, 1), 1)} mi`
      : v >= 1e3
        ? `R$ ${num(corta(v / 1e3, 0), 0)} mil`
        : reais(v);

export const nota10 = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100) / 10);

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

export const nota = (v: number | null) => (v == null ? "—" : v.toFixed(1).replace(".", ","));

export const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function faixa(v: number | null) {
  if (v == null) return { texto: "Sem nota", classe: "bg-slate-100 text-slate-500 ring-slate-200" };
  if (v >= 7) return { texto: "Bom", classe: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  if (v >= 5) return { texto: "Regular", classe: "bg-amber-50 text-amber-800 ring-amber-200" };
  return { texto: "Fraco", classe: "bg-rose-50 text-rose-800 ring-rose-200" };
}

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-Z]/.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

// Arquivos de public/ (como as fotos baixadas) precisam do prefixo do GitHub Pages (/avalia-osasco).
export const comBase = (src: string) => (src.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}` : src);
