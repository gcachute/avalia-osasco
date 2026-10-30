"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BairroMapa } from "@/lib/dados";
import { GRUPO_ORIGEM, ROTULO_ORIGEM, frase, type ItemDinheiroBairro } from "@/lib/dinheiro";
import { dinheiroCurto, reaisExato } from "@/lib/formato";

type Grupo = "emendas" | "federal" | "estadual" | "vereadores";
const GRUPOS: { chave: Grupo; nome: string; cor: string }[] = [
  { chave: "emendas", nome: "Emendas", cor: "var(--grafico-4)" },
  { chave: "federal", nome: "Gasto com verba federal", cor: "var(--grafico-1)" },
  { chave: "estadual", nome: "Gasto com verba estadual", cor: "var(--grafico-2)" },
  { chave: "vereadores", nome: "Emendas individuais", cor: "var(--grafico-3)" },
];

// Com o item aberto (clique), os outros bairros citados ficam coloridos no mapa.
type Realce = { atual: string; nomes: Map<string, string>; marcar: (ids: string[] | null, ajuste?: "enquadrar" | "selecionado") => void };

// "4 emendas", "3 compras".
const nomeParte = (origem: ItemDinheiroBairro["origem"], n: number) =>
  origem === "pix" ? (n === 1 ? "emenda" : "emendas") : origem === "convenio" ? (n === 1 ? "convênio" : "convênios") : n === 1 ? "compra" : "compras";

