"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemMapa } from "@/lib/dados";
import { formatar, type Formato } from "./mapa/indicadores";

export type BairroPessoa = { id: string; nome: string; d: string; cx: number; cy: number; distancia: number };
export type ModoMapa = {
  chave: string;
  nome: string;
  descricao: string;
  valores: Record<string, number>;
  formato: Formato;
  // "zero" para contagens; "faixa" (quantis) para porcentagens que ficam todas parecidas.
  escala: "zero" | "faixa";
  total?: number; // para mostrar "x% dos votos" no detalhe do bairro
};

const FAIXAS = 6;
const cor = (f: number | null) => (f == null ? "var(--mapa-vazio)" : f === 0 ? "var(--mapa-vazio)" : `var(--mapa-${f})`);
const dataCurta = (iso: string) => iso.split("-").reverse().join("/");

// Mapa compacto da página de um político: onde teve votos e onde agiu (documentos que citam o bairro).
export function MapaPessoa({
  largura,
  altura,
  bairros,
  modos,
  itens,
  corItens,
  linkMapa,
}: {
  largura: number;
  altura: number;
  bairros: BairroPessoa[];
  modos: ModoMapa[];
  itens: ItemMapa[];
  corItens: string;
  linkMapa: string;
}) {
  const [chave, setChave] = useState(modos[0]?.chave ?? "");
  const [foco, setFoco] = useState<string | null>(null);
  const [dica, setDica] = useState<{ x: number; y: number } | null>(null);
  const [entrou, setEntrou] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && (setEntrou(true), obs.disconnect()), { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const modo = modos.find((m) => m.chave === chave) ?? modos[0];
  const docs = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of itens) for (const b of i.bairros) c[b] = (c[b] ?? 0) + 1;
    return c;
  }, [itens]);
  const maxDocs = Math.max(1, ...Object.values(docs));
  const valores = Object.values(modo.valores).filter((v) => v > 0);
  const maximo = Math.max(1e-9, ...valores);
  const ordenados = valores.slice().sort((a, b) => a - b);
  const cortes = Array.from({ length: FAIXAS - 1 }, (_, i) => ordenados[Math.floor(((i + 1) / FAIXAS) * (ordenados.length - 1))]);
  const faixa = (v: number | undefined) => {
    if (v == null || !(v > 0)) return 0;
    if (modo.escala === "zero") return Math.min(FAIXAS, Math.ceil((v / maximo) * FAIXAS));
    return 1 + cortes.filter((c) => v > c).length;
  };
  const ranking = bairros
    .map((b) => ({ b, v: modo.valores[b.id] ?? 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const porId = new Map(bairros.map((b) => [b.id, b]));
  const bFoco = foco ? porId.get(foco) : null;
  const maxDist = Math.max(1, ...bairros.map((b) => b.distancia));
  const recentes = itens.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 4);

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[auto_minmax(0,1fr)]">
      <div
        ref={caixa}
        className="relative mx-auto"
        onMouseLeave={() => {
          setFoco(null);
          setDica(null);
        }}
      >
        <svg
          viewBox={`0 0 ${largura} ${altura}`}
          className={`block h-[min(60vh,520px)] w-auto max-w-full ${entrou ? "mapa-entrada" : "opacity-0"}`}
          role="img"
          aria-label={`Mapa de Osasco: ${modo.nome}`}
          onMouseMove={(e) => {
            const r = caixa.current!.getBoundingClientRect();
            setDica({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
        >
          {bairros.map((b) => (
            <path
              key={b.id}
              d={b.d}
              className="mapa-bairro"
              style={{ ["--atraso" as string]: `${(b.distancia / maxDist) * 0.6}s`, fill: cor(faixa(modo.valores[b.id])), opacity: foco && foco !== b.id ? 0.6 : 1 }}
              stroke="var(--mapa-borda)"
              strokeWidth={1.2}
              strokeLinejoin="round"
              onMouseEnter={() => setFoco(b.id)}
            />
          ))}
          {foco && porId.get(foco) && <path d={porId.get(foco)!.d} fill="none" stroke="var(--mapa-destaque)" strokeWidth={2.5} pointerEvents="none" />}
          {/* Onde agiu: círculo no bairro, do tamanho do número de documentos */}
          {Object.entries(docs).map(([id, n]) => {
            const b = porId.get(id);
            if (!b) return null;
            return (
              <circle
                key={id}
                cx={b.cx}
                cy={b.cy}
                r={5 + 9 * Math.sqrt(n / maxDocs)}
                fill={corItens}
                fillOpacity={0.85}
                stroke="var(--mapa-borda)"
                strokeWidth={1.5}
                className="mapa-ponto"
                pointerEvents="none"
              />
            );
          })}
        </svg>
        {bFoco && dica && (
          <div
            className="pointer-events-none absolute z-10 w-52 rounded-xl border border-slate-200 bg-white/95 p-2.5 text-xs shadow-lg backdrop-blur"
            style={{ left: Math.max(4, Math.min(dica.x + 12, (caixa.current?.clientWidth ?? 300) - 212)), top: dica.y + 12 }}
          >
            <div className="text-sm font-semibold text-slate-900">{bFoco.nome}</div>
            <div className="mt-1 flex justify-between gap-2 text-slate-600">
              <span>{modo.nome}</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatar(modo.valores[bFoco.id] ?? 0, modo.formato)}</span>
            </div>
            {modo.total ? (
              <div className="text-right text-[11px] text-slate-500">{formatar(((modo.valores[bFoco.id] ?? 0) / modo.total) * 100, "pct")} do total</div>
            ) : null}
            <div className="mt-1 flex justify-between gap-2 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: corItens }} />
                Documentos citando o bairro
              </span>
              <span className="tabular-nums text-slate-900">{docs[bFoco.id] ?? 0}</span>
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        {modos.length > 1 && (
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="O que colorir">
            {modos.map((m) => (
              <button
                key={m.chave}
                onClick={() => setChave(m.chave)}
                aria-pressed={m.chave === modo.chave}
                className={`flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${m.chave === modo.chave ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {m.nome}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500">{modo.descricao}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="tabular-nums">{formatar(modo.escala === "faixa" ? (ordenados[0] ?? 0) : 0, modo.formato)}</span>
            <span className="flex overflow-hidden rounded">
              {Array.from({ length: FAIXAS }, (_, f) => (
                <span key={f} className="h-2.5 w-4" style={{ background: cor(f + 1) }} />
              ))}
            </span>
            <span className="tabular-nums">{formatar(maximo, modo.formato)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: corItens }} />
            documentos que citam o bairro ({itens.length})
          </span>
        </div>

        <ol className="space-y-1">
          {ranking.slice(0, 6).map(({ b, v }, k) => (
            <li key={b.id} onMouseEnter={() => setFoco(b.id)} onMouseLeave={() => setFoco(null)} className="grid grid-cols-[1rem_minmax(0,1fr)_4.5rem] items-center gap-2 text-sm">
              <span className="text-right text-xs tabular-nums text-slate-400">{k + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-slate-800">{b.nome}</span>
                <span className="mt-0.5 block h-1.5 rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${(v / maximo) * 100}%` }} />
                </span>
              </span>
              <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{formatar(v, modo.formato)}</span>
            </li>
          ))}
          {!ranking.length && <li className="text-sm text-slate-500">Sem dados para este recorte.</li>}
        </ol>

        {recentes.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Documentos mais recentes com bairro</div>
            <ul className="space-y-1.5">
              {recentes.map((i) => (
                <li key={i.id} className="rounded-lg bg-slate-50 p-2 text-xs" style={{ borderLeft: `3px solid ${corItens}` }}>
                  <div className="flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{i.tipo}</span>
                    <span>{i.bairros.map((id) => porId.get(id)?.nome).filter(Boolean).join(", ")}</span>
                    <span className="ml-auto">{dataCurta(i.data)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-slate-700">{i.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href={linkMapa} className="inline-flex items-center gap-1 text-sm font-medium text-blue-800 underline">
          Ver no mapa completo →
        </Link>
      </div>
    </div>
  );
}
