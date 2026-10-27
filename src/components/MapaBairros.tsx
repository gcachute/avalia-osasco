"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemMapa } from "@/lib/dados";
import { num } from "@/lib/formato";

export type BairroDesenho = {
  id: string;
  nome: string;
  populacao: number | null;
  d: string;
  cx: number;
  cy: number;
  area: number;
  distancia: number;
};

type Metrica = "citacoes" | "porHab" | "populacao";
type Origem = "todos" | "camara" | "prefeitura";

const METRICAS: { chave: Metrica; nome: string; dica: string }[] = [
  { chave: "citacoes", nome: "Citações", dica: "Documentos que citam o bairro" },
  { chave: "porHab", nome: "Por 10 mil moradores", dica: "Citações divididas pela população do bairro" },
  { chave: "populacao", nome: "População", dica: "Moradores no Censo 2022" },
];
const ORIGENS: { chave: Origem; nome: string }[] = [
  { chave: "todos", nome: "Câmara e Prefeitura" },
  { chave: "camara", nome: "Só Câmara" },
  { chave: "prefeitura", nome: "Só Prefeitura" },
];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const FAIXAS = 6;
const corDaFaixa = (f: number) => (f === 0 ? "var(--mapa-vazio)" : `var(--mapa-${f})`);
const corOrigem = (o: ItemMapa["origem"]) => (o === "camara" ? "var(--mapa-camara)" : "var(--mapa-prefeitura)");

function mesesEntre(inicio: string, fim: string) {
  const out: string[] = [];
  let [a, m] = [Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7))];
  const [af, mf] = [Number(fim.slice(0, 4)), Number(fim.slice(5, 7))];
  while (a < af || (a === af && m <= mf)) {
    out.push(`${a}-${String(m).padStart(2, "0")}`);
    m === 12 ? ((a += 1), (m = 1)) : (m += 1);
  }
  return out;
}

const dataCurta = (iso: string) => iso.split("-").reverse().join("/");

