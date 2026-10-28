import { formatar } from "./indicadores";

// Porcentagem de um Censo a outro numa régua de 0 a 100%: o ano mais recente é o círculo cheio, os anteriores são
// vazios (o mais antigo, mais apagado). O texto mostra os valores em ordem e a mudança do primeiro ao último.
export function Halter({ nome, pontos, cidade, grande = false }: { nome: string; pontos: { ano: string; v: number | null | undefined }[]; cidade?: number | null; grande?: boolean }) {
  const com = pontos.filter((p): p is { ano: string; v: number } => p.v != null);
  if (!com.length) return null;
  const ultimo = com.at(-1)!;
  const mud = com.length > 1 ? ultimo.v - com[0].v : null;
  const vs = com.map((p) => p.v);
  const d = grande ? "h-3 w-3 -top-0.5" : "h-2 w-2 top-0.5";
  return (
    <div>
      <div className={`flex items-baseline justify-between gap-2 ${grande ? "text-sm" : "text-xs"}`}>
        <span className="text-slate-700">{nome}</span>
        <span className="shrink-0 tabular-nums text-slate-500">
          {com.slice(0, -1).map((p) => (
            <span key={p.ano} title={p.ano}>
              {formatar(p.v, "pct")} →{" "}
            </span>
          ))}
          <b className="text-slate-900" title={ultimo.ano}>
            {formatar(ultimo.v, "pct")}
          </b>{" "}
          <span className={`font-semibold text-slate-700 ${grande ? "text-xs" : ""}`}>{formatar(mud, "pp")}</span>
        </span>
      </div>
      <div className={`relative mt-1 rounded-full bg-slate-100 ${grande ? "h-2" : "h-1.5"}`}>
        {com.length > 1 && (
          <div
            className="absolute h-full rounded-full"
            style={{ left: `${Math.min(...vs)}%`, width: `${Math.max(...vs) - Math.min(...vs)}%`, background: "var(--grafico-1)", opacity: 0.6 }}
          />
        )}
        {com.map((p, i) => {
          const atual = i === com.length - 1;
          return (
            <span
              key={p.ano}
              title={`${p.ano}: ${formatar(p.v, "pct")}`}
              className={`absolute ${d} -translate-x-1/2 rounded-full ${atual ? "" : "border-2 bg-white"}`}
              style={{
                left: `${p.v}%`,
                ...(atual ? { background: "var(--grafico-1)" } : { borderColor: "var(--grafico-1)", opacity: i === 0 && com.length > 2 ? 0.5 : 1 }),
              }}
            />
          );
        })}
      </div>
      {cidade != null && <div className="text-right text-[10px] text-slate-400">Osasco: {formatar(cidade, "pp")}</div>}
    </div>
  );
}

// Legenda dos círculos para uma lista de anos.
export const legendaHalter = (anos: string[]) =>
  anos.length > 2
    ? `Círculos vazios: ${anos.slice(0, -1).join(" (mais claro) e ")}; cheio: ${anos.at(-1)}.`
    : `Círculo vazio: ${anos[0]}; cheio: ${anos.at(-1)}.`;
