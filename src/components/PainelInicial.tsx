"use client";

import { useRef, useState } from "react";
import { ListaVereadores, type VereadorLista } from "./ListaVereadores";
import { MapaBairros } from "./MapaBairros";

type PropsMapa = Omit<React.ComponentProps<typeof MapaBairros>, "autor" | "aoMudarAutor">;

// Painel da página inicial: lista de vereadores à esquerda e o mapa ao centro. Escolher um vereador
// na lista filtra o mapa por ele (documentos e votos); o filtro do mapa também volta para a lista.
// No celular e no tablet, mapa e lista viram duas abas (o mapa primeiro); escolher um vereador volta para o mapa.
export function PainelInicial({ vereadores, minimoSessoes, mapa }: { vereadores: VereadorLista[]; minimoSessoes: number; mapa: PropsMapa }) {
  const [autor, setAutor] = useState("");
  const [aba, setAba] = useState<"mapa" | "lista">("mapa");
  const topo = useRef<HTMLDivElement>(null);
  const nomeAutor = vereadores.find((v) => v.id === autor)?.nome;

  const escolher = (id: string) => {
    setAutor(id);
    if (window.matchMedia("(min-width: 80rem)").matches) return;
    setAba("mapa");
    requestAnimationFrame(() => topo.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div ref={topo} className="scroll-mt-20">
      <div role="tablist" aria-label="Ver" className="sticky top-[3.6rem] z-20 mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold xl:hidden">
        {(
          [
            ["mapa", "Mapa"],
            ["lista", "Vereadores"],
          ] as const
        ).map(([chave, nome]) => (
          <button
            key={chave}
            role="tab"
            type="button"
            aria-selected={aba === chave}
            onClick={() => setAba(chave)}
            className={`truncate rounded-lg px-3 py-2 transition ${aba === chave ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          >
            {nome}
            {chave === "mapa" && nomeAutor && <span className="ml-1 font-normal text-slate-500">· {nomeAutor.split(" ")[0]}</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[21rem_minmax(0,1fr)] xl:items-start">
        <div className={`xl:sticky xl:top-20 xl:block ${aba === "lista" ? "" : "hidden"}`}>
          <ListaVereadores vereadores={vereadores} selecionado={autor} aoSelecionar={escolher} minimoSessoes={minimoSessoes} />
        </div>
        <div className={`min-w-0 xl:block ${aba === "mapa" ? "" : "hidden"}`}>
          <MapaBairros {...mapa} autor={autor} aoMudarAutor={setAutor} />
        </div>
      </div>
    </div>
  );
}
