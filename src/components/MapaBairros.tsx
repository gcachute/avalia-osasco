"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BairroMapa, ItemMapa, Mapa, PontoMapa } from "@/lib/dados";
import { INDICADORES, TEMAS, formatar, type Contexto, type Tema } from "./mapa/indicadores";
import { PainelBairro } from "./mapa/PainelBairro";

export type BairroDesenho = BairroMapa & { d: string; cx: number; cy: number; distancia: number };
export type PontoDesenho = PontoMapa & { x: number; y: number };

type Origem = "todos" | "camara" | "prefeitura";
type Camada = PontoMapa["tipo"];

const ORIGENS: { chave: Origem; nome: string }[] = [
  { chave: "todos", nome: "Câmara e Prefeitura" },
  { chave: "camara", nome: "Só Câmara" },
  { chave: "prefeitura", nome: "Só Prefeitura" },
];
const CAMADAS: { chave: Camada; nome: string }[] = [
  { chave: "saude", nome: "Saúde SUS" },
  { chave: "escola", nome: "Escolas" },
  { chave: "votacao", nome: "Locais de votação" },
];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const FAIXAS = 6;
const corDaFaixa = (f: number | null) => (f == null ? "url(#mapa-sem-dado)" : f === 0 ? "var(--mapa-vazio)" : `var(--mapa-${f})`);
const corOrigem = (o: ItemMapa["origem"]) => (o === "camara" ? "var(--mapa-camara)" : "var(--mapa-prefeitura)");
const dataCurta = (iso: string) => iso.split("-").reverse().join("/");

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

// Marcadores dos pontos: uma forma para cada camada (a cor fica para os bairros e as ondas).
function Marcador({ p, ativo }: { p: Pick<PontoDesenho, "tipo" | "x" | "y">; ativo: boolean }) {
  const r = ativo ? 6 : 4.2;
  if (p.tipo === "saude")
    return (
      <g transform={`translate(${p.x} ${p.y})`}>
        <circle r={r + 1.5} fill="var(--mapa-ponto)" stroke="var(--mapa-borda)" strokeWidth={1.2} />
        <path d={`M${-r * 0.55} 0H${r * 0.55}M0 ${-r * 0.55}V${r * 0.55}`} stroke="var(--mapa-borda)" strokeWidth={1.6} strokeLinecap="round" />
      </g>
    );
  if (p.tipo === "escola")
    return <rect x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} rx={1.5} fill="var(--mapa-ponto)" stroke="var(--mapa-borda)" strokeWidth={1.2} />;
  return (
    <rect
      x={p.x - r * 0.8}
      y={p.y - r * 0.8}
      width={r * 1.6}
      height={r * 1.6}
      transform={`rotate(45 ${p.x} ${p.y})`}
      fill="var(--mapa-ponto)"
      stroke="var(--mapa-borda)"
      strokeWidth={1.2}
    />
  );
}

