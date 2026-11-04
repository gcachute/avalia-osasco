"use client";

import { useEffect, useState } from "react";
import { Abre } from "./movimento/Movimento";
import { PedidoCorrecao } from "./PedidoCorrecao";

// Faixa no topo do site, sem bloquear a tela. Fecha no X e fica fechada só nesta aba: quem voltar ao site depois vê de novo.
// Faixa clara com o ponto vermelho da bandeira; as cores acompanham o tema.
const CHAVE = "aviso-ia-fechado";

export function AvisoIA() {
  const [ver, setVer] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAVE)) return;
    } catch {
      // Sem acesso ao armazenamento do navegador, o aviso aparece de qualquer forma.
    }
    setVer(true);
  }, []);
  const fechar = () => {
    setVer(false);
    try {
      sessionStorage.setItem(CHAVE, "1");
    } catch {
      // Sem armazenamento, o aviso só volta ao recarregar a página.
    }
  };
  return (
    <Abre aberto={ver}>
      <div role="alert" className="bg-slate-100 text-slate-900">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-[13px] leading-snug">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#cc423b]" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="font-bold">Este site pode conter erros.</span> A coleta das informações é feita com inteligência artificial (IA). Confira a fonte de
            cada número e, se encontrar algo errado, <PedidoCorrecao className="font-semibold underline">peça uma correção</PedidoCorrecao>.
          </p>
          <button type="button" onClick={fechar} aria-label="Fechar aviso" className="-m-1 shrink-0 rounded-md p-1 transition hover:bg-slate-200">
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </Abre>
  );
}
