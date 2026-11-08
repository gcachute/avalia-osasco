"use client";

import { useState } from "react";

// Colunas para séries curtas (anos ou meses). Tocar ou passar o mouse mostra o número daquela coluna; a lista completa
// fica recolhida logo abaixo. Período incompleto vai tracejado. Valores negativos descem a partir da linha do zero.
export type Coluna = { rotulo: string; curto?: string; valor: number; texto: string; detalhe?: string; parcial?: boolean };

export function Colunas({ titulo, unidade, pontos }: { titulo: string; unidade: string; pontos: Coluna[] }) {
  const inicial = pontos.reduce((u, p, i) => (p.parcial ? u : i), pontos.length - 1);
  const [foco, setFoco] = useState(inicial);
  const atual = pontos[foco];
  const topo = pontos.reduce((m, p) => (p.valor > m.valor ? p : m), pontos[0]);
  const [maior, menor] = [Math.max(topo.valor, 0), Math.min(...pontos.map((p) => p.valor), 0)];
  const faixa = maior - menor || 1;
  const zero = (-menor / faixa) * 100;
  // Com muitas colunas no celular, os rótulos saem de dois em dois, sempre incluindo o último.
  const alterna = pontos.length > 8;

  return (
    <div className="@container border-t border-slate-300 pt-3">
      <div className="text-sm font-medium text-slate-900">{titulo}</div>
      <div className="mt-2 min-h-14" aria-live="polite">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-semibold tabular-nums text-slate-900">{atual.texto}</span>
          <span className="text-sm text-slate-600">
            {unidade} em {atual.rotulo}
          </span>
        </div>
        {atual.detalhe && <div className="mt-0.5 text-xs text-slate-500">{atual.detalhe}</div>}
      </div>

      {/* As colunas crescem a partir da linha do zero quando aparecem na tela. */}
      <div className="revelar relative mt-2 h-36 pt-4">
        <span className="absolute top-0 left-0 text-[10px] tabular-nums text-slate-500">{topo.texto}</span>
        <span className="absolute inset-x-0 top-4 border-t border-slate-100" aria-hidden />
        <div className="relative h-full">
          <span className="absolute inset-x-0 z-10 border-t border-slate-300" style={{ bottom: `${zero}%` }} aria-hidden />
          <div className="flex h-full gap-0.5 @md:gap-1">
            {pontos.map((p, i) => {
              const altura = (Math.abs(p.valor) / faixa) * 100;
              const negativo = p.valor < 0;
              const cor = p.parcial
                ? `border border-dashed ${negativo ? "border-slate-500" : "border-blue-700"} ${i === foco ? "bg-blue-100" : "bg-transparent"}`
                : negativo
                  ? i === foco
                    ? "bg-slate-500"
                    : "bg-slate-300"
                  : i === foco
                    ? "bg-blue-700"
                    : "bg-blue-300";
              return (
                <button
                  key={p.rotulo}
                  type="button"
                  aria-label={`${p.rotulo}: ${p.texto} ${unidade}`}
                  aria-pressed={i === foco}
                  className="relative h-full min-w-0 flex-1 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-blue-700"
                  onClick={() => setFoco(i)}
                  onMouseEnter={() => setFoco(i)}
                  onFocus={() => setFoco(i)}
                >
                  <span
                    className={`coluna-cresce absolute left-1/2 w-full max-w-9 -translate-x-1/2 ${negativo ? "origin-top rounded-b" : "origin-bottom rounded-t"} ${cor}`}
                    style={{ height: `max(${altura}%, ${p.valor ? 2 : 0}px)`, ...(negativo ? { top: `${100 - zero}%` } : { bottom: `${zero}%` }), ["--i" as string]: i }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-1 flex gap-0.5 @md:gap-1" aria-hidden>
        {pontos.map((p, i) => (
          <span
            key={p.rotulo}
            className={`flex min-w-0 flex-1 justify-center text-[10px] tabular-nums whitespace-nowrap ${i === foco ? "font-semibold text-slate-900" : "text-slate-500"} ${
              alterna && (pontos.length - 1 - i) % 2 === 1 ? "invisible @md:visible" : ""
            }`}
          >
            {p.curto ?? p.rotulo}
          </span>
        ))}
      </div>

      <details className="group mt-2 text-xs text-slate-600">
        <summary className="cursor-pointer py-1.5 font-medium text-blue-800">
          <span className="group-open:hidden">Ver todos os números</span>
          <span className="hidden group-open:inline">Ver menos</span>
        </summary>
        <ul className="mt-1 divide-y divide-slate-100">
          {[...pontos].reverse().map((p) => (
            <li key={p.rotulo} className="py-1.5">
              <div className="flex justify-between gap-3">
                <span className="text-slate-700">{p.rotulo}</span>
                <span className="shrink-0 font-medium tabular-nums text-slate-900">{p.texto}</span>
              </div>
              {p.detalhe && <div className="mt-0.5 text-slate-500">{p.detalhe}</div>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