export function MapaBairros({
  bairros,
  itens,
  pontos,
  largura,
  altura,
  inicio,
  fim,
  cidade,
  votosVereador,
  vereadores,
}: {
  bairros: BairroDesenho[];
  itens: ItemMapa[];
  pontos: PontoDesenho[];
  largura: number;
  altura: number;
  inicio: string;
  fim: string;
  cidade: Mapa["cidade"];
  votosVereador: Mapa["votosVereador"];
  vereadores: { id: string; nome: string }[];
}) {
  const meses = useMemo(() => mesesEntre(inicio, fim), [inicio, fim]);
  const [tema, setTema] = useState<Tema>("politica");
  const [chave, setChave] = useState("citacoes");
  const [origem, setOrigem] = useState<Origem>("todos");
  const [autor, setAutor] = useState("");
  const [camadas, setCamadas] = useState<Set<Camada>>(new Set());
  const [mes, setMes] = useState(meses.length - 1);
  const [tocando, setTocando] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);
  const [pontoFoco, setPontoFoco] = useState<PontoDesenho | null>(null);
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

  const indicador = INDICADORES.find((i) => i.chave === chave)!;
  const nomeVereador = useMemo(() => new Map(vereadores.map((v) => [v.id, v.nome])), [vereadores]);
  const idsVereadores = useMemo(() => new Set(vereadores.map((v) => v.id)), [vereadores]);
  const comVotos = useMemo(
    () => vereadores.filter((v) => votosVereador[v.id]).sort((a, b) => votosVereador[b.id].total - votosVereador[a.id].total),
    [vereadores, votosVereador],
  );
  // "Votos do vereador" precisa de um vereador: sem escolha, usa o mais votado.
  const autorAtivo = chave === "votosVereador" ? (votosVereador[autor] ? autor : (comVotos[0]?.id ?? "")) : autor;

  const autores = useMemo(() => {
    const m = new Map<string, { id: string; nome: string; n: number; origem: ItemMapa["origem"] }>();
    for (const i of itens) {
      const a = m.get(i.autor) ?? { id: i.autor, nome: i.autorNome ?? i.autor, n: 0, origem: i.origem };
      a.n++;
      m.set(i.autor, a);
    }
    return [...m.values()].sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome));
  }, [itens]);

  const filtrados = useMemo(
    () => itens.filter((i) => (origem === "todos" || i.origem === origem) && (!autorAtivo || i.autor === autorAtivo)),
    [itens, origem, autorAtivo],
  );
  const ateMes = meses[mes];
  const visiveis = useMemo(() => filtrados.filter((i) => i.data.slice(0, 7) <= ateMes), [filtrados, ateMes]);
  const doMes = useMemo(() => filtrados.filter((i) => i.data.startsWith(ateMes)), [filtrados, ateMes]);

  const contar = (lista: ItemMapa[]) => {
    const c: Contexto["contagem"] = {};
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
  const votos = autorAtivo ? (votosVereador[autorAtivo] ?? null) : null;
  const ctx: Contexto = { contagem, votos };
  const ctxFinal: Contexto = { contagem: contagemFinal, votos };

  // Escala fixa durante o play (calculada com o período inteiro).
  const valoresFinais = bairros.map((b) => indicador.valor(b, ctxFinal)).filter((v): v is number => v != null && Number.isFinite(v));
  const minimo = indicador.escala === "faixa" && valoresFinais.length ? Math.min(...valoresFinais) : 0;
  const maximo = Math.max(minimo + 1e-9, ...valoresFinais);
  // Porcentagens altas (esgoto, asfalto...) concentram quase todos os bairros perto de 100%: para mostrar a
  // diferença entre eles, as faixas de cor são quantis (cada cor tem mais ou menos o mesmo número de bairros).
  const ordenados = valoresFinais.slice().sort((a, b) => a - b);
  const cortes = Array.from({ length: FAIXAS - 1 }, (_, i) => ordenados[Math.floor(((i + 1) / FAIXAS) * (ordenados.length - 1))]);
  const faixa = (v: number | null) => {
    if (v == null || !Number.isFinite(v)) return null;
    if (indicador.escala === "zero") return v <= 0 ? 0 : Math.min(FAIXAS, Math.ceil((v / maximo) * FAIXAS));
    return 1 + cortes.filter((c) => v > c).length;
  };
  const valor = (b: BairroDesenho) => indicador.valor(b, ctx);

  const porId = useMemo(() => new Map(bairros.map((b) => [b.id, b])), [bairros]);
  const porMes = useMemo(() => meses.map((m) => filtrados.filter((i) => i.data.startsWith(m)).length), [meses, filtrados]);
  const maxMes = Math.max(1, ...porMes);
  const ranking = bairros
    .map((b) => ({ b, v: valor(b) }))
    .filter((x): x is { b: BairroDesenho; v: number } => x.v != null && Number.isFinite(x.v) && (indicador.escala === "faixa" || x.v > 0))
    .sort((a, z) => z.v - a.v);
  const nuncaCitados = bairros.filter((b) => contagem[b.id].total === 0);
  // Rótulos dos bairros de maior valor, pulando os que encostariam num rótulo já posto.
  const rotulados = new Set<string>();
  for (const { b } of ranking) {
    if (rotulados.size >= 5) break;
    const perto = [...rotulados].some((id) => {
      const o = porId.get(id)!;
      return Math.abs(o.cx - b.cx) < 70 && Math.abs(o.cy - b.cy) < 16;
    });
    if (!perto) rotulados.add(b.id);
  }
  const sel = selecionado ? porId.get(selecionado) : null;
  const realce = foco ?? selecionado;
  const bFoco = foco ? porId.get(foco) : null;
  const maxDist = Math.max(1, ...bairros.map((b) => b.distancia));
  const feed = (doMes.length ? doMes : visiveis.slice(-6)).slice().reverse().slice(0, 6);
  const mediaCidade = cidade && indicador.cidade ? (indicador.cidade(cidade) ?? null) : null;
  const pontosVisiveis = pontos.filter((p) => camadas.has(p.tipo));
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - minimo) / (maximo - minimo || 1)) * 100));

  const escolherTema = (t: Tema) => {
    setTema(t);
    setChave(INDICADORES.find((i) => i.tema === t)!.chave);
  };
  const escolherIndicador = (k: string) => {
    setTema(INDICADORES.find((i) => i.chave === k)!.tema);
    setChave(k);
  };
  const alternarCamada = (c: Camada) =>
    setCamadas((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  const tocar = () => {
    if (tocando) return setTocando(false);
    if (mes >= meses.length - 1) setMes(0);
    setTocando(true);
  };
  const abaInicial = tema === "eleicao" ? "eleicao" : tema === "servicos" ? "servicos" : tema === "politica" ? "politica" : "perfil";
  const opcoesAutor =
    chave === "votosVereador"
      ? comVotos.map((v) => ({ id: v.id, rotulo: `${v.nome} (${votosVereador[v.id].total.toLocaleString("pt-BR")} votos)` }))
      : autores.filter((a) => origem === "todos" || a.origem === origem).map((a) => ({ id: a.id, rotulo: `${a.nome} (${a.n})` }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        {/* Tema, indicador e filtros: tudo acima do mapa */}
        <div className="space-y-2 border-b border-slate-100 p-3">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Tema">
            {TEMAS.map((t) => (
              <button
                key={t.chave}
                role="tab"
                aria-selected={tema === t.chave}
                onClick={() => escolherTema(t.chave)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${tema === t.chave ? "bg-blue-800 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"}`}
              >
                {t.nome}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Indicador">
            {INDICADORES.filter((i) => i.tema === tema).map((i) => (
              <button
                key={i.chave}
                title={i.dica}
                onClick={() => setChave(i.chave)}
                aria-pressed={chave === i.chave}
                className={`rounded-md px-2.5 py-1 text-xs transition ${chave === i.chave ? "bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                {i.nome}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Origem dos documentos">
              {ORIGENS.map((o) => (
                <button
                  key={o.chave}
                  onClick={() => setOrigem(o.chave)}
                  aria-pressed={origem === o.chave}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition ${origem === o.chave ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {o.chave !== "todos" && <span className="h-2 w-2 rounded-full" style={{ background: corOrigem(o.chave) }} />}
                  {o.nome}
                </button>
              ))}
            </div>
            <select
              value={autorAtivo}
              onChange={(e) => setAutor(e.target.value)}
              aria-label={chave === "votosVereador" ? "Vereador" : "Filtrar por autor"}
              className="min-w-0 max-w-full flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 sm:flex-none"
            >
              {chave !== "votosVereador" && <option value="">Todos os autores</option>}
              {opcoesAutor.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-3 md:flex-row md:items-start">
          <div
            ref={caixa}
            className="relative w-full md:w-auto md:shrink-0"
            onMouseLeave={() => {
              setFoco(null);
              setPontoFoco(null);
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
              <defs>
                <pattern id="mapa-sem-dado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="var(--mapa-vazio)" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="var(--mapa-hachura)" strokeWidth="2" />
                </pattern>
              </defs>
              <g>
                {bairros.map((b) => {
                  const ativo = realce === b.id;
                  return (
                    <path
                      key={b.id}
                      d={b.d}
                      className="mapa-bairro cursor-pointer"
                      style={{ ["--atraso" as string]: `${(b.distancia / maxDist) * 0.7}s`, fill: corDaFaixa(faixa(valor(b))), opacity: realce && !ativo ? 0.55 : 1 }}
                      stroke="var(--mapa-borda)"
                      strokeWidth={1.2}
                      strokeLinejoin="round"
                      tabIndex={0}
                      role="button"
                      aria-label={`${b.nome}: ${formatar(valor(b), indicador.formato)}`}
                      onMouseEnter={() => setFoco(b.id)}
                      onFocus={() => setFoco(b.id)}
                      onBlur={() => setFoco(null)}
                      onClick={() => setSelecionado(selecionado === b.id ? null : b.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelecionado(selecionado === b.id ? null : b.id))}
                    />
                  );
                })}
              </g>
              {realce && porId.get(realce) && (
                <path d={porId.get(realce)!.d} fill="none" stroke="var(--mapa-destaque)" strokeWidth={2.5} strokeLinejoin="round" pointerEvents="none" />
              )}
              {/* Pontos das camadas ligadas */}
              <g>
                {pontosVisiveis.map((p, k) => (
                  <g
                    key={`${p.tipo}-${p.nome}-${k}`}
                    className="mapa-ponto cursor-help"
                    style={{ animationDelay: `${(k % 40) * 0.015}s` }}
                    onMouseEnter={() => setPontoFoco(p)}
                    onMouseLeave={() => setPontoFoco(null)}
                  >
                    <Marcador p={p} ativo={pontoFoco === p} />
                  </g>
                ))}
              </g>
              {/* Ondas: documentos do mês saindo do centro do bairro, na cor da origem */}
              <g key={`ondas-${mes}-${origem}-${autorAtivo}`}>
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
              {bairros
                .filter((b) => rotulados.has(b.id) || b.id === realce)
                .map((b) => (
                  <text key={`t-${b.id}`} x={b.cx} y={b.cy - 10} textAnchor="middle" className="mapa-rotulo" fontSize={b.id === realce ? 15 : 12} fontWeight={600}>
                    {b.nome}
                  </text>
                ))}
            </svg>

            {dica && (pontoFoco || bFoco) && (
              <div
                className="pointer-events-none absolute z-10 w-60 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
                style={{ left: Math.max(4, Math.min(dica.x + 14, (caixa.current?.clientWidth ?? 600) - 244)), top: dica.y + 14 }}
              >
                {pontoFoco ? (
                  <>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{pontoFoco.categoria}</div>
                    <div className="text-sm font-semibold text-slate-900">{pontoFoco.nome}</div>
                    {pontoFoco.eleitores != null && <div className="mt-0.5 text-slate-600">{pontoFoco.eleitores.toLocaleString("pt-BR")} eleitores</div>}
                    {pontoFoco.bairro && <div className="mt-0.5 text-slate-500">{porId.get(pontoFoco.bairro)?.nome}</div>}
                  </>
                ) : (
                  bFoco && (
                    <>
                      <div className="text-sm font-semibold text-slate-900">{bFoco.nome}</div>
                      <div className="mt-1 flex items-baseline justify-between gap-3">
                        <span className="text-slate-600">{indicador.nome}</span>
                        <span className="text-base font-semibold tabular-nums text-slate-900">{formatar(valor(bFoco), indicador.formato)}</span>
                      </div>
                      {mediaCidade != null && <div className="text-right text-[11px] text-slate-500">Osasco: {formatar(mediaCidade, indicador.formato)}</div>}
                      {chave === "votosVereador" && votos && (
                        <div className="text-right text-[11px] text-slate-500">
                          {formatar(((votos.porBairro[bFoco.id] ?? 0) / votos.total) * 100, "pct")} dos votos de {nomeVereador.get(autorAtivo)}
                        </div>
                      )}
                      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-t border-slate-100 pt-1.5 text-slate-600">
                        <span>Moradores</span>
                        <span className="text-right tabular-nums text-slate-900">{(bFoco.censo?.pessoas ?? bFoco.populacao ?? 0).toLocaleString("pt-BR")}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: "var(--mapa-camara)" }} />
                          Documentos da Câmara
                        </span>
                        <span className="text-right tabular-nums text-slate-900">{contagem[bFoco.id].camara}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: "var(--mapa-prefeitura)" }} />
                          Da Prefeitura
                        </span>
                        <span className="text-right tabular-nums text-slate-900">{contagem[bFoco.id].prefeitura}</span>
                      </div>
                      <div className="mt-1.5 text-[11px] text-slate-400">Clique para ver o bairro completo</div>
                    </>
                  )
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">{indicador.nome}</div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                {tema === "politica" ? (
                  <>
                    <span className="text-5xl font-bold tabular-nums tracking-tight text-slate-900">{visiveis.length}</span>
                    <span className="text-sm text-slate-500">documentos {mes < meses.length - 1 || tocando ? `até ${rotuloMes(ateMes)}` : "na legislatura"}</span>
                  </>
                ) : chave === "votosVereador" && votos ? (
                  <>
                    <span className="text-5xl font-bold tabular-nums tracking-tight text-slate-900">{votos.total.toLocaleString("pt-BR")}</span>
                    <span className="text-sm text-slate-500">votos de {nomeVereador.get(autorAtivo)} em 2024</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-900">
                      {formatar(mediaCidade ?? ranking[0]?.v ?? null, indicador.formato)}
                    </span>
                    <span className="text-sm text-slate-500">{mediaCidade != null ? "em Osasco" : `em ${ranking[0]?.b.nome ?? "—"}, o maior`}</span>
                  </>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{indicador.dica}.</p>
            </div>

            {/* Legenda */}
            <div className="rounded-xl border border-slate-200 p-2.5 text-[11px] text-slate-600">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="tabular-nums">{formatar(minimo, indicador.formato)}</span>
                <div className="flex overflow-hidden rounded">
                  {Array.from({ length: FAIXAS + (indicador.escala === "zero" ? 1 : 0) }, (_, f) => (
                    <span key={f} className="h-2.5 w-4 sm:w-5" style={{ background: corDaFaixa(indicador.escala === "zero" ? f : f + 1) }} />
                  ))}
                </div>
                <span className="tabular-nums">{formatar(maximo, indicador.formato)}</span>
                <span className="ml-1 inline-flex items-center gap-1">
                  <span className="h-2.5 w-3.5 rounded-sm" style={{ background: "repeating-linear-gradient(45deg, var(--mapa-vazio) 0 2px, var(--mapa-hachura) 2px 4px)" }} />
                  sem dado
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--mapa-camara)" }} />
                  Documento da Câmara
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--mapa-prefeitura)" }} />
                  Da Prefeitura
                </span>
              </div>
            </div>

            {/* Camadas de pontos */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Camadas de pontos">
              {CAMADAS.map((c) => {
                const n = pontos.filter((p) => p.tipo === c.chave).length;
                const on = camadas.has(c.chave);
                return (
                  <button
                    key={c.chave}
                    onClick={() => alternarCamada(c.chave)}
                    aria-pressed={on}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition ${on ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
                  >
                    <svg width="12" height="12" viewBox="-7 -7 14 14" aria-hidden>
                      <Marcador p={{ tipo: c.chave, x: 0, y: 0 }} ativo={false} />
                    </svg>
                    {c.nome} ({n})
                  </button>
                );
              })}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{doMes.length ? `Documentos em ${rotuloMes(ateMes)}` : "Documentos mais recentes"}</div>
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
                {!feed.length && <li className="text-xs text-slate-500">Nenhum documento com estes filtros.</li>}
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
                  Até <b className="text-sm text-slate-900">{rotuloMes(ateMes)}</b> · {visiveis.length} documentos
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

      {/* Painel lateral: ranking do indicador ou bairro selecionado */}
      <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 lg:max-h-[60rem] lg:overflow-y-auto">
        {sel ? (
          <PainelBairro
            key={sel.id}
            bairro={sel}
            itens={visiveis.filter((i) => i.bairros.includes(sel.id)).slice().reverse()}
            cidade={cidade}
            vereadores={idsVereadores}
            abaInicial={abaInicial}
            aoEscolherIndicador={escolherIndicador}
            aoFechar={() => setSelecionado(null)}
            mesTexto={mes < meses.length - 1 ? rotuloMes(ateMes) : null}
          />
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{indicador.nome}: ranking dos bairros</h2>
            <p className="text-xs text-slate-500">
              {mediaCidade != null ? `A marca escura é a média de Osasco (${formatar(mediaCidade, indicador.formato)}). ` : ""}Clique em um bairro para ver tudo sobre
              ele.
            </p>
            <ol className="mt-3 space-y-1.5">
              {ranking.slice(0, 15).map(({ b, v }, k) => (
                <li key={b.id}>
                  <button
                    onClick={() => setSelecionado(b.id)}
                    onMouseEnter={() => setFoco(b.id)}
                    onMouseLeave={() => setFoco(null)}
                    className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)_4.75rem] items-center gap-2 rounded-md px-1 py-1 text-left text-sm transition hover:bg-slate-50"
                  >
                    <span className="text-right text-xs tabular-nums text-slate-400">{k + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-slate-800">{b.nome}</span>
                      <span className="relative mt-0.5 block h-1.5 rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.max(3, pos(v))}%` }} />
                        {mediaCidade != null && <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-slate-900" style={{ left: `${pos(mediaCidade)}%` }} />}
                      </span>
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{formatar(v, indicador.formato)}</span>
                  </button>
                </li>
              ))}
            </ol>
            {ranking.length > 15 && (
              <details className="mt-2 text-xs text-slate-600">
                <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-800">Ver os outros {ranking.length - 15} bairros</summary>
                <ol className="mt-2 space-y-1">
                  {ranking.slice(15).map(({ b, v }, k) => (
                    <li key={b.id} className="flex justify-between gap-2">
                      <button onClick={() => setSelecionado(b.id)} className="truncate text-left hover:underline">
                        {k + 16}. {b.nome}
                      </button>
                      <span className="tabular-nums text-slate-900">{formatar(v, indicador.formato)}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {!ranking.length && <p className="mt-3 text-sm text-slate-500">Nenhum bairro com valor para este indicador e filtros.</p>}
            {tema === "politica" && (
              <div className="mt-5 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                <div className="text-sm font-semibold text-amber-900">{nuncaCitados.length} bairros sem nenhum documento</div>
                <p className="mt-0.5 text-xs text-amber-900/80">
                  {Math.round(nuncaCitados.reduce((a, b) => a + (b.censo?.pessoas ?? b.populacao ?? 0), 0) / 1000).toLocaleString("pt-BR")} mil moradores
                  {mes < meses.length - 1 ? ` até ${rotuloMes(ateMes)}` : ""}
                  {autorAtivo ? `, para ${nomeVereador.get(autorAtivo) ?? "este autor"}` : ""}.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {nuncaCitados
                    .slice()
                    .sort((a, b) => (b.censo?.pessoas ?? 0) - (a.censo?.pessoas ?? 0))
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
