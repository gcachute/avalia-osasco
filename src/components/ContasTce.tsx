"use client";

import { useState } from "react";

type Etapa = { etapa: "parecer" | "reexame" | "embargos"; data: string | null; url: string; resultado: string | null; mudou: boolean };
export type AnoTce = { exercicio: number; processo: string; final: "favorável" | "desfavorável" | null; etapas: Etapa[] };
export type MandatoTce = { inicio: number; fim: number; prefeito: string | null };

const ETAPA = { parecer: "Parecer prévio", reexame: "Pedido de reexame", embargos: "Embargos" } as const;
const EXPLICA = {
  parecer: "Primeira decisão do Tribunal sobre as contas do ano.",
  reexame: "A Prefeitura pediu que o Tribunal analisasse de novo.",
  embargos: "A Prefeitura apontou dúvida ou omissão na decisão anterior.",
} as const;

const estilo = (f: AnoTce["final"] | undefined) =>
  f === "favorável"
    ? "bg-blue-50 text-blue-900 ring-blue-300"
    : f === "desfavorável"
      ? "bg-rose-50 text-rose-800 ring-rose-300"
      : "border border-dashed border-slate-400 bg-white text-slate-500 ring-transparent";

// Forma além da cor: visto para favorável, x para desfavorável, traço para ano sem parecer.
function Simbolo({ f }: { f: AnoTce["final"] | undefined }) {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
      {f === "favorável" ? (
        <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : f === "desfavorável" ? (
        <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M3 6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

// Uma faixa por mandato, com uma casa por ano. Tocar no ano abre, embaixo, cada decisão do Tribunal sobre aquelas contas.
export function ContasTce({ anos, mandatos }: { anos: AnoTce[]; mandatos: MandatoTce[] }) {
  const porAno = new Map(anos.map((a) => [a.exercicio, a]));
  const comParecer = [...anos].filter((a) => a.final).sort((a, b) => b.exercicio - a.exercicio);
  const [escolhido, setEscolhido] = useState(comParecer[0]?.exercicio ?? anos.at(-1)?.exercicio ?? null);
  const atual = escolhido != null ? porAno.get(escolhido) : undefined;
  const mandato = mandatos.find((m) => escolhido != null && escolhido >= m.inicio && escolhido <= m.fim);
  const conta = (f: AnoTce["final"]) => anos.filter((a) => a.final === f).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
        {(
          [
            ["favorável", "Parecer favorável"],
            ["desfavorável", "Parecer desfavorável"],
            [null, "Sem parecer na consulta"],
          ] as const
        ).map(([f, nome]) => (
          <span key={nome} className="flex items-center gap-1.5">
            <span className={`flex h-5 w-5 items-center justify-center rounded ring-1 ring-inset ${estilo(f)}`}>
              <Simbolo f={f} />
            </span>
            {nome} <span className="tabular-nums text-slate-500">({conta(f)})</span>
          </span>
        ))}
      </div>

      <ol className="mt-4 flex flex-wrap gap-x-5 gap-y-4">
        {mandatos.map((m) => (
          <li key={m.inicio} className="min-w-0">
            <div className="text-xs text-slate-600">
              <span className="tabular-nums">
                {m.inicio}–{m.fim}
              </span>
              {m.prefeito && <span className="font-bold text-slate-900">, {m.prefeito}</span>}
            </div>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: m.fim - m.inicio + 1 }, (_, k) => m.inicio + k).map((ano) => {
                const a = porAno.get(ano);
                const ativo = ano === escolhido;
                return (
                  <button
                    key={ano}
                    type="button"
                    disabled={!a}
                    aria-pressed={ativo}
                    onClick={() => setEscolhido(ano)}
                    title={a ? `${ano}: ${a.final ? `parecer ${a.final}` : "sem parecer na consulta"}` : `${ano}: contas ainda não entregues`}
                    className={`flex h-12 w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold tabular-nums ring-1 ring-inset transition disabled:cursor-default disabled:opacity-40 ${estilo(a?.final)} ${ativo ? "outline-2 outline-offset-2 outline-slate-900" : ""}`}
                  >
                    {ano}
                    <Simbolo f={a?.final} />
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {atual && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-serif text-[1.6rem] leading-tight text-slate-950">
              Contas de {atual.exercicio}: {atual.final ? `parecer ${atual.final}` : "sem parecer na consulta"}
            </h3>
            <span className="text-sm text-slate-600 tabular-nums">Processo {atual.processo}</span>
          </div>
          {mandato?.prefeito && <p className="mt-1 text-sm text-slate-600">Ano do mandato de {mandato.prefeito}.</p>}
          {atual.etapas.length ? (
            <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
              {atual.etapas.map((e) => (
                <li key={e.url} className="relative text-sm">
                  <span className={`absolute top-1 -left-[1.4rem] flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-inset ${estilo(e.resultado as AnoTce["final"])}`}>
                    <Simbolo f={e.resultado as AnoTce["final"]} />
                  </span>
                  <div className="font-bold text-slate-950">
                    {ETAPA[e.etapa]}
                    {e.data && <span className="font-normal text-slate-600 tabular-nums">, {e.data}</span>}
                  </div>
                  <div className="text-slate-700">
                    {e.etapa === "parecer" ? `Resultado: ${e.resultado ?? "não lido no documento"}.` : e.mudou ? `O parecer mudou para ${e.resultado}.` : `O parecer foi mantido (${e.resultado ?? "resultado não lido"}).`}{" "}
                    <span className="text-slate-500">{EXPLICA[e.etapa]}</span>
                  </div>
                  <a href={e.url} className="mt-0.5 inline-block font-bold text-blue-800 underline">
                    Abrir a decisão
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-slate-600">A consulta pública do Tribunal não mostra decisão sobre as contas deste ano.</p>
          )}
        </div>
      )}
    </div>
  );
}
