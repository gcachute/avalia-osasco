"use client";

import { useEffect } from "react";

// Todo link que leva para outra página abre em nova aba, para quem está explorando o site (o mapa,
// um ranking filtrado) não perder o que estava vendo. Ficam na mesma aba o menu do topo (marcado com
// data-mesma-aba) e os atalhos para um trecho da própria página (#ranking).
export function NovaAba() {
  useEffect(() => {
    const ajusta = (raiz: ParentNode) =>
      raiz.querySelectorAll<HTMLAnchorElement>("a[href]:not([target])").forEach((a) => {
        const href = a.getAttribute("href") ?? "";
        if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || a.closest("[data-mesma-aba]")) return;
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
