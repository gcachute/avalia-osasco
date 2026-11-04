"use client";

import { useEffect, useRef, useState } from "react";

// Lista de um lado e o detalhe do item escolhido do outro. No computador, a lista fica numa caixa com rolagem própria e o
// detalhe acompanha a rolagem da página; no celular, o detalhe abre logo abaixo do item tocado. A lista mostra `porVez`
// itens e cresce com "Ver mais"; "Ver menos" volta ao começo.
export function ListaDetalhe<T>({
  itens,
  chave,
  linha,
  detalhe,
  porVez = 10,
  nome,
  escolhido: escolhidoFora,
  aoEscolher,
  vazio,
  colunas = "lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]",
}: {
  itens: T[];
  chave: (x: T) => string;
  linha: (x: T, ativo: boolean, n: number) => React.ReactNode;
  detalhe: (x: T) => React.ReactNode;
  porVez?: number;
  // Plural do que a lista mostra, para os botões: "obras", "bairros", "contratos".
  nome: string;
  escolhido?: string | null;
  aoEscolher?: (id: string | null) => void;
  vazio?: React.ReactNode;
  colunas?: string;
}) {
  const [proprio, setProprio] = useState<string | null>(null);
  const escolhido = escolhidoFora !== undefined ? escolhidoFora : proprio;
  const escolher = (id: string | null) => (aoEscolher ? aoEscolher(id) : setProprio(id));
  const [quantos, setQuantos] = useState(porVez);
  const caixa = useRef<HTMLOListElement>(null);
  const linhas = useRef(new Map<string, HTMLLIElement>());

  // No computador o primeiro item já vem aberto, para a coluna do detalhe não começar vazia; no celular, tudo fechado.
  // Se a lista muda (filtro, busca) e o item escolhido sai dela, a escolha volta para o primeiro (ou para nenhum).
  useEffect(() => {
    if (escolhido != null && itens.some((x) => chave(x) === escolhido)) return;
    const computador = window.matchMedia("(min-width: 1024px)").matches;
    if (computador && itens.length) escolher(chave(itens[0]));
    else if (escolhido != null) escolher(null);
  }, [itens]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setQuantos(porVez), [itens, porVez]);
  // Item escolhido de fora (link, filtro, ponto no mapa): a lista cresce até ele e rola para mostrá-lo.
  useEffect(() => {
    if (escolhido == null) return;
    const pos = itens.findIndex((x) => chave(x) === escolhido);
    if (pos >= quantos) setQuantos(pos + 1);
    requestAnimationFrame(() => {
      const el = linhas.current.get(escolhido);
      const box = caixa.current;
      if (el && box && box.scrollHeight > box.clientHeight) box.scrollTo({ top: el.offsetTop - box.offsetTop - 8, behavior: "smooth" });
    });
  }, [escolhido]); // eslint-disable-line react-hooks/exhaustive-deps

  const atual = itens.find((x) => chave(x) === escolhido) ?? null;
  const menos = () => {
    setQuantos(porVez);
    caixa.current?.scrollTo({ top: 0 });
    if (caixa.current && caixa.current.getBoundingClientRect().top < 0) caixa.current.scrollIntoView({ block: "start" });
  };

  if (!itens.length) return <>{vazio}</>;
  return (
    <div className={`grid gap-x-8 gap-y-4 lg:items-start ${colunas}`}>
      <div className="min-w-0">
        <ol ref={caixa} className="relative space-y-0.5 scroll-mt-32 lg:max-h-[36rem] lg:overflow-y-auto lg:overscroll-contain lg:rounded-2xl lg:border lg:border-slate-200 lg:p-1.5">
          {itens.slice(0, quantos).map((x, n) => {
            const id = chave(x);
            const ativo = id === escolhido;
            return (
              <li
                key={id}
                ref={(el) => {
                  if (el) linhas.current.set(id, el);
                  else linhas.current.delete(id);
                }}
              >
                <button
                  type="button"
                  aria-expanded={ativo}
                  onClick={() => escolher(ativo ? null : id)}
                  className={`block w-full rounded-lg px-2 py-1.5 text-left transition ${ativo ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  {linha(x, ativo, n)}
                </button>
                {ativo && <div className="mt-1 mb-3 lg:hidden">{detalhe(x)}</div>}
              </li>
            );
          })}
        </ol>
        {(itens.length > quantos || quantos > porVez) && (
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {itens.length > quantos && (
              <button type="button" onClick={() => setQuantos(quantos + porVez)} className="font-bold text-blue-800 underline">
                Ver mais {Math.min(porVez, itens.length - quantos).toLocaleString("pt-BR")} {nome}
              </button>
            )}
            {quantos > porVez && (
              <button type="button" onClick={menos} className="font-bold text-blue-800 underline">
                Ver menos
              </button>
            )}
            <span className="text-slate-500 tabular-nums">
              {Math.min(quantos, itens.length).toLocaleString("pt-BR")} de {itens.length.toLocaleString("pt-BR")}
            </span>
          </div>
        )}
      </div>
      <div className="hidden min-w-0 lg:sticky lg:top-28 lg:block lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain">
        {atual ? detalhe(atual) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Escolha um item na lista para ver os detalhes.</p>}
      </div>
    </div>
  );
}
