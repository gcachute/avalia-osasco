"use client";

import { useEffect, useId, useRef } from "react";
import { PedidoCorrecao } from "./PedidoCorrecao";

// Aviso que abre ao entrar no site. Fica guardado só nesta aba: mudar de página ou recarregar não repete, voltar ao site depois, sim.
const CHAVE = "aviso-ia-visto";

export function AvisoIA() {
  const janela = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  const textoId = useId();
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAVE)) return;
      sessionStorage.setItem(CHAVE, "1");
    } catch {
      // Sem acesso ao armazenamento do navegador, o aviso abre de qualquer forma.
    }
    if (!janela.current?.open) janela.current?.showModal();
  }, []);
  const fechar = () => janela.current?.close();
  return (
    <dialog
      ref={janela}
      aria-labelledby={tituloId}
      aria-describedby={textoId}
      className="ficha m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm sm:p-6"
      onClick={(e) => e.target === janela.current && fechar()}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800" aria-hidden>
          !
        </span>
        <div className="min-w-0">
          <h2 id={tituloId} className="text-lg font-semibold text-slate-900">
            Este site pode conter erros
          </h2>
          <p id={textoId} className="mt-1 text-sm text-slate-600">
            A coleta das informações é feita com inteligência artificial (IA), a partir de fontes oficiais, e por isso pode ter erros. Cada número traz a fonte para
            você conferir. Se encontrar algo errado, peça uma correção.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {/* O aviso fecha antes de abrir o pedido, para não ficar de volta na tela quando o pedido terminar. */}
        <span onClickCapture={fechar}>
          <PedidoCorrecao className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">Pedir uma correção</PedidoCorrecao>
        </span>
        <button type="button" autoFocus onClick={fechar} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Entendi
        </button>
      </div>
    </dialog>
  );
}
