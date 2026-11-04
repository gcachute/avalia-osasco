"use client";

import { useRef, useState } from "react";
import { BuscaPainel, type BairroBusca } from "./BuscaPainel";
import { ListaVereadores, type VereadorLista } from "./ListaVereadores";
import { MapaBairros } from "./MapaBairros";

type PropsMapa = Omit<React.ComponentProps<typeof MapaBairros>, "autor" | "aoMudarAutor" | "bairroPedido">;

// Painel da página inicial. Começa pela busca: o bairro escolhido abre no mapa logo abaixo e o vereador abre o perfil.
// O mapa ocupa a largura toda; a lista de vereadores vem depois e, ao escolher um nome, filtra o mapa por ele.
// No celular e no tablet, mapa e lista viram duas abas (o mapa primeiro); escolher um vereador volta para o mapa.
export function PainelInicial({ vereadores, minimoSessoes, mapa, aviso }: { vereadores: VereadorLista[]; minimoSessoes: number; mapa: PropsMapa; aviso?: React.ReactNode }) {
  const [autor, setAutor] = useState("");
  const [aba, setAba] = useState<"mapa" | "lista">("mapa");
  const [bairroPedido, setBairroPedido] = useState<{ id: string; vez: number } | null>(null);
  const topo = useRef<HTMLDivElement>(null);
  const nomeAutor = vereadores.find((v) => v.id === autor)?.nome;
  const bairrosBusca: BairroBusca[] = mapa.bairros.map((b) => ({ id: b.id, nome: b.nome, citacoes: b.citacoes }));

  const irParaMapa = () => {
    setAba("mapa");
    requestAnimationFrame(() => topo.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const escolher = (id: string) => {
    setAutor(id);
    irParaMapa();
  };
  const escolherBairro = (id: string) => {
    setBairroPedido((p) => ({ id, vez: (p?.vez ?? 0) + 1 }));
    // No computador o mapa já está à vista logo abaixo da busca; no celular o painel do bairro sobe sozinho.
    setAba("mapa");
  };

  return (
    <>
    <div className="mx-auto max-w-3xl pt-4 pb-6">
      <BuscaPainel bairros={bairrosBusca} vereadores={vereadores} aoEscolherBairro={escolherBairro} />
    </div>
    {aviso && <div className="mx-auto mb-8 max-w-3xl">{aviso}</div>}
    <div ref={topo} className="scroll-mt-20">
      <div role="tablist" aria-label="Ver" className="sticky top-[3.6rem] z-20 mb-3 grid grid-cols-2 gap-1 border-b border-slate-300 bg-white text-sm font-semibold xl:hidden">
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
            className={`truncate px-3 py-2 transition ${aba === chave ? "font-semibold text-slate-950 shadow-[inset_0_-2px_0_currentColor]" : "text-slate-600"}`}
          >
            {nome}
            {chave === "mapa" && nomeAutor && <span className="ml-1 font-normal text-slate-500">· {nomeAutor.split(" ")[0]}</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-10">
        <div className={`min-w-0 xl:block ${aba === "mapa" ? "" : "hidden"}`}>
          <MapaBairros {...mapa} autor={autor} aoMudarAutor={setAutor} bairroPedido={bairroPedido} />
        </div>
        <div className={`xl:block ${aba === "lista" ? "" : "hidden"}`}>
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-1 hidden text-2xl font-semibold text-slate-950 xl:block">Vereadores</h2>
            <p className="mb-3 hidden text-sm text-slate-600 xl:block">Escolha um nome para ver no mapa só os documentos e votos dele.</p>
            <ListaVereadores vereadores={vereadores} selecionado={autor} aoSelecionar={escolher} minimoSessoes={minimoSessoes} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
