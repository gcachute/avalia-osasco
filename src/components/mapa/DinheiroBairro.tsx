"use client";

import Link from "next/link";
import { useState } from "react";
import type { BairroMapa } from "@/lib/dados";
import { GRUPO_ORIGEM, ROTULO_ORIGEM, frase, type ItemDinheiroBairro } from "@/lib/dinheiro";
import { dinheiroCurto, reaisExato } from "@/lib/formato";

type Grupo = "emendas" | "federal" | "estadual" | "vereadores";
const GRUPOS: { chave: Grupo; nome: string; cor: string }[] = [
  { chave: "emendas", nome: "Emendas e convênios", cor: "var(--grafico-4)" },
  { chave: "federal", nome: "Gasto com verba federal", cor: "var(--grafico-1)" },
  { chave: "estadual", nome: "Gasto com verba estadual", cor: "var(--grafico-2)" },
  { chave: "vereadores", nome: "Emendas individuais", cor: "var(--grafico-3)" },
];

function Item({ i, indice }: { i: ItemDinheiroBairro; indice: number }) {
  const [aberto, setAberto] = useState(false);
  const grupo = GRUPOS.find((g) => g.chave === GRUPO_ORIGEM[i.origem])!;
  return (
    <li className="entra rounded-lg bg-slate-50 p-2" style={{ "--i": indice } as React.CSSProperties}>
      <div className="flex flex-wrap items-baseline gap-x-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: grupo.cor }} aria-hidden />
          {ROTULO_ORIGEM[i.origem]}
        </span>
        <span className="tabular-nums">{i.ano}</span>
        <span className="ml-auto font-semibold tabular-nums text-slate-900">{dinheiroCurto(i.valor)}</span>
      </div>
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="mt-0.5 block w-full text-left">
        <span className={`block text-slate-700 ${aberto ? "" : "line-clamp-3"}`}>{frase(i.texto)}</span>
        {aberto && <span className="mt-0.5 block tabular-nums text-slate-500">Valor exato: {reaisExato(i.valor)}</span>}
      </button>
      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
        {i.autor ? (
          <Link href={`/verbas?autor=${i.autor}`} className="font-medium text-blue-800 underline">
            {i.quem}
          </Link>
        ) : (
          i.quem && <span>{i.quem}</span>
        )}
        {i.pagamentos && i.pagamentos > 1 && <span>{i.pagamentos} pagamentos</span>}
        {i.outrosBairros > 0 && <span>cita mais {i.outrosBairros === 1 ? "1 bairro" : `${i.outrosBairros} bairros`} (valor dividido)</span>}
      </div>
    </li>
  );
}

export function DinheiroBairro({ d }: { d: NonNullable<BairroMapa["dinheiro"]> }) {
  const [filtro, setFiltro] = useState<Grupo | null>(null);
  const porGrupo = d.porGrupo ?? {};
  const presentes = GRUPOS.filter((g) => (porGrupo[g.chave] ?? 0) > 0);
  const total = presentes.reduce((s, g) => s + (porGrupo[g.chave] ?? 0), 0);
  const itens = filtro ? d.itens.filter((i) => GRUPO_ORIGEM[i.origem] === filtro) : d.itens;
  return (
    <div>
      <p className="text-xs text-slate-500">
        {d.quantidade === 1 ? "1 item" : `${d.quantidade} itens`} com dinheiro da União, do Estado ou de emendas citam o bairro, somando{" "}
        <span className="font-semibold text-slate-900">{dinheiroCurto(d.valor)}</span>.
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
          <Item key={n} i={i} indice={n} />
        ))}
      </ol>
      {!itens.length && <p className="mt-2 text-xs text-slate-500">Entre os itens de maior valor, nenhum é deste tipo.</p>}
      <Link href="/verbas" className="mt-2 inline-block text-xs font-medium text-blue-800 underline">
        Todas as verbas de fora
      </Link>
    </div>
  );
}
