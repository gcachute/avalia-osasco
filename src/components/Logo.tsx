"use client";

import { useEffect, useRef } from "react";

/* Marca do site: um olho cuja íris (laranja, a cor da Câmara no mapa) segue o
   ponteiro e pisca de vez em quando. Sem movimento se o sistema pedir menos animação. */
export function OlhoLogo({ className = "h-8 w-8" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const iris = useRef<SVGGElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const caixa = svg.current?.getBoundingClientRect();
        if (!caixa || !iris.current) return;
        const dx = e.clientX - (caixa.left + caixa.width / 2);
        const dy = e.clientY - (caixa.top + caixa.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const alcance = Math.min(1, dist / 240);
        iris.current.style.transform = `translate(${((dx / dist) * 7 * alcance).toFixed(2)}px, ${((dy / dist) * 3.5 * alcance).toFixed(2)}px)`;
      });
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mover);
      cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <svg ref={svg} viewBox="0 0 48 48" className={`logo-olho ${className}`} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1e3a8a" />
      <g className="logo-palpebra">
        <path d="M5 24C12 12.5 36 12.5 43 24C36 35.5 12 35.5 5 24Z" fill="#fff" />
        <clipPath id="logo-olho-recorte">
          <path d="M5 24C12 12.5 36 12.5 43 24C36 35.5 12 35.5 5 24Z" />
        </clipPath>
        <g clipPath="url(#logo-olho-recorte)">
          <g ref={iris} className="logo-iris">
            <circle cx="24" cy="24" r="8.5" fill="#eb6834" />
            <circle cx="24" cy="24" r="8.5" fill="none" stroke="#c2410c" strokeWidth="1.2" />
            <circle cx="24" cy="24" r="3.8" fill="#0f172a" />
            <circle cx="26.6" cy="21.4" r="1.6" fill="#fff" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <OlhoLogo />
      <span className="text-[1.05rem] leading-none tracking-tight">
        <span className="font-semibold text-slate-900">De Olh</span>{" "}
        <span className="font-black text-[#c2410c] dark:text-[#fb923c]">OZ</span>
      </span>
    </span>
  );
}
