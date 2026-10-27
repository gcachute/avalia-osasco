// Formatação pura, sem importar os dados: pode ser usada em componentes do navegador.
export const num = (v: number | null | undefined, casas = 1) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const milhoes = (v: number) => `${v < 0 ? "−" : ""}R$ ${num(Math.abs(v) / 1e6, 0)} mi`;

export const reais = (v: number, casas = 0) => `R$ ${num(v, casas)}`;
export const milReais = (v: number) => `R$ ${num(v / 1e3, 1)} mil`;

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
