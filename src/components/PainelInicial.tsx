"use client";

import { useRef, useState } from "react";
import { dataBR } from "@/lib/formato";
import { BuscaPainel, type BairroBusca } from "./BuscaPainel";
import { ListaVereadores, type VereadorLista } from "./ListaVereadores";
import { MapaBairros } from "./MapaBairros";

type PropsMapa = Omit<React.ComponentProps<typeof MapaBairros>, "autor" | "aoMudarAutor" | "bairroPedido">;

// Painel da página inicial. Começa pela busca: o bairro escolhido abre no mapa logo abaixo e o vereador abre o perfil.
// O mapa ocupa a largura toda; a lista de vereadores vem depois e, ao escolher um nome, filtra o mapa por ele.
// No celular e no tablet, mapa e lista viram duas abas (o mapa primeiro); escolher um vereador volta para o mapa.
export type Recente = { id: string; tipo: string; data: string; texto: string; autor: string | null; bairros: { id: string; nome: string }[] };

export function PainelInicial({
  vereadores,
  minimoSessoes,
  mapa,
  aviso,
  cabecalho,
  recentes = [],
  aoLadoDaLista,
}: {
  vereadores: VereadorLista[];
  minimoSessoes: number;
  mapa: PropsMapa;
  aviso?: React.ReactNode;
  cabecalho?: React.ReactNode;
  recentes?: Recente[];
  aoLadoDaLista?: React.ReactNode;
}) {
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
    <div className="mb-8 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <div className="min-w-0">
        {cabecalho}
        <div className="max-w-2xl pt-6 pb-6">
          <BuscaPainel bairros={bairrosBusca} vereadores={vereadores} aoEscolherBairro={escolherBairro} />
        </div>
        {aviso && <div className="max-w-3xl">{aviso}</div>}
      </div>
      {recentes.length > 0 && (
        <section className="min-w-0 rounded-2xl bg-slate-50 p-5 lg:mt-4">
          <h2 className="text-[1.6rem] leading-tight text-slate-950">Acontecendo agora</h2>
          <p className="mt-1 text-sm text-slate-600">Os documentos mais recentes que citam algum bairro.</p>
          <ol className="mt-3 divide-y divide-slate-200">
            {recentes.map((r) => (
              <li key={r.id} className="py-3">
                <div className="text-[13px] text-slate-600">
                  {r.bairros.map((b, i) => (
                    <span key={b.id}>
                      {i > 0 && ", "}
                      <button type="button" onClick={() => (escolherBairro(b.id), irParaMapa())} className="font-bold text-blue-800 hover:underline">
                        {b.nome}
                      </button>
                    </span>
                  ))}
                  {`, ${r.tipo.toLowerCase()}, ${dataBR(r.data)}`}
                </div>
                <p className="mt-1 line-clamp-3 text-[15px] text-slate-900">{r.texto}</p>
                {r.autor && <div className="mt-0.5 text-[13px] text-slate-600">{r.autor}</div>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
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
            className={`truncate px-3 py-2 transition ${aba === chave ? "font-semibold text-slate-950 shadow-[inset_0_-3px_0_var(--color-blue-700)]" : "text-slate-600"}`}
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
        <div className="grid gap-x-12 gap-y-10 xl:grid-cols-2 xl:items-start">
          <div className={`min-w-0 xl:block ${aba === "lista" ? "" : "hidden"}`}>
            <h2 className="mb-1 hidden text-[2rem] text-slate-950 xl:block">Vereadores</h2>
            <p className="mb-3 hidden text-sm text-slate-600 xl:block">Escolha um nome para ver no mapa só os documentos e votos dele.</p>
            <ListaVereadores vereadores={vereadores} selecionado={autor} aoSelecionar={escolher} minimoSessoes={minimoSessoes} />
          </div>
          {aoLadoDaLista && <div className="min-w-0 xl:[&>section:first-child]:mt-0">{aoLadoDaLista}</div>}
        </div>
      </div>
    </div>
    </>
  );
}
