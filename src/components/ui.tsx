import { faixa, nota } from "@/lib/formato";
import { Foto } from "./Foto";

export function Avatar({ nome, foto, tamanho = 40 }: { nome: string; foto: string | null; tamanho?: number }) {
  const style = { width: tamanho, height: tamanho, fontSize: tamanho * 0.38 };
  return (
    <Foto
      nome={nome}
      foto={foto}
      alt=""
      style={style}
      className="shrink-0 rounded-full object-cover object-top ring-1 ring-slate-200"
      classeIniciais="grid shrink-0 place-items-center rounded-full bg-blue-100 font-semibold text-blue-900"
    />
  );
}

// Foto em formato retrato (3:4), para cards e cabeçalhos de perfil.
export function Retrato({ nome, foto, className = "" }: { nome: string; foto: string | null; className?: string }) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden bg-slate-100 ${className}`}>
      <Foto
        nome={nome}
        foto={foto}
        alt={`Foto de ${nome}`}
        className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
        classeIniciais="grid h-full w-full place-items-center bg-gradient-to-br from-blue-50 to-slate-100 text-4xl font-semibold text-blue-900"
      />
    </div>
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

export function Barra({ valor, classe = "bg-blue-700", altura = "h-2" }: { valor: number; classe?: string; altura?: string }) {
  return (
    <div className={`${altura} w-full overflow-hidden rounded-full bg-slate-100`}>
      <div className={`barra-anim h-full rounded-full ${classe}`} style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%` }} />
    </div>
  );
}

export function Cartao({ titulo, valor, detalhe }: { titulo: string; valor: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <div className="revelar rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-sm text-slate-500">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-slate-500">{detalhe}</div>}
    </div>
  );
}

export function Secao({ titulo, children, id, subtitulo }: { titulo: string; children: React.ReactNode; id?: string; subtitulo?: React.ReactNode }) {
  return (
    <section id={id} className="revelar mt-12 scroll-mt-20">
      <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
      {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
