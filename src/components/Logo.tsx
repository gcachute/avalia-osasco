"use client";

import { useEffect, useId, useRef } from "react";

/* Marca do site: o monograma "OZ" (de Osasco) em que o O é um olho. Em repouso a íris olha de lado,
   para o Z; com o ponteiro na tela ela acompanha o ponteiro e pisca de vez em quando.
   Sem movimento se o sistema pedir menos animação. Grade de 48: traço 4,8 nas duas letras, o O passa
   um pouco da altura do Z (compensação óptica) e o fundo é um quadrado de cantos contínuos. */
const FUNDO = "M24 0C42.5 0 48 5.5 48 24S42.5 48 24 48 0 42.5 0 24 5.5 0 24 0Z";
const REPOUSO = { x: 1.5, y: -1 };
const ALCANCE = 1.6; // o quanto a íris anda dentro do O

export function MarcaOZ({ className = "h-8 w-8" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const iris = useRef<SVGGElement>(null);
  const pupila = useRef<SVGGElement>(null);
  const recorte = useId();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const caixa = svg.current?.getBoundingClientRect();
        if (!caixa || !iris.current || !pupila.current) return;
        // centro do O na tela (x = 16,4 de 48)
        const dx = e.clientX - (caixa.left + (caixa.width * 16.4) / 48);
        const dy = e.clientY - (caixa.top + caixa.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const f = Math.min(1, dist / 200) * ALCANCE;
        const x = (dx / dist) * f;
        const y = (dy / dist) * f;
        iris.current.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
        pupila.current.style.transform = `translate(${(x * 0.45).toFixed(2)}px, ${(y * 0.45).toFixed(2)}px)`;
      });
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mover);
      cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <svg ref={svg} viewBox="0 0 48 48" className={`marca-oz shrink-0 ${className}`} aria-hidden="true">
      <path d={FUNDO} className="fill-[#0e1a3d] dark:fill-[#1b2c66]" />
      <circle cx="16.4" cy="24" r="8.3" fill="none" stroke="#fff" strokeWidth="4.8" />
      <clipPath id={recorte}>
        <circle cx="16.4" cy="24" r="5.9" />
      </clipPath>
      <g clipPath={`url(#${recorte})`}>
        <g ref={iris} className="logo-iris" style={{ transform: `translate(${REPOUSO.x}px, ${REPOUSO.y}px)` }}>
          <g className="logo-palpebra">
            <circle cx="16.4" cy="24" r="4.3" fill="#f26419" />
            <g ref={pupila} className="logo-iris" style={{ transform: "translate(0.7px, -0.5px)" }}>
              <circle cx="16.4" cy="24" r="1.9" fill="#0e1a3d" />
              <circle cx="17.4" cy="22.7" r="0.9" fill="#fff" />
            </g>
          </g>
        </g>
      </g>
      <path d="M28.2 16.1H39.6L28.4 31.9H39.8" fill="none" stroke="#fff" strokeWidth="4.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* Assinatura: a frase "De Olho em" fecha no monograma, que faz as vezes da palavra OZ. */
export function Logo() {
  return (
    <span className="flex items-center gap-[0.45rem]">
      <span className="text-[1.08rem] font-semibold leading-none tracking-[-0.025em] text-slate-900">De Olho em</span>
      <MarcaOZ />
    </span>
  );
}
