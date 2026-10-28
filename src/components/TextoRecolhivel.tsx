"use client";

import { useState } from "react";

// No celular mostra só um botão "Ler mais" no lugar do texto; no computador o texto aparece inteiro.
export function TextoRecolhivel({ children, rotulo = "Ler mais" }: { children: React.ReactNode; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <div className={aberto ? "" : "hidden md:block"}>{children}</div>
      {!aberto && (
        <button type="button" onClick={() => setAberto(true)} className="font-semibold underline underline-offset-2 md:hidden">
          {rotulo}
        </button>
      )}
    </>
  );
}
