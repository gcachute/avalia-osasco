"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dinheiroCurto } from "@/lib/formato";

// Observa os elementos .revelar e .barra-anim e marca com data-visivel quando entram na tela.
// A marca é um atributo, não uma classe: se um componente trocar a própria classe (ao passar o mouse,
// por exemplo), o React reescreve o className mas não apaga o atributo, e a barra não volta a zero.
// Elementos que surgem depois (filtros, listas que mudam) também são observados.
const SELETOR = ".revelar:not([data-visivel]), .barra-anim:not([data-visivel])";

export function Animacoes() {
  const caminho = usePathname();
  useEffect(() => {
    const marca = (el: Element) => el.setAttribute("data-visivel", "");
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(SELETOR).forEach(marca);
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas)
          if (e.isIntersecting) {
            marca(e.target);
            obs.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const observar = (raiz: ParentNode) => {
      if (raiz instanceof Element && raiz.matches(SELETOR)) obs.observe(raiz);
      raiz.querySelectorAll(SELETOR).forEach((el) => obs.observe(el));
    };
    observar(document);
    const novos = new MutationObserver((mudancas) => {
      for (const m of mudancas) m.addedNodes.forEach((n) => n instanceof Element && observar(n));
    });
    novos.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      novos.disconnect();
    };
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

// Valor em reais que conta até o total quando aparece na tela, no formato curto ("R$ 462 mi").
export function DinheiroAnimado({ valor }: { valor: number }) {
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
      {dinheiroCurto(atual)}
    </span>
  );
}
