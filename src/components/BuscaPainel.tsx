"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { Avatar } from "./ui";

// Busca da página inicial: o jeito mais curto de chegar ao que interessa é pelo nome do bairro ou do vereador.
// Bairro abre o painel dele no mapa logo abaixo; vereador abre o perfil. Setas escolhem, Enter abre, Esc fecha.
export type BairroBusca = { id: string; nome: string; citacoes: number };
export type VereadorBusca = { id: string; nome: string; partido: string | null; foto: string | null; emExercicio: boolean };
type Opcao = { tipo: "bairro"; b: BairroBusca } | { tipo: "vereador"; v: VereadorBusca };

const dobra = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

export function BuscaPainel({ bairros, vereadores, aoEscolherBairro }: { bairros: BairroBusca[]; vereadores: VereadorBusca[]; aoEscolherBairro: (id: string) => void }) {
  const router = useRouter();
  const lista = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);

  // Quem começa com o texto vem antes de quem só contém o texto.
  const opcoes = useMemo<Opcao[]>(() => {
    const t = dobra(texto);
    if (!t) return [];
    const nota = (nome: string) => {
      const n = dobra(nome);
      return n.startsWith(t) ? 0 : n.split(/\s+/).some((p) => p.startsWith(t)) ? 1 : n.includes(t) ? 2 : -1;
    };
    const bs = bairros.map((b) => [nota(b.nome), b] as const).filter(([n]) => n >= 0);
    const vs = vereadores.map((v) => [nota(v.nome), v] as const).filter(([n]) => n >= 0);
    return [
      ...bs.sort((a, b) => a[0] - b[0] || a[1].nome.localeCompare(b[1].nome, "pt-BR")).map(([, b]) => ({ tipo: "bairro" as const, b })),
      ...vs.sort((a, b) => a[0] - b[0] || a[1].nome.localeCompare(b[1].nome, "pt-BR")).map(([, v]) => ({ tipo: "vereador" as const, v })),
    ].slice(0, 8);
  }, [texto, bairros, vereadores]);

  const sugestoes = useMemo(() => [...bairros].sort((a, b) => b.citacoes - a.citacoes).slice(0, 4), [bairros]);

  const abrir = (o: Opcao) => {
    setAberto(false);
    if (o.tipo === "bairro") {
      setTexto(o.b.nome);
      aoEscolherBairro(o.b.id);
    } else {
      router.push(`/vereadores/${o.v.id}`);
    }
  };

  const mostrar = aberto && texto.trim().length > 0;
  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (opcoes[ativo]) abrir(opcoes[ativo]);
          else campo.current?.focus();
        }}
        className="flex items-center gap-3 rounded-2xl border-[1.5px] border-slate-300 bg-white py-2 pr-2 pl-3.5 focus-within:border-blue-700 focus-within:outline-3 focus-within:outline-blue-100"
      >
        <label htmlFor={`${lista}-campo`} className="sr-only">
          Buscar bairro ou vereador
        </label>
        {/* O ícone é o olho do logo, com a mesma íris laranja. */}
        <svg viewBox="0 0 30 30" className="h-7 w-7 shrink-0" aria-hidden>
          <circle cx="15" cy="15" r="11" fill="none" stroke="currentColor" strokeWidth="3.2" className="text-slate-900" />
          <circle cx="16.6" cy="14" r="5.4" fill="#f26419" />
          <circle cx="17.4" cy="13.4" r="2.3" fill="#0e1a3d" />
          <circle cx="18.5" cy="12" r="1" fill="#fff" />
        </svg>
        <input
          ref={campo}
          id={`${lista}-campo`}
          type="search"
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={lista}
          aria-autocomplete="list"
          aria-activedescendant={mostrar && opcoes[ativo] ? `${lista}-${ativo}` : undefined}
          autoComplete="off"
          value={texto}
          placeholder="Bairro ou vereador"
          onChange={(e) => {
            setTexto(e.target.value);
            setAtivo(0);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAtivo((a) => Math.min(a + 1, opcoes.length - 1));
              setAberto(true);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAtivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Escape") setAberto(false);
          }}
          className="min-w-0 flex-1 bg-transparent py-2 text-[1.05rem] text-slate-950 outline-none placeholder:text-slate-500 sm:text-lg"
        />
        <button type="submit" className="shrink-0 rounded-xl bg-blue-700 px-5 py-2.5 text-base font-bold text-white transition hover:bg-blue-800">
          Ver
        </button>
      </form>

      {mostrar && (
        <ul id={lista} role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 max-h-[22rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg">
          {opcoes.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Nenhum bairro ou vereador com esse nome.</li>}
          {opcoes.map((o, i) => (
            <li
              key={o.tipo === "bairro" ? `b-${o.b.id}` : `v-${o.v.id}`}
              id={`${lista}-${i}`}
              role="option"
              aria-selected={i === ativo}
              onMouseDown={(e) => {
                e.preventDefault();
                abrir(o);
              }}
              onMouseEnter={() => setAtivo(i)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${i === ativo ? "bg-slate-100" : ""}`}
            >
              {o.tipo === "bairro" ? (
                <>
                  <span className="grid h-8 w-8 shrink-0 place-items-center text-slate-500" aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
                      <circle cx="12" cy="10" r="2.3" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-950">{o.b.nome}</span>
                    <span className="block text-xs text-slate-500">Bairro · {o.b.citacoes ? plural(o.b.citacoes, "documento cita", "documentos citam") : "nenhum documento cita"}</span>
                  </span>
                </>
              ) : (
                <>
                  <Avatar nome={o.v.nome} foto={o.v.foto} tamanho={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-950">{o.v.nome}</span>
                    <span className="block text-xs text-slate-500">
                      {o.v.emExercicio ? "Na Câmara" : "Passou pela Câmara nesta legislatura"}
                      {o.v.partido ? ` · ${o.v.partido}` : ""}
                    </span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-600">
        <span>Mais citados nos documentos:</span>
        {sugestoes.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => abrir({ tipo: "bairro", b })}
            className="py-1.5 font-bold text-blue-800 underline decoration-blue-200 decoration-2 underline-offset-4 hover:decoration-blue-700"
          >
            {b.nome}
          </button>
        ))}
        <Link href="/vereadores" className="text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-900">
          todos os vereadores
        </Link>
      </p>
    </div>
  );
}
