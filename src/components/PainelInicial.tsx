"use client";

import { useState } from "react";
import { ListaVereadores, type VereadorLista } from "./ListaVereadores";
import { MapaBairros } from "./MapaBairros";

type PropsMapa = Omit<React.ComponentProps<typeof MapaBairros>, "autor" | "aoMudarAutor">;

// Painel da página inicial: lista de vereadores à esquerda e o mapa ao centro. Escolher um vereador
// na lista filtra o mapa por ele (documentos e votos); o filtro do mapa também volta para a lista.
export function PainelInicial({ vereadores, minimoSessoes, mapa }: { vereadores: VereadorLista[]; minimoSessoes: number; mapa: PropsMapa }) {
  const [autor, setAutor] = useState("");
  return (
    <div className="grid gap-4 xl:grid-cols-[21rem_minmax(0,1fr)] xl:items-start">
      <div className="xl:sticky xl:top-20">
        <ListaVereadores vereadores={vereadores} selecionado={autor} aoSelecionar={setAutor} minimoSessoes={minimoSessoes} />
      </div>
      <MapaBairros {...mapa} autor={autor} aoMudarAutor={setAutor} />
    </div>
  );
}