export function MapaBairros({
  bairros,
  itens,
  largura,
  altura,
  inicio,
  fim,
}: {
  bairros: BairroDesenho[];
  itens: ItemMapa[];
  largura: number;
  altura: number;
  inicio: string;
  fim: string;
}) {
  const meses = useMemo(() => mesesEntre(inicio, fim), [inicio, fim]);
  const [metrica, setMetrica] = useState<Metrica>("citacoes");
  const [origem, setOrigem] = useState<Origem>("todos");
  const [autor, setAutor] = useState("");
  const [mes, setMes] = useState(meses.length - 1);
  const [tocando, setTocando] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [dica, setDica] = useState<{ x: number; y: number } | null>(null);
  const [entrou, setEntrou] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // A animação de entrada só roda quando o mapa aparece na tela.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && (setEntrou(true), obs.disconnect()), { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Play: avança um mês a cada 0,9 s; ao chegar no fim, para.
  useEffect(() => {
    if (!tocando) return;
    const t = setInterval(() => {
      setMes((m) => {
        if (m >= meses.length - 1) {
          setTocando(false);
          return m;
        }
        return m + 1;
      });
    }, 900);
    return () => clearInterval(t);
  }, [tocando, meses.length]);

  const autores = useMemo(() => {
    const m = new Map<string, { id: string; nome: string; n: number; origem: ItemMapa["origem"] }>();
    for (const i of itens) {
      const a = m.get(i.autor) ?? { id: i.autor, nome: i.autorNome ?? i.autor, n: 0, origem: i.origem };
      a.n++;
      m.set(i.autor, a);
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [itens]);

  // Itens que passam pelos filtros (sem o recorte de tempo, para a escala de cor ficar fixa durante o play).
  const filtrados = useMemo(
    () => itens.filter((i) => (origem === "todos" || i.origem === origem) && (!autor || i.autor === autor)),
    [itens, origem, autor],
  );
  const ateMes = meses[mes];
  const visiveis = useMemo(() => filtrados.filter((i) => i.data.slice(0, 7) <= ateMes), [filtrados, ateMes]);

  const contar = (lista: ItemMapa[]) => {
    const c: Record<string, { total: number; camara: number; prefeitura: number }> = {};
    for (const b of bairros) c[b.id] = { total: 0, camara: 0, prefeitura: 0 };
    for (const i of lista)
      for (const b of i.bairros)
        if (c[b]) {
          c[b].total++;
          c[b][i.origem]++;
        }
    return c;
  };
  const contagem = useMemo(() => contar(visiveis), [visiveis]); // eslint-disable-line react-hooks/exhaustive-deps
  const contagemFinal = useMemo(() => contar(filtrados), [filtrados]); // eslint-disable-line react-hooks/exhaustive-deps

  const valor = (b: BairroDesenho, c = contagem) =>
    metrica === "populacao" ? (b.populacao ?? 0) : metrica === "porHab" ? (b.populacao ? (c[b.id].total / b.populacao) * 1e4 : 0) : c[b.id].total;
  const maximo = Math.max(1e-9, ...bairros.map((b) => valor(b, contagemFinal)));
  const faixa = (v: number) => (v <= 0 ? 0 : Math.min(FAIXAS, Math.ceil((v / maximo) * FAIXAS)));
  const formata = (v: number) => (metrica === "populacao" ? Math.round(v).toLocaleString("pt-BR") : metrica === "porHab" ? num(v, 1) : String(v));

  const porMes = useMemo(() => meses.map((m) => filtrados.filter((i) => i.data.startsWith(m)).length), [meses, filtrados]);
  const maxMes = Math.max(1, ...porMes);
  const doMes = useMemo(() => filtrados.filter((i) => i.data.startsWith(ateMes)), [filtrados, ateMes]);

  const ranking = useMemo(
    () =>
      bairros
        .map((b) => ({ b, v: valor(b) }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v),
    [bairros, contagem, metrica], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const nuncaCitados = bairros.filter((b) => contagem[b.id].total === 0);
  const rotulados = new Set(ranking.slice(0, 5).map((x) => x.b.id));
  const porId = useMemo(() => new Map(bairros.map((b) => [b.id, b])), [bairros]);
  const sel = selecionado ? porId.get(selecionado) : null;
  const realce = foco ?? selecionado;
  const itensSel = sel ? visiveis.filter((i) => i.bairros.includes(sel.id)).slice().reverse() : [];
  const bFoco = foco ? porId.get(foco) : null;
  const totalVisiveis = visiveis.length;
  const maxDist = Math.max(1, ...bairros.map((b) => b.distancia));
  // Painel ao lado do mapa: documentos do mês escolhido ou, sem nenhum, os mais recentes até ele.
  const feed = (doMes.length ? doMes : visiveis.slice(-6)).slice().reverse().slice(0, 6);

  const tocar = () => {
    if (tocando) return setTocando(false);
    if (mes >= meses.length - 1) setMes(0);
    setTocando(true);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        {/* Filtros: tudo em uma linha acima do mapa */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="O que colorir">
            {METRICAS.map((m) => (
              <button
                key={m.chave}
                title={m.dica}
                onClick={() => setMetrica(m.chave)}
                aria-pressed={metrica === m.chave}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${metrica === m.chave ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {m.nome}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Origem dos documentos">
            {ORIGENS.map((o) => (
              <button
                key={o.chave}
                onClick={() => {
                  setOrigem(o.chave);
                  setAutor("");
                }}
                aria-pressed={origem === o.chave}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${origem === o.chave ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {o.chave !== "todos" && <span className="h-2 w-2 rounded-full" style={{ background: corOrigem(o.chave) }} />}
                {o.nome}
              </button>
            ))}
          </div>
          <select
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            aria-label="Filtrar por autor"
            className="ml-auto min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
          >
            <option value="">Todos os autores</option>
            {autores
              .filter((a) => origem === "todos" || a.origem === origem)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} ({a.n})
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-col gap-4 p-3 md:flex-row md:items-start">
        <div
          ref={caixa}
          className="relative w-full md:w-auto md:shrink-0"
          onMouseLeave={() => {
            setFoco(null);
            setDica(null);
          }}
        >
          <svg
            viewBox={`0 0 ${largura} ${altura}`}
            className={`mx-auto block h-[min(62vh,760px)] w-auto max-w-full md:h-[min(74vh,760px)] ${entrou ? "mapa-entrada" : "opacity-0"}`}
            role="img"
            aria-label="Mapa dos bairros de Osasco"
            onMouseMove={(e) => {
              const r = caixa.current!.getBoundingClientRect();
              setDica({ x: e.clientX - r.left, y: e.clientY - r.top });
            }}
          >
            <g>
              {bairros.map((b) => {
                const f = faixa(valor(b));
                const ativo = realce === b.id;
                return (
                  <path
                    key={b.id}
                    d={b.d}
                    className="mapa-bairro cursor-pointer"
                    style={{ ["--atraso" as string]: `${(b.distancia / maxDist) * 0.7}s`, fill: corDaFaixa(f), opacity: realce && !ativo ? 0.55 : 1 }}
                    stroke="var(--mapa-borda)"
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                    tabIndex={0}
                    role="button"
                    aria-label={`${b.nome}: ${formata(valor(b))}`}
                    onMouseEnter={() => setFoco(b.id)}
                    onFocus={() => setFoco(b.id)}
                    onBlur={() => setFoco(null)}
                    onClick={() => setSelecionado(selecionado === b.id ? null : b.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelecionado(selecionado === b.id ? null : b.id))}
                  />
                );
              })}
            </g>
            {/* Contorno do bairro em foco por cima de todos */}
            {realce && porId.get(realce) && (
              <path d={porId.get(realce)!.d} fill="none" stroke="var(--mapa-destaque)" strokeWidth={2.5} strokeLinejoin="round" pointerEvents="none" />
            )}
            {/* Ondas: documentos do mês atual saindo do centro de cada bairro, na cor da origem */}
            <g key={`ondas-${mes}-${origem}-${autor}`}>
              {doMes.flatMap((i, k) =>
                i.bairros
                  .map((id) => porId.get(id))
                  .filter(Boolean)
                  .map((b) => (
                    <g key={`${i.id}-${b!.id}`}>
                      <circle cx={b!.cx} cy={b!.cy} r={9} fill="none" stroke={corOrigem(i.origem)} strokeWidth={3} className="mapa-onda" style={{ animationDelay: `${(k % 6) * 0.12}s` }} />
                      <circle cx={b!.cx} cy={b!.cy} r={4.5} fill={corOrigem(i.origem)} stroke="var(--mapa-borda)" strokeWidth={1.5} />
                    </g>
                  )),
              )}
            </g>
            {sel && <circle cx={sel.cx} cy={sel.cy} r={7} fill="var(--mapa-destaque)" className="mapa-pulso" />}
            {/* Rótulos dos bairros com mais destaque e do bairro em foco */}
            {bairros
              .filter((b) => rotulados.has(b.id) || b.id === realce)
              .map((b) => (
                <text key={`t-${b.id}`} x={b.cx} y={b.cy - 10} textAnchor="middle" className="mapa-rotulo" fontSize={b.id === realce ? 15 : 12} fontWeight={600}>
                  {b.nome}
                </text>
              ))}
          </svg>

          {bFoco && dica && (
            <div
              className="pointer-events-none absolute z-10 w-56 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
              style={{ left: Math.min(dica.x + 14, (caixa.current?.clientWidth ?? 600) - 236), top: dica.y + 14 }}
            >
              <div className="text-sm font-semibold text-slate-900">{bFoco.nome}</div>
              <div className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-slate-600">
                <span>Moradores</span>
                <span className="text-right tabular-nums text-slate-900">{bFoco.populacao?.toLocaleString("pt-BR") ?? "—"}</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--mapa-camara)" }} />
                  Câmara
                </span>
                <span className="text-right tabular-nums text-slate-900">{contagem[bFoco.id].camara}</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--mapa-prefeitura)" }} />
                  Prefeitura
                </span>
                <span className="text-right tabular-nums text-slate-900">{contagem[bFoco.id].prefeitura}</span>
                <span>Por 10 mil moradores</span>
                <span className="text-right tabular-nums text-slate-900">
                  {bFoco.populacao ? num((contagem[bFoco.id].total / bFoco.populacao) * 1e4, 1) : "—"}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">Clique para ver os documentos</div>
            </div>
          )}

        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{mes < meses.length - 1 || tocando ? `Até ${rotuloMes(ateMes)}` : "Toda a legislatura"}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tabular-nums tracking-tight text-slate-900">{totalVisiveis}</span>
              <span className="text-sm text-slate-500">documentos em {bairros.length - nuncaCitados.length} bairros</span>
            </div>
          </div>
          {/* Legenda: escala sequencial + origem das ondas */}
          <div className="rounded-xl border border-slate-200 p-2.5 text-[11px] text-slate-600">
            <div className="font-medium text-slate-800">{METRICAS.find((m) => m.chave === metrica)!.nome}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="tabular-nums">0</span>
              <div className="flex overflow-hidden rounded">
                {Array.from({ length: FAIXAS + 1 }, (_, f) => (
                  <span key={f} className="h-2.5 w-4 sm:w-5" style={{ background: corDaFaixa(f) }} />
                ))}
              </div>
              <span className="tabular-nums">{formata(maximo)}</span>
            </div>
            <div className="mt-1.5 flex gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--mapa-camara)" }} />
                Câmara
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--mapa-prefeitura)" }} />
                Prefeitura
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {doMes.length ? `Em ${rotuloMes(ateMes)}` : "Mais recentes"}
            </div>
            <ol className="space-y-2">
              {feed.map((i) => (
                <li
                  key={`${mes}-${i.id}`}
                  className="animate-[mapa-painel_0.45s_ease_both] rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
                  style={{ borderLeft: `3px solid ${corOrigem(i.origem)}` }}
                >
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{i.tipo}</span>
                    <span>·</span>
                    <button className="font-medium text-blue-800 hover:underline" onClick={() => setSelecionado(i.bairros[0])}>
                      {i.bairros.map((id) => porId.get(id)?.nome).filter(Boolean).join(", ")}
                    </button>
                    <span className="ml-auto">{dataCurta(i.data)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-slate-700">{i.texto}</p>
                  <div className="mt-0.5 text-[11px] text-slate-500">{i.autorNome}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
        </div>

        {/* Linha do tempo: histograma clicável + play */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-end gap-3">
            <button
              onClick={tocar}
              aria-label={tocando ? "Pausar" : "Tocar a linha do tempo"}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-800 text-white shadow-sm transition hover:scale-105 hover:bg-blue-700"
            >
              {tocando ? (
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <rect x="3" y="2" width="3.5" height="12" rx="1" />
                  <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M4 2.5v11a1 1 0 0 0 1.5.86l9-5.5a1 1 0 0 0 0-1.72l-9-5.5A1 1 0 0 0 4 2.5Z" />
                </svg>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between text-xs text-slate-500">
                <span>
                  Até <b className="text-sm text-slate-900">{rotuloMes(ateMes)}</b> · {totalVisiveis} documentos
                </span>
                <span>{doMes.length ? `${doMes.length} neste mês` : ""}</span>
              </div>
              <div className="flex h-10 items-end gap-[2px]">
                {porMes.map((n, k) => (
                  <button
                    key={meses[k]}
                    onClick={() => {
                      setTocando(false);
                      setMes(k);
                    }}
                    title={`${rotuloMes(meses[k])}: ${n} documentos`}
                    aria-label={`${rotuloMes(meses[k])}: ${n} documentos`}
                    className="group flex h-full flex-1 items-end"
                  >
                    <span
                      className={`block w-full rounded-t transition-all duration-300 ${k === mes ? "bg-blue-700" : k < mes ? "bg-blue-400 group-hover:bg-blue-500" : "bg-slate-200 group-hover:bg-slate-300"}`}
                      style={{ height: `${Math.max(n ? 12 : 4, (n / maxMes) * 100)}%` }}
                    />
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={meses.length - 1}
                value={mes}
                onChange={(e) => {
                  setTocando(false);
                  setMes(Number(e.target.value));
                }}
                aria-label="Mês"
                className="mt-1 w-full accent-blue-700"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{rotuloMes(meses[0])}</span>
                <span>{rotuloMes(meses.at(-1)!)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Painel lateral: visão geral ou bairro selecionado */}
      <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 lg:max-h-[52rem] lg:overflow-y-auto">
        {sel ? (
          <div key={sel.id} className="animate-[mapa-painel_0.35s_ease]">
            <button onClick={() => setSelecionado(null)} className="text-xs text-slate-500 hover:text-slate-800">
              ← Todos os bairros
            </button>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{sel.nome}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { t: "Moradores", v: sel.populacao?.toLocaleString("pt-BR") ?? "—" },
                { t: "Documentos", v: String(contagem[sel.id].total) },
                { t: "Por 10 mil", v: sel.populacao ? num((contagem[sel.id].total / sel.populacao) * 1e4, 1) : "—" },
              ].map((c) => (
                <div key={c.t} className="rounded-lg bg-slate-50 p-2">
                  <div className="text-lg font-semibold tabular-nums text-slate-900">{c.v}</div>
                  <div className="text-[11px] text-slate-500">{c.t}</div>
                </div>
              ))}
            </div>
            {itensSel.length ? (
              <ol className="mt-4 space-y-3">
                {itensSel.map((i) => (
                  <li key={i.id} className="relative border-l-2 pl-3" style={{ borderColor: corOrigem(i.origem) }}>
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">{i.tipo}</span>
                      <span>{dataCurta(i.data)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700">{i.texto}</p>
                    <div className="mt-0.5 text-xs">
                      {i.origem === "camara" && i.autorNome && !["mesa-diretora", "comissao"].includes(i.autor) ? (
                        <Link href={`/vereadores/${i.autor}`} className="text-blue-800 underline">
                          {i.autorNome}
                        </Link>
                      ) : i.autor === "prefeito" ? (
                        <Link href="/prefeito" className="text-blue-800 underline">
                          {i.autorNome}
                        </Link>
                      ) : (
                        <span className="text-slate-500">{i.autorNome}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Nenhum documento oficial citou {sel.nome} {mes < meses.length - 1 ? `até ${rotuloMes(ateMes)}` : "nesta legislatura"}
                {autor || origem !== "todos" ? " com os filtros escolhidos" : ""}.
              </p>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {metrica === "populacao" ? "Bairros mais populosos" : metrica === "porHab" ? "Mais citados por morador" : "Bairros mais citados"}
            </h2>
            <p className="text-xs text-slate-500">Clique em um bairro, no mapa ou na lista.</p>
            <ol className="mt-3 space-y-1.5">
              {ranking.slice(0, 12).map(({ b, v }, k) => (
                <li key={b.id}>
                  <button
                    onClick={() => setSelecionado(b.id)}
                    onMouseEnter={() => setFoco(b.id)}
                    onMouseLeave={() => setFoco(null)}
                    className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)_3.5rem] items-center gap-2 rounded-md px-1 py-1 text-left text-sm transition hover:bg-slate-50"
                  >
                    <span className="text-right text-xs tabular-nums text-slate-400">{k + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-slate-800">{b.nome}</span>
                      <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${(v / maximo) * 100}%` }} />
                      </span>
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{formata(v)}</span>
                  </button>
                </li>
              ))}
            </ol>
            {metrica !== "populacao" && (
              <div className="mt-5 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                <div className="text-sm font-semibold text-amber-900">
                  {nuncaCitados.length} bairros sem nenhum documento
                </div>
                <p className="mt-0.5 text-xs text-amber-900/80">
                  {Math.round(nuncaCitados.reduce((a, b) => a + (b.populacao ?? 0), 0) / 1000).toLocaleString("pt-BR")} mil moradores
                  {mes < meses.length - 1 ? ` até ${rotuloMes(ateMes)}` : ""}
                  {autor ? ", para este autor" : ""}.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {nuncaCitados
                    .slice()
                    .sort((a, b) => (b.populacao ?? 0) - (a.populacao ?? 0))
                    .map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelecionado(b.id)}
                        onMouseEnter={() => setFoco(b.id)}
                        onMouseLeave={() => setFoco(null)}
                        className="rounded-full bg-white px-2 py-0.5 text-[11px] text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100"
                      >
                        {b.nome}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
