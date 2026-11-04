"use client";

import Link from "next/link";
import { useState } from "react";
import { dataBR } from "@/lib/formato";

export type Recente = {
  id: string;
  tipo: string;
  numero: string | null;
  origem: "camara" | "prefeitura";
  data: string;
  texto: string;
  autores: { nome: string; href: string | null }[];
  sessao: { rotulo: string; url: string } | null;
  bairros: { id: string; nome: string; documentos: number }[];
};

const POR_VEZ = 4;

// Os documentos mais recentes que citam algum bairro. Tocar num documento abre o detalhe logo abaixo dele: texto inteiro,
// autoria, sessão em que foi lido (com a planilha oficial) e os bairros, que abrem no mapa.
export function Acontecendo({ recentes, aoVerBairro }: { recentes: Recente[]; aoVerBairro: (id: string) => void }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [quantos, setQuantos] = useState(POR_VEZ);

  return (
    <section className="min-w-0 rounded-2xl bg-slate-50 p-5 lg:mt-4">
      <h2 className="text-[1.6rem] leading-tight text-slate-950">Acontecendo agora</h2>
      <p className="mt-1 text-sm text-slate-600">Os documentos mais recentes que citam algum bairro. Toque em um para ver os detalhes.</p>
      <ol className="mt-3 divide-y divide-slate-200">
        {recentes.slice(0, quantos).map((r) => {
          const abre = aberto === r.id;
          return (
            <li key={r.id} className="py-1.5">
              <button
                type="button"
                aria-expanded={abre}
                onClick={() => setAberto(abre ? null : r.id)}
                className={`-mx-2 block w-[calc(100%+1rem)] rounded-xl px-2 py-1.5 text-left transition ${abre ? "bg-white" : "hover:bg-white"}`}
              >
                <span className="flex items-baseline gap-2 text-[13px] text-slate-600">
                  <span className="min-w-0 flex-1">
                    <span className="font-bold text-blue-800">{r.bairros.map((b) => b.nome).join(", ")}</span>
                    {`, ${r.tipo.toLowerCase()}, ${dataBR(r.data)}`}
                  </span>
                  <svg viewBox="0 0 12 12" className={`h-3 w-3 shrink-0 text-slate-500 transition ${abre ? "rotate-180" : ""}`} aria-hidden>
                    <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className={`mt-1 block text-[15px] text-slate-900 ${abre ? "" : "line-clamp-3"}`}>{r.texto}</span>
                {!abre && r.autores.length > 0 && <span className="mt-0.5 block text-[13px] text-slate-600">{r.autores.map((a) => a.nome).join(", ")}</span>}
              </button>
              {abre && <Detalhe r={r} aoVerBairro={aoVerBairro} />}
            </li>
          );
        })}
      </ol>
      {(recentes.length > quantos || quantos > POR_VEZ) && (
        <div className="mt-2 flex gap-x-5 text-sm">
          {recentes.length > quantos && (
            <button type="button" onClick={() => setQuantos(quantos + POR_VEZ)} className="font-bold text-blue-800 hover:underline">
              Ver mais {Math.min(POR_VEZ, recentes.length - quantos)} documentos
            </button>
          )}
          {quantos > POR_VEZ && (
            <button
              type="button"
              onClick={() => {
                setQuantos(POR_VEZ);
                setAberto(null);
              }}
              className="font-bold text-blue-800 hover:underline"
            >
              Ver menos
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Detalhe({ r, aoVerBairro }: { r: Recente; aoVerBairro: (id: string) => void }) {
  return (
    <div className="-mx-2 mb-1 rounded-b-xl bg-white px-2 pb-3 text-sm">
      <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5">
        <dt className="text-slate-500">Documento</dt>
        <dd className="text-slate-900">
          {r.tipo}
          {r.numero && <span className="tabular-nums"> nº {r.numero}</span>}
          <span className="text-slate-500">{r.origem === "prefeitura" ? ", enviado pela Prefeitura" : ", da Câmara"}</span>
        </dd>
        {r.autores.length > 0 && (
          <>
            <dt className="text-slate-500">{r.autores.length > 1 ? "Autoria" : "Autor"}</dt>
            <dd className="text-slate-900">
              {r.autores.map((a, i) => (
                <span key={a.nome}>
                  {i > 0 && ", "}
                  {a.href ? (
                    <Link href={a.href} className="font-bold text-blue-800 hover:underline">
                      {a.nome}
                    </Link>
                  ) : (
                    a.nome
                  )}
                </span>
              ))}
            </dd>
          </>
        )}
        {r.sessao && (
          <>
            <dt className="text-slate-500">Lido na</dt>
            <dd className="text-slate-900">
              {r.sessao.rotulo},{" "}
              <a href={r.sessao.url} className="text-blue-800 underline">
                planilha oficial
              </a>
            </dd>
          </>
        )}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {r.bairros.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => aoVerBairro(b.id)}
            className="rounded-full bg-blue-50 px-3 py-1.5 text-[13px] font-bold text-blue-900 transition hover:bg-blue-100"
          >
            Ver {b.nome} no mapa <span className="font-normal text-blue-800">({b.documentos === 1 ? "1 documento" : `${b.documentos} documentos`})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