function Item({ i, indice, realce }: { i: ItemDinheiroBairro; indice: number; realce?: Realce }) {
  const [aberto, setAberto] = useState(false);
  const outros = (i.bairros ?? []).filter((b) => b !== realce?.atual);
  const grupo = GRUPOS.find((g) => g.chave === GRUPO_ORIGEM[i.origem])!;
  // O item mostra o valor inteiro; só a soma do bairro (no alto da aba) conta a parte igual de cada bairro citado.
  const bairros = i.outrosBairros + 1;
  const partes = i.partes && i.partes.length > 1 ? i.partes : null;
  // Clicar em qualquer parte do item abre o detalhe; num item de vários bairros, o mapa se ajusta para mostrar todos
  // (fechar volta ao bairro escolhido).
  const alternar = () => {
    setAberto(!aberto);
    if (realce && outros.length > 0) realce.marcar(!aberto ? outros : null, !aberto ? "enquadrar" : "selecionado");
  };
  return (
    <li
      className={`entra cursor-pointer rounded-lg p-2 transition-colors ${aberto && outros.length ? "bg-blue-50 ring-1 ring-blue-200" : "bg-slate-50 hover:bg-slate-100"}`}
      style={{ "--i": indice } as React.CSSProperties}
      onClick={alternar}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: grupo.cor }} aria-hidden />
          {ROTULO_ORIGEM[i.origem]}
        </span>
        <span className="tabular-nums">{i.ano}</span>
        {partes && (
          <span className="rounded-full bg-white px-1.5 font-medium text-slate-700 ring-1 ring-slate-200">
            {partes.length} {nomeParte(i.origem, partes.length)}
          </span>
        )}
        <span className="ml-auto text-right">
          <span className="block font-semibold tabular-nums text-slate-900">{dinheiroCurto(i.valor)}</span>
          {bairros > 1 && <span className="block text-[10px] text-slate-500">{bairros} bairros</span>}
        </span>
      </div>
      {/* Para quem usa o teclado; o clique sobe até o item. */}
      <button
        type="button"
        aria-expanded={aberto}
        className="mt-0.5 block w-full text-left"
      >
        <span className={`block text-slate-700 ${aberto ? "" : "line-clamp-3"}`}>{frase(i.texto)}</span>
        {aberto && (
          <span className="mt-0.5 block tabular-nums text-slate-500">
            Valor exato: {reaisExato(i.valor)}
          </span>
        )}
      </button>
      {/* Várias emendas ou compras juntas: fechado, os nomes; aberto, cada uma com o valor. */}
      {partes && !aberto && (
        <p className="mt-0.5 text-[11px] text-slate-500">
          {[...new Set(partes.map((x) => x.quem).filter(Boolean))].slice(0, 3).join(", ")}
          {new Set(partes.map((x) => x.quem)).size > 3 && ` e mais ${new Set(partes.map((x) => x.quem)).size - 3}`}
        </p>
      )}
      {partes && aberto && (
        <ul className="mt-1.5 divide-y divide-slate-200/70 rounded-md bg-white/60 px-2 text-[11px] ring-1 ring-slate-200">
          {partes.map((x, k) => (
            <li key={k} className="flex items-baseline gap-2 py-1">
              <span className="min-w-0 flex-1">
                {x.autor ? (
                  <Link href={`/verbas?autor=${x.autor}`} onClick={(e) => e.stopPropagation()} className="font-medium text-blue-800 underline">
                    {x.quem}
                  </Link>
                ) : (
                  <span className="text-slate-700">{x.quem ?? "—"}</span>
                )}
                {x.pagamentos && x.pagamentos > 1 && <span className="text-slate-500"> · {x.pagamentos} pagamentos</span>}
              </span>
              <span className="shrink-0 text-right tabular-nums text-slate-900">
                {reaisExato(x.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
        {partes ? null : i.autor ? (
          <Link href={`/verbas?autor=${i.autor}`} onClick={(e) => e.stopPropagation()} className="font-medium text-blue-800 underline">
            {i.quem}
          </Link>
        ) : (
          i.quem && <span>{i.quem}</span>
        )}
        {!partes && i.pagamentos && i.pagamentos > 1 && <span>{i.pagamentos} pagamentos</span>}

      </div>
      {i.via && i.via.length > 0 && (
        <p className="mt-1 text-[11px] text-slate-600">
          <span className="font-medium">Ligado aos bairros por:</span> {i.via.join(", ")}
          {bairros > 1 ? ` (passa por ${bairros} bairros)` : ""}.
        </p>
      )}
      {outros.length > 0 && realce && (
        <p className="mt-1 text-[11px] text-slate-600">
          <span className="font-medium">Também cita</span> (coloridos no mapa com o item aberto):{" "}
          {outros
            .map((b) => realce.nomes.get(b) ?? b)
            .sort((x, y) => x.localeCompare(y, "pt-BR"))
            .join(", ")}
          .
        </p>
      )}
    </li>
  );
}

export function DinheiroBairro({ d, realce }: { d: NonNullable<BairroMapa["dinheiro"]>; realce?: Realce }) {
  const [filtro, setFiltro] = useState<Grupo | null>(null);
  const porGrupo = d.porGrupo ?? {};
  const presentes = GRUPOS.filter((g) => (porGrupo[g.chave] ?? 0) > 0);
  const total = presentes.reduce((s, g) => s + (porGrupo[g.chave] ?? 0), 0);
  const itens = filtro ? d.itens.filter((i) => GRUPO_ORIGEM[i.origem] === filtro) : d.itens;
  // Ao sair da aba, os bairros coloridos voltam ao normal.
  const marcar = realce?.marcar;
  useEffect(() => () => marcar?.(null), [marcar]);
  return (
    <div>
      <p className="text-xs text-slate-500">
        {d.quantidade === 1 ? "1 item" : `${d.quantidade} itens`} com dinheiro da União, do Estado ou de emendas citam o bairro, somando{" "}
        <span className="font-semibold text-slate-900">{dinheiroCurto(d.valor)}</span> (o que cita vários bairros entra na soma dividido igualmente entre
        eles; os itens abaixo mostram o valor inteiro).
      </p>
      {total > 0 && (
        <>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded" role="img" aria-label={presentes.map((g) => `${g.nome}: ${dinheiroCurto(porGrupo[g.chave]!)}`).join("; ")}>
            {presentes.map((g) => (
              <span
                key={g.chave}
                className="barra-anim border-r-2 border-white transition-opacity last:border-r-0"
                style={{ width: `${(porGrupo[g.chave]! / total) * 100}%`, background: g.cor, opacity: filtro && filtro !== g.chave ? 0.3 : 1 }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Filtrar por origem">
            {presentes.map((g) => (
              <button
                key={g.chave}
                type="button"
                aria-pressed={filtro === g.chave}
                onClick={() => setFiltro(filtro === g.chave ? null : g.chave)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 transition ${filtro === g.chave ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"}`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.cor }} aria-hidden />
                {g.nome} <span className="tabular-nums opacity-70">{dinheiroCurto(porGrupo[g.chave]!)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {d.quantidade > d.itens.length && !filtro && <p className="mt-2 text-[11px] text-slate-500">Os {d.itens.length} de maior valor:</p>}
      <ol key={filtro ?? "todos"} className="mt-2 space-y-2 text-xs">
        {itens.map((i, n) => (
          <Item key={n} i={i} indice={n} realce={realce} />
        ))}
      </ol>
      {!itens.length && <p className="mt-2 text-xs text-slate-500">Entre os itens de maior valor, nenhum é deste tipo.</p>}
      <Link href="/verbas" className="mt-2 inline-block text-xs font-medium text-blue-800 underline">
        Ver a página Verbas e receitas
      </Link>
    </div>
  );
}
