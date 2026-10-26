"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Observa os elementos .revelar e .barra-anim da página e marca como .visivel quando entram na tela.
// Roda de novo a cada troca de página (as páginas mudam sem recarregar).
export function Animacoes() {
  const caminho = usePathname();
  useEffect(() => {
    const alvos = document.querySelectorAll(".revelar:not(.visivel), .barra-anim:not(.visivel)");
    if (!("IntersectionObserver" in window)) {
      alvos.forEach((el) => el.classList.add("visivel"));
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas)
          if (e.isIntersecting) {
            e.target.classList.add("visivel");
            obs.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    alvos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [caminho]);
  return null;
}

// Número que conta de 0 até o valor quando aparece na tela.
export function Numero({ valor, casas = 0, sufixo = "" }: { valor: number; casas?: number; sufixo?: string }) {
  const [atual, setAtual] = useState(valor);
  const [el, setEl] = useState<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAtual(0);
    let quadro = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const inicio = performance.now();
      const passo = (t: number) => {
        const p = Math.min(1, (t - inicio) / 900);
        setAtual(valor * (1 - Math.pow(1 - p, 3)));
        if (p < 1) quadro = requestAnimationFrame(passo);
      };
      quadro = requestAnimationFrame(passo);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [el, valor]);

  return (
    <span ref={setEl} className="tabular-nums">
      {atual.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}
      {sufixo}
    </span>
  );
}
