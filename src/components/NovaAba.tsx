"use client";

import { useEffect } from "react";

// Links para fora do site (fontes oficiais, planilhas, redes sociais) abrem em nova aba, para quem está
// lendo não perder a página. Links internos continuam na mesma aba.
export function NovaAba() {
  useEffect(() => {
    const ajusta = (raiz: ParentNode) =>
      raiz.querySelectorAll<HTMLAnchorElement>("a[href]:not([target])").forEach((a) => {
        const href = a.getAttribute("href") ?? "";
        if (!/^https?:\/\//i.test(href) || new URL(href, location.href).origin === location.origin) return;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });
    ajusta(document);
    const obs = new MutationObserver((mudancas) => {
      for (const m of mudancas) m.addedNodes.forEach((n) => n instanceof Element && ajusta(n.parentNode ?? n));
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return null;
}
