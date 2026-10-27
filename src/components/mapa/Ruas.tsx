"use client";

import { useEffect, useState } from "react";

// Camada de ruas: ladrilhos do OpenStreetMap desenhados na mesma projeção de Mercator dos bairros (d3-geo).
// A projeção é x = tx + k·λ e y = ty − k·ln(tan(π/4 + φ/2)), a mesma dos ladrilhos. No modo escuro,
// o CSS inverte as cores dos ladrilhos (.mapa-ruas em globals.css).
export type Projecao = { k: number; tx: number; ty: number };
export type Vista = { k: number; x: number; y: number };
export type Caixa = { x: number; y: number; w: number; h: number };

const TAU = 2 * Math.PI;

// Nível de zoom dos ladrilhos para que cada um ocupe cerca de 256 px na tela.
const nivelDosLadrilhos = (p: Projecao, k: number, pxPorUnidade: number) =>
  Math.max(3, Math.min(19, Math.round(Math.log2((p.k * TAU * k * pxPorUnidade) / 256))));

function ladrilhos(p: Projecao, v: Vista, caixa: Caixa, z: number) {
  const n = 2 ** z;
  const lado = (p.k * TAU) / n;
  const coluna = (x: number) => Math.floor(((((x - v.x) / v.k - p.tx) / p.k + Math.PI) / TAU) * n);
  const linha = (y: number) => Math.floor(((Math.PI - (p.ty - (y - v.y) / v.k) / p.k) / TAU) * n);
  const [i0, i1] = [Math.max(0, coluna(caixa.x)), Math.min(n - 1, coluna(caixa.x + caixa.w))];
  const [j0, j1] = [Math.max(0, linha(caixa.y)), Math.min(n - 1, linha(caixa.y + caixa.h))];
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > 80) return [];
  const out: { z: number; i: number; j: number; x: number; y: number; lado: number }[] = [];
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) out.push({ z, i, j, x: p.tx + p.k * ((TAU * i) / n - Math.PI), y: p.ty - p.k * (Math.PI - (TAU * j) / n), lado });
  return out;
}

export function Ruas({
  projecao,
  caixa,
  pxPorUnidade,
  inscrever,
  vistaInicial,
}: {
  projecao: Projecao;
  caixa: Caixa;
  pxPorUnidade: number;
  inscrever: (f: (v: Vista) => void) => () => void;
  vistaInicial: Vista;
}) {
  const [vista, setVista] = useState(vistaInicial);
  // Acompanha o zoom quadro a quadro sem redesenhar o resto do mapa.
  useEffect(() => {
    let quadro = 0;
    const parar = inscrever((v) => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => setVista(v));
    });
    return () => {
      parar();
      cancelAnimationFrame(quadro);
    };
  }, [inscrever]);

  if (!pxPorUnidade) return null;
  const z = nivelDosLadrilhos(projecao, vista.k, pxPorUnidade);
  // Desenha também o nível anterior por baixo, para não piscar enquanto os novos ladrilhos chegam.
  return (
    <g pointerEvents="none" aria-hidden className="mapa-ruas">
      {[z - 1, z].flatMap((nivel) =>
        ladrilhos(projecao, vista, caixa, nivel).map((t) => (
          <image
            key={`${t.z}-${t.i}-${t.j}`}
            href={`https://tile.openstreetmap.org/${t.z}/${t.i}/${t.j}.png`}
            x={t.x}
            y={t.y}
            width={t.lado * 1.003}
            height={t.lado * 1.003}
            preserveAspectRatio="none"
          />
        )),
      )}
    </g>
  );
}
