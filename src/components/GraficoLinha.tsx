"use client";

import { useEffect, useRef, useState } from "react";
import { formatar, type Formato } from "./mapa/indicadores";

// Gráfico de linhas para séries históricas (anos no eixo x). Uma escala só; a referência da cidade
// vai tracejada e em cinza. Passando o mouse (ou o dedo), mostra os valores do ano mais próximo.
export type Serie = { nome: string; cor: string; tracejada?: boolean; pontos: { x: number; y: number | null }[] };
// O formato vai por nome (não por função) para o gráfico poder ser usado em páginas geradas no servidor.
export type FormatoGrafico = Formato | "milPessoas" | "milhoesReais";
const formatarGrafico = (v: number, f: FormatoGrafico) =>
  f === "milPessoas"
    ? `${Math.round(v / 1000).toLocaleString("pt-BR")} mil`
    : f === "milhoesReais"
      ? `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: v >= 1e8 ? 0 : 1 })} mi`
      : formatar(v, f);

export function GraficoLinha({
  series,
  formato,
  altura = 170,
  zeroNaBase = false,
  rotulo,
  eixoX = "ano",
}: {
  series: Serie[];
  formato: FormatoGrafico;
  altura?: number;
  zeroNaBase?: boolean;
  rotulo: string;
  // "mes": x = ano × 12 + (mês − 1), e os rótulos saem como "jan/25".
  eixoX?: "ano" | "mes";
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(320);
  const [foco, setFoco] = useState<number | null>(null);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setLargura(Math.max(220, el.clientWidth));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const xs = [...new Set(series.flatMap((s) => s.pontos.filter((p) => p.y != null).map((p) => p.x)))].sort((a, b) => a - b);
  const ys = series.flatMap((s) => s.pontos.map((p) => p.y).filter((y): y is number => y != null));
  if (!xs.length || !ys.length) return null;
  // Eixo vertical com valores redondos (passos de 1, 2, 2,5 ou 5 vezes uma potência de 10), umas 4 marcas.
  const [min, max] = [zeroNaBase ? 0 : Math.min(...ys), Math.max(...ys)];
  const bruto = (max - min || Math.abs(max) || 1) / 3;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passoY = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= bruto)!;
  const y0 = zeroNaBase ? 0 : Math.floor(min / passoY) * passoY;
  const y1 = Math.max(y0 + passoY, Math.ceil(max / passoY) * passoY);

  const m = { esq: 46, dir: 12, cima: 10, baixo: 22 };
  const w = largura - m.esq - m.dir;
  const h = altura - m.cima - m.baixo;
  const [x0, x1] = [xs[0], xs.at(-1)!];
  const px = (x: number) => m.esq + (x1 === x0 ? w / 2 : ((x - x0) / (x1 - x0)) * w);
  const py = (y: number) => m.cima + h - ((y - y0) / (y1 - y0)) * h;
  const marcas = Array.from({ length: Math.round((y1 - y0) / passoY) + 1 }, (_, i) => y0 + passoY * i);
  // Rótulos do eixo x: os anos com dado, se couberem; senão, anos redondos (de 2 em 2, 5 em 5, 10 em 10...).
  const cabem = Math.max(2, Math.floor(w / 40));
  const espacados = xs.every((x, i) => i === 0 || px(x) - px(xs[i - 1]) >= 34);
  const passo = (eixoX === "mes" ? [1, 2, 3, 6, 12, 24] : [1, 2, 5, 10, 20, 25, 50]).find((p) => (x1 - x0) / p <= cabem) ?? 50;
  const rotulosX = espacados && xs.length <= cabem ? xs : Array.from({ length: Math.floor(x1 / passo) - Math.ceil(x0 / passo) + 1 }, (_, i) => (Math.ceil(x0 / passo) + i) * passo);

  const caminho = (s: Serie) => {
    let d = "";
    let aberto = false;
    for (const p of s.pontos.slice().sort((a, b) => a.x - b.x)) {
      if (p.y == null) {
        aberto = false;
        continue;
      }
      d += `${aberto ? "L" : "M"}${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`;
      aberto = true;
    }
    return d;
  };
  const xFoco = foco != null ? xs[foco] : null;
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const rotuloX = (x: number) => (eixoX === "mes" ? `${MESES[x % 12]}/${String(Math.floor(x / 12)).slice(2)}` : String(x));

  return (
    <figure ref={caixa} className="relative">
      <svg
        width={largura}
        height={altura}
        role="img"
        aria-label={rotulo}
        className="block touch-none select-none"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - r.left;
          let melhor = 0;
          xs.forEach((v, i) => Math.abs(px(v) - x) < Math.abs(px(xs[melhor]) - x) && (melhor = i));
          setFoco(melhor);
        }}
        onPointerLeave={() => setFoco(null)}
      >
        {marcas.map((v) => (
          <g key={v}>
            <line x1={m.esq} x2={largura - m.dir} y1={py(v)} y2={py(v)} stroke="var(--grafico-grade)" strokeWidth={1} />
            <text x={m.esq - 6} y={py(v)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[10px] tabular-nums">
              {formatarGrafico(v, formato)}
            </text>
          </g>
        ))}
        {rotulosX.map((x) => (
          <text key={x} x={px(x)} y={altura - 6} textAnchor="middle" className="fill-slate-500 text-[10px] tabular-nums">
            {rotuloX(x)}
          </text>
        ))}
        {xFoco != null && <line x1={px(xFoco)} x2={px(xFoco)} y1={m.cima} y2={m.cima + h} stroke="var(--grafico-ref)" strokeWidth={1} strokeDasharray="2 3" />}
        {series.map((s) => (
          <g key={s.nome}>
            <path d={caminho(s)} fill="none" stroke={s.cor} strokeWidth={2} strokeDasharray={s.tracejada ? "5 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
            {s.pontos
              .filter((p) => p.y != null)
              .map((p) => (
                <circle
                  key={p.x}
                  cx={px(p.x)}
                  cy={py(p.y!)}
                  r={p.x === xFoco ? 5 : s.tracejada ? 2.5 : 3.5}
                  fill={s.tracejada ? "var(--grafico-ref)" : s.cor}
                  stroke="var(--color-white)"
                  strokeWidth={1.5}
                />
              ))}
          </g>
        ))}
      </svg>
      {xFoco != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-md backdrop-blur"
          style={{ left: Math.min(Math.max(0, px(xFoco) - 72), largura - 150) }}
        >
          <div className="font-semibold text-slate-900">{rotuloX(xFoco)}</div>
          {series.map((s) => {
            const y = s.pontos.find((p) => p.x === xFoco)?.y;
            return (
              <div key={s.nome} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-0.5 w-3 rounded" style={{ background: s.tracejada ? "var(--grafico-ref)" : s.cor }} />
                  {s.nome}
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{y == null ? "—" : formatarGrafico(y, formato)}</span>
              </div>
            );
          })}
        </div>
      )}
      {series.length > 1 && (
        <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
          {series.map((s) => (
            <span key={s.nome} className="flex items-center gap-1.5">
              <svg width="16" height="6" aria-hidden>
                <line x1="0" x2="16" y1="3" y2="3" stroke={s.tracejada ? "var(--grafico-ref)" : s.cor} strokeWidth="2" strokeDasharray={s.tracejada ? "4 3" : undefined} />
              </svg>
              {s.nome}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
