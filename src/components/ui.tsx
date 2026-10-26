import { faixa, iniciais, nota } from "@/lib/formato";

export function Avatar({ nome, foto, tamanho = 40 }: { nome: string; foto: string | null; tamanho?: number }) {
  const style = { width: tamanho, height: tamanho, fontSize: tamanho * 0.38 };
  if (foto)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" style={style} className="shrink-0 rounded-full object-cover ring-1 ring-slate-200" />;
  return (
    <span style={style} className="grid shrink-0 place-items-center rounded-full bg-blue-100 font-semibold text-blue-900" aria-hidden>
      {iniciais(nome)}
    </span>
  );
}

export function NotaBadge({ valor, grande = false }: { valor: number | null; grande?: boolean }) {
  const f = faixa(valor);
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-lg px-2.5 py-1 font-semibold tabular-nums ring-1 ring-inset ${f.classe} ${grande ? "text-3xl" : "text-base"}`}>
      {nota(valor)}
      {grande && valor != null && <span className="text-sm font-medium">/ 10</span>}
    </span>
  );
}

export function Barra({ valor, classe = "bg-blue-700" }: { valor: number; classe?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${classe}`} style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%` }} />
    </div>
  );
}

export function Cartao({ titulo, valor, detalhe }: { titulo: string; valor: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-slate-500">{detalhe}</div>}
    </div>
  );
}

export function Secao({ titulo, children, id }: { titulo: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-10">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{titulo}</h2>
      {children}
    </section>
  );
}
