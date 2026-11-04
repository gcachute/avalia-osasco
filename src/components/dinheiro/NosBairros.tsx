"use client";

import Link from "next/link";
import { ListaDetalhe } from "@/components/ListaDetalhe";
import { DinheiroBairro } from "@/components/mapa/DinheiroBairro";
import { Barra } from "@/components/ui";
import type { BairroMapa } from "@/lib/dados";
import { dinheiroCurto, reaisExato } from "@/lib/formato";

export type BairroComDinheiro = { id: string; nome: string; dinheiro: NonNullable<BairroMapa["dinheiro"]> };

// Todos os bairros com dinheiro citado, do maior para o menor, de 5 em 5. Tocar num bairro abre o detalhe: de onde veio o
// dinheiro (emendas, verba federal, verba estadual) e cada item, com quem recebeu, também de 5 em 5.
export function NosBairros({ bairros }: { bairros: BairroComDinheiro[] }) {
  const maior = bairros[0]?.dinheiro.valor ?? 1;
  return (
    <ListaDetalhe
      itens={bairros}
      chave={(b) => b.id}
      porVez={5}
      nome="bairros"
      linha={(b, ativo, n) => (
        <>
          <span className="flex items-baseline gap-3 text-sm">
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-500">{n + 1}</span>
            <span className={`min-w-0 flex-1 ${ativo ? "font-bold text-blue-900" : "text-slate-800"}`}>{b.nome}</span>
            <span className="shrink-0 text-xs text-slate-600">{b.dinheiro.quantidade === 1 ? "1 item" : `${b.dinheiro.quantidade} itens`}</span>
            <span className="w-[5.75rem] shrink-0 text-right font-bold whitespace-nowrap tabular-nums text-slate-950" title={reaisExato(b.dinheiro.valor)}>
              {dinheiroCurto(b.dinheiro.valor)}
            </span>
          </span>
          <span className="mt-1 block pl-8">
            <Barra valor={b.dinheiro.valor / maior} altura="h-1" />
          </span>
        </>
      )}
      detalhe={(b) => (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="font-serif text-[1.6rem] leading-tight text-slate-950">{b.nome}</h3>
            <Link href={`/mapa?indicador=dinheiroCitado&bairro=${b.id}`} className="text-sm font-bold text-blue-800 underline">
              Ver no mapa
            </Link>
          </div>
          <div className="mt-3">
            <DinheiroBairro key={b.id} d={b.dinheiro} semLink limite={5} />
          </div>
        </div>
      )}
    />
  );
}
