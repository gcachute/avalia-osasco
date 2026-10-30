"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

// Tabela mais larga que a tela. A barra de rolagem do celular some sozinha (e no iPhone não dá para fixá-la), então esta
// é desenhada aqui: fica sempre à vista enquanto a tabela está na tela e dá para arrastar. Quando a tabela cabe, não aparece.
export function RolagemLateral({ children, className = "", noPainel = false }: { children: ReactNode; className?: string; noPainel?: boolean }) {
  const area = useRef<HTMLDivElement>(null);
  const trilho = useRef<HTMLDivElement>(null);
  const [barra, setBarra] = useState<{ inicio: number; largura: number } | null>(null);
  const rola = barra !== null;

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const mede = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setBarra(scrollWidth > clientWidth + 1 ? { inicio: scrollLeft / scrollWidth, largura: clientWidth / scrollWidth } : null);
    };
    mede();
    el.addEventListener("scroll", mede, { passive: true });
    const tamanho = new ResizeObserver(mede);
    tamanho.observe(el);
    if (el.firstElementChild) tamanho.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", mede);
      tamanho.disconnect();
    };
  }, []);

  // Na primeira vez que a tabela aparece, ela anda um pouco para o lado e volta, mostrando que dá para rolar.
  useEffect(() => {
    const el = area.current;
    if (!rola || !el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let volta: ReturnType<typeof setTimeout> | undefined;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        el.scrollBy({ left: 48, behavior: "smooth" });
        volta = setTimeout(() => el.scrollBy({ left: -48, behavior: "smooth" }), 600);
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    const desiste = () => clearTimeout(volta);
    el.addEventListener("pointerdown", desiste);
    return () => {
      obs.disconnect();
      clearTimeout(volta);
      el.removeEventListener("pointerdown", desiste);
    };
  }, [rola]);

  const anda = (sentido: number) => {
    const el = area.current;
    if (el) el.scrollBy({ left: sentido * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const arrasta = (e: PointerEvent<HTMLDivElement>) => {
    const el = area.current;
    const t = trilho.current;
    if (!el || !t) return;
    const caixa = t.getBoundingClientRect();
    const miolo = (caixa.width * el.clientWidth) / el.scrollWidth;
    const vaiPara = (x: number) => {
      el.scrollLeft = ((x - caixa.left - miolo / 2) / (caixa.width - miolo)) * (el.scrollWidth - el.clientWidth);
    };
    vaiPara(e.clientX);
    t.setPointerCapture(e.pointerId);
    t.onpointermove = (m) => vaiPara(m.clientX);
    t.onpointerup = t.onpointercancel = () => {
      t.onpointermove = null;
    };
  };

  const seta = "grid h-7 w-7 shrink-0 place-items-center rounded-md text-base leading-none text-slate-700 transition enabled:hover:bg-slate-200 disabled:text-slate-300";
  return (
    <div className={`overflow-clip ${className}`}>
      <div
        ref={area}
        role="region"
        aria-label="Tabela"
        tabIndex={rola ? 0 : undefined}
        className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {barra && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`sticky z-10 flex items-center gap-1 border-t border-slate-200 bg-slate-50 px-1 py-1 ${noPainel ? "bottom-0" : "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-0"}`}
        >
          <button type="button" aria-label="Ver as colunas anteriores" disabled={barra.inicio < 0.002} onClick={() => anda(-1)} className={seta}>
            ‹
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-center text-[10px] leading-3 text-slate-500">Role para o lado para ver tudo</p>
            <div ref={trilho} onPointerDown={arrasta} className="flex h-4 cursor-pointer touch-none items-center" aria-hidden>
              <div className="relative h-1.5 w-full rounded-full bg-slate-200">
                <div className="absolute inset-y-0 rounded-full bg-blue-700" style={{ left: `${barra.inicio * 100}%`, width: `${barra.largura * 100}%` }} />
              </div>
            </div>
          </div>
          <button type="button" aria-label="Ver as próximas colunas" disabled={barra.inicio + barra.largura > 0.998} onClick={() => anda(1)} className={seta}>
            ›
          </button>
        </div>
      )}
    </div>
  );
}
