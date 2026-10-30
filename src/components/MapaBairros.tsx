"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { BairroMapa, Historico, ItemMapa, Mapa, PontoMapa } from "@/lib/dados";
import {
  INDICADORES,
  TEMAS,
  cidadeNoPeriodo,
  formatar,
  formatoNoPeriodo,
  periodosDe,
  rotuloPeriodo,
  valorNoPeriodo,
  type Contexto,
  type Tema,
} from "./mapa/indicadores";
import { PainelBairro } from "./mapa/PainelBairro";
import { Ruas, type Projecao, type Vista } from "./mapa/Ruas";

export type BairroDesenho = BairroMapa & {
  d: string;
  cx: number;
  cy: number;
  distancia: number;
};
export type PontoDesenho = PontoMapa & { x: number; y: number };
export type FavelaDesenho = {
  codigo: string;
  nome: string;
  moradores: number;
  d: string;
};

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
    if (m === 12) {
      a += 1;
      m = 1;
    } else m += 1;
  }
  return out;
}

// Marcadores dos pontos: uma forma para cada camada (a cor fica para os bairros e as ondas). Desenhados em
// volta da origem; no mapa, ficam dentro de um grupo que desfaz o zoom (.mapa-escala) para manter o tamanho.
function Marcador({ tipo, ativo }: { tipo: Camada; ativo: boolean }) {
  const r = ativo ? 6 : 4.2;
  if (tipo === "saude")
    return (
      <g>
        <circle r={r + 1.5} fill="var(--mapa-ponto)" stroke="var(--mapa-borda)" strokeWidth={1.2} />
        <path d={`M${-r * 0.55} 0H${r * 0.55}M0 ${-r * 0.55}V${r * 0.55}`} stroke="var(--mapa-borda)" strokeWidth={1.6} strokeLinecap="round" />
      </g>
    );
  if (tipo === "escola")
    return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={1.5} fill="var(--mapa-ponto)" stroke="var(--mapa-borda)" strokeWidth={1.2} />;
  return (
    <rect
      x={-r * 0.8}
      y={-r * 0.8}
      width={r * 1.6}
      height={r * 1.6}
      transform="rotate(45)"
      fill="var(--mapa-ponto)"
      stroke="var(--mapa-borda)"
      strokeWidth={1.2}
    />
  );
}

// Espaço livre embaixo do mapa para a linha do tempo, que fica por cima.
const FOLGA_BAIXO = 56;
const ZOOM_MAXIMO = 20;

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
  favelas,
  anoSeguranca,
  historico,
  projecao,
  autor: autorControlado,
  aoMudarAutor,
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
  favelas: FavelaDesenho[];
  anoSeguranca: number | null;
  // Séries históricas (Censo 2010 e eleições anteriores): permitem escolher o ano no mapa.
  historico?: Historico | null;
  // Escala e translação da projeção dos bairros; sem ela, o mapa fica sem a camada de ruas.
  projecao?: Projecao;
  // Opcional: o autor filtrado pode ser comandado de fora (a lista de vereadores da página inicial).
  autor?: string;
  aoMudarAutor?: (id: string) => void;
}) {
  const meses = useMemo(() => mesesEntre(inicio, fim), [inicio, fim]);
  const [tema, setTema] = useState<Tema>("politica");
  const [chave, setChave] = useState("citacoes");
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [origem, setOrigem] = useState<Origem>("todos");
  const [autorInterno, setAutorInterno] = useState("");
  const autor = autorControlado ?? autorInterno;
  const setAutor = aoMudarAutor ?? setAutorInterno;
  const [camadas, setCamadas] = useState<Set<Camada>>(new Set());
  const [mes, setMes] = useState(meses.length - 1);
  const [tocando, setTocando] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);
  const [pontoFoco, setPontoFoco] = useState<PontoDesenho | null>(null);
  const [verFavelas, setVerFavelas] = useState(false);
  const [favelaFoco, setFavelaFoco] = useState<FavelaDesenho | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [dica, setDica] = useState<{ x: number; y: number } | null>(null);
  const [entrou, setEntrou] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // ---- Zoom, arrastar e camada de ruas ----
  // A área visível é um pouco mais larga que Osasco (para mostrar as ruas em volta) e tem folga embaixo.
  const larguraVista = Math.max(largura, Math.round(altura * 0.82));
  const vb = useMemo(
    () => ({
      x: -(larguraVista - largura) / 2,
      y: 0,
      w: larguraVista,
      h: altura + FOLGA_BAIXO,
    }),
    [larguraVista, largura, altura],
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const grupoRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const ouvintes = useRef(new Set<(v: Vista) => void>());
  const [vista, setVista] = useState<Vista>({ k: 1, x: 0, y: 0 });
  const [ruas, setRuas] = useState(false);
  const [pxPorUnidade, setPxPorUnidade] = useState(0);
  // Dica que aparece por cima do mapa: rolar sem Ctrl (computador) ou arrastar com um dedo (celular).
  const [avisoRolagem, setAvisoRolagem] = useState<null | "rolagem" | "toque">(null);
  const inscrever = useCallback((f: (v: Vista) => void) => {
    ouvintes.current.add(f);
    return () => void ouvintes.current.delete(f);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const medir = () => setPxPorUnidade(svg.getBoundingClientRect().width / vb.w);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(svg);

    // Rolagem só aproxima com Ctrl (ou ⌘, ou o gesto de pinça do trackpad): sem isso, a página rola normalmente.
    // No celular, um dedo rola a página e dois dedos movem e aproximam o mapa (como nos mapas de aplicativo).
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, ZOOM_MAXIMO])
      .translateExtent([
        [vb.x - vb.w * 0.6, -vb.h * 0.4],
        [vb.x + vb.w * 1.6, vb.h * 1.4],
      ])
      .clickDistance(5)
      .filter((e) => (e.type === "wheel" ? e.ctrlKey || e.metaKey : e.type.startsWith("touch") ? e.touches.length >= 2 : !e.button))
      .wheelDelta((e) => -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) * (Math.abs(e.deltaY) >= 50 ? 1.5 : 10))
      .on("zoom", (e) => {
        const t = e.transform;
        grupoRef.current?.setAttribute("transform", `translate(${t.x} ${t.y}) scale(${t.k})`);
        svg.style.setProperty("--k", String(t.k));
        const v = { k: t.k, x: t.x, y: t.y };
        ouvintes.current.forEach((f) => f(v));
      })
      .on("end", (e) => setVista({ k: e.transform.k, x: e.transform.x, y: e.transform.y }));
    const sel = select(svg);
    sel.call(z).on("dblclick.zoom", null);
    zoomRef.current = z;

    let espera = 0;
    const avisar = (tipo: "rolagem" | "toque") => {
      setAvisoRolagem(tipo);
      clearTimeout(espera);
      espera = window.setTimeout(() => setAvisoRolagem(null), 1600);
    };
    const rolagem = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) avisar("rolagem");
    };
    // Um dedo arrastando de lado no mapa: a pessoa quer mover o mapa, então mostra como.
    let inicio: { x: number; y: number } | null = null;
    const tocou = (e: TouchEvent) => (inicio = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null);
    const arrastou = (e: TouchEvent) => {
      if (!inicio || e.touches.length !== 1) return;
      const dx = Math.abs(e.touches[0].clientX - inicio.x);
      const dy = Math.abs(e.touches[0].clientY - inicio.y);
      if (dx > 24 && dx > dy * 1.5) {
        avisar("toque");
        inicio = null;
      }
    };
    svg.addEventListener("wheel", rolagem, { passive: true });
    svg.addEventListener("touchstart", tocou, { passive: true });
    svg.addEventListener("touchmove", arrastou, { passive: true });
    return () => {
      obs.disconnect();
      sel.on(".zoom", null);
      svg.removeEventListener("wheel", rolagem);
      svg.removeEventListener("touchstart", tocou);
      svg.removeEventListener("touchmove", arrastou);
      clearTimeout(espera);
    };
  }, [vb]);

  const semMovimento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const irPara = useCallback(
    (alvo: { x: number; y: number; w: number; h: number } | null) => {
      const svg = svgRef.current;
      const z = zoomRef.current;
      if (!svg || !z) return;
      let t = zoomIdentity;
      if (alvo) {
        const k = Math.min(10, Math.max(1.5, 0.55 / Math.max(alvo.w / vb.w, alvo.h / vb.h)));
        t = zoomIdentity.translate(vb.x + vb.w / 2 - k * (alvo.x + alvo.w / 2), (vb.h - FOLGA_BAIXO) / 2 - k * (alvo.y + alvo.h / 2)).scale(k);
      }
      select(svg)
        .transition()
        .duration(semMovimento() ? 0 : 750)
        .call(z.transform, t);
    },
    [vb],
  );
  const aproximar = (fator: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z)
      select(svg)
        .transition()
        .duration(semMovimento() ? 0 : 300)
        .call(z.scaleBy, fator);
  };

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
    for (const i of itens)
      (i.autores ?? [i.autor]).forEach((id, k) => {
        const a = m.get(id) ?? {
          id,
          nome: (i.autoresNomes?.[k] ?? i.autorNome) || id,
          n: 0,
          origem: i.origem,
        };
        a.n++;
        m.set(id, a);
      });
    return [...m.values()].sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome));
  }, [itens]);

  const filtrados = useMemo(
    () => itens.filter((i) => (origem === "todos" || i.origem === origem) && (!autorAtivo || (i.autores ?? [i.autor]).includes(autorAtivo))),
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
  // Ano escolhido (null = o mais recente, que é o valor padrão do indicador).
  const periodos = periodosDe(indicador, historico);
  const periodoAtivo = periodo && periodos?.includes(periodo) && periodo !== periodos.filter((x) => x !== "mudanca").at(-1) ? periodo : null;
  const formato = periodoAtivo ? formatoNoPeriodo(indicador, periodoAtivo) : indicador.formato;
  const escala = periodoAtivo === "mudanca" ? "faixa" : indicador.escala;
  const valorEm = (b: BairroDesenho, c: Contexto) => (periodoAtivo ? valorNoPeriodo(indicador, b, periodoAtivo, historico) : indicador.valor(b, c));
  const valoresFinais = bairros.map((b) => valorEm(b, ctxFinal)).filter((v): v is number => v != null && Number.isFinite(v));
  const minimo = escala === "faixa" && valoresFinais.length ? Math.min(...valoresFinais) : 0;
  const maximo = Math.max(minimo + 1e-9, ...valoresFinais);
  // Porcentagens altas (esgoto, asfalto...) concentram quase todos os bairros perto de 100%: para mostrar a
  // diferença entre eles, as faixas de cor são quantis (cada cor tem mais ou menos o mesmo número de bairros).
  const ordenados = valoresFinais.slice().sort((a, b) => a - b);
  const cortes = Array.from({ length: FAIXAS - 1 }, (_, i) => ordenados[Math.floor(((i + 1) / FAIXAS) * (ordenados.length - 1))]);
  const faixa = (v: number | null) => {
    if (v == null || !Number.isFinite(v)) return null;
    if (escala === "zero") return v <= 0 ? 0 : Math.min(FAIXAS, Math.ceil((v / maximo) * FAIXAS));
    return 1 + cortes.filter((c) => v > c).length;
  };
  const valor = (b: BairroDesenho) => valorEm(b, ctx);

  const porId = useMemo(() => new Map(bairros.map((b) => [b.id, b])), [bairros]);
  const porMes = useMemo(() => meses.map((m) => filtrados.filter((i) => i.data.startsWith(m)).length), [meses, filtrados]);
  const maxMes = Math.max(1, ...porMes);
  const ranking = bairros
    .map((b) => ({ b, v: valor(b) }))
    .filter((x): x is { b: BairroDesenho; v: number } => x.v != null && Number.isFinite(x.v) && (escala === "faixa" || x.v > 0))
    .sort((a, z) => z.v - a.v);
  const nuncaCitados = bairros.filter((b) => contagem[b.id].total === 0);
  // Rótulos dos bairros de maior valor, pulando os que encostariam num rótulo já posto. Com zoom, cabem mais.
  const rotulados = new Set<string>();
  const limiteRotulos = vista.k < 1.8 ? 5 : vista.k < 3.5 ? 18 : bairros.length;
  const candidatos = vista.k < 1.8 ? ranking.map((r) => r.b) : [...ranking.map((r) => r.b), ...bairros];
  for (const b of candidatos) {
    if (rotulados.size >= limiteRotulos) break;
    if (rotulados.has(b.id)) continue;
    const perto = [...rotulados].some((id) => {
      const o = porId.get(id)!;
      return Math.abs(o.cx - b.cx) < 70 / vista.k && Math.abs(o.cy - b.cy) < 16 / vista.k;
    });
    if (!perto) rotulados.add(b.id);
  }
  const sel = selecionado ? porId.get(selecionado) : null;
  // Esc fecha o bairro aberto (no celular ele cobre parte da tela).
  useEffect(() => {
    if (!selecionado) return;
    // No celular o painel do bairro sobe e cobre a parte de baixo da tela: rola a página para o mapa (com o
    // bairro no centro dele) ficar na faixa que sobra em cima.
    const svg = svgRef.current;
    if (svg && !window.matchMedia("(min-width: 64rem)").matches) {
      const r = svg.getBoundingClientRect();
      const topoLivre = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      const alvo = topoLivre + (window.innerHeight * 0.42 - topoLivre) / 2;
      window.scrollBy({ top: r.top + r.height / 2 - alvo, behavior: semMovimento() ? "auto" : "smooth" });
    }
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setSelecionado(null);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [selecionado]);
  const realce = foco ?? selecionado;
  // Outros bairros citados pelo item aberto no painel (aba Verbas): ficam com contorno tracejado.
  const [citados, setCitados] = useState<string[]>([]);
  // Ao escolher um bairro a partir de um documento, os outros bairros do documento continuam marcados.
  const citadosAoEscolher = useRef<string[] | null>(null);
  useEffect(() => {
    setCitados(citadosAoEscolher.current ?? []);
    citadosAoEscolher.current = null;
  }, [selecionado]);
  const nomesBairros = useMemo(() => new Map(bairros.map((b) => [b.id, b.nome])), [bairros]);
  const marcarBairros = useCallback((ids: string[] | null) => setCitados(ids ?? []), []);
  const bFoco = foco ? porId.get(foco) : null;
  const maxDist = Math.max(1, ...bairros.map((b) => b.distancia));
  const feed = (doMes.length ? doMes : visiveis.slice(-6)).slice().reverse().slice(0, 6);
  const mediaCidade = periodoAtivo ? cidadeNoPeriodo(indicador, periodoAtivo, historico) : cidade && indicador.cidade ? (indicador.cidade(cidade) ?? null) : null;
  const pontosVisiveis = pontos.filter((p) => camadas.has(p.tipo));
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - minimo) / (maximo - minimo || 1)) * 100));

  // Linha do tempo e documentos só existem no tema Política: nos outros, o mapa volta para o período inteiro.
  const politica = tema === "politica";
  useEffect(() => {
    if (politica) return;
    setTocando(false);
    setMes(meses.length - 1);
  }, [politica, meses.length]);
  // Selecionar um bairro (no mapa, no ranking ou num documento) leva o zoom até ele; desmarcar volta para a cidade.
  useEffect(() => {
    const el = selecionado ? svgRef.current?.querySelector<SVGPathElement>(`[data-bairro="${selecionado}"]`) : null;
    const b = el?.getBBox();
    irPara(b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null);
  }, [selecionado, irPara]);

  const escolherTema = (t: Tema) => {
    setTema(t);
    setChave(INDICADORES.find((i) => i.tema === t)!.chave);
  };
  const escolherIndicador = (k: string, p?: string) => {
    setTema(INDICADORES.find((i) => i.chave === k)!.tema);
    setChave(k);
    setPeriodo(p ?? null);
  };
  // Links das páginas de vereador e prefeito abrem o mapa já filtrado: ?indicador=, ?autor=, ?origem=, ?bairro=.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ind = q.get("indicador");
    if (ind && INDICADORES.some((i) => i.chave === ind)) {
      setTema(INDICADORES.find((i) => i.chave === ind)!.tema);
      setChave(ind);
    }
    const a = q.get("autor");
    if (a) setAutor(a);
    const o = q.get("origem");
    if (o === "camara" || o === "prefeitura") setOrigem(o);
    // ?bairro= abre o painel do bairro (links da página do dinheiro).
    const b = q.get("bairro");
    if (b && bairros.some((x) => x.id === b)) setSelecionado(b);
    // Só na abertura da página: depois, quem manda é quem está navegando.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const abaInicial =
    tema === "dinheiro"
      ? "dinheiro"
      : tema === "eleicao"
      ? "eleicao"
      : tema === "servicos"
        ? "servicos"
        : tema === "politica"
          ? "politica"
          : tema === "seguranca"
            ? "seguranca"
            : "perfil";
  const opcoesAutor =
    chave === "votosVereador"
      ? comVotos.map((v) => ({
          id: v.id,
          rotulo: `${v.nome} (${votosVereador[v.id].total.toLocaleString("pt-BR")} votos)`,
        }))
      : autores.filter((a) => origem === "todos" || a.origem === origem).map((a) => ({ id: a.id, rotulo: `${a.nome} (${a.n})` }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        {/* Tema, indicador e filtros: tudo acima do mapa */}
        <div className="space-y-2 border-b border-slate-100 p-3">
          {/* Trilha: Osasco › bairro selecionado, e o autor filtrado */}
          <nav className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Onde você está no mapa">
            <button
              onClick={() => setSelecionado(null)}
              className={`rounded-md px-2 py-1 font-medium transition ${sel ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900" : "bg-slate-100 text-slate-900"}`}
            >
              Osasco
            </button>
            {sel && (
              <>
                <span className="text-slate-400">›</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-900">{sel.nome}</span>
              </>
            )}
            {autorAtivo && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-900 ring-1 ring-inset ring-blue-200">
                {nomeVereador.get(autorAtivo) ?? autores.find((a) => a.id === autorAtivo)?.nome ?? autorAtivo}
                <button
                  onClick={() => setAutor("")}
                  aria-label="Tirar o filtro de autor"
                  className="ml-0.5 rounded-full px-1 text-blue-700 hover:bg-blue-100"
                >
                  ×
                </button>
              </span>
            )}
          </nav>
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
                onClick={() => (setChave(i.chave), setPeriodo(null))}
                aria-pressed={chave === i.chave}
                className={`rounded-md px-2.5 py-1 text-xs transition ${chave === i.chave ? "bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                {i.nome}
              </button>
            ))}
          </div>
          {periodos && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-medium uppercase tracking-wide text-slate-500">{indicador.historia?.tipo === "censo" ? "Censo" : "Eleição"}</span>
              <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Ano">
                {periodos.map((p) => {
                  const ativo = (periodoAtivo ?? periodos.filter((x) => x !== "mudanca").at(-1)) === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPeriodo(p)}
                      aria-pressed={ativo}
                      className={`rounded-md px-2.5 py-1 font-semibold tabular-nums transition ${ativo ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      {rotuloPeriodo(p)}
                    </button>
                  );
                })}
              </div>
              {periodoAtivo === "mudanca" && <span className="text-slate-500">de {periodos[0]} para {periodos.at(-2)}</span>}
            </div>
          )}
          {(politica || chave === "votosVereador") && (
            <div className="flex flex-wrap items-center gap-2">
              {politica && (
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
              )}
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
          )}
        </div>

        <div className="flex flex-col gap-4 p-3 md:flex-row md:items-start lg:flex-col lg:items-stretch">
          <div
            ref={caixa}
            className="relative w-full md:w-auto md:max-w-[calc(100%-15rem)] md:shrink-0 lg:w-full lg:max-w-none"
            onMouseLeave={() => {
              setFoco(null);
              setPontoFoco(null);
              setFavelaFoco(null);
              setDica(null);
            }}
          >
            <svg
              ref={svgRef}
              viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
              className={`mx-auto block h-[min(62vh,760px)] w-auto max-w-full cursor-grab touch-pan-y select-none active:cursor-grabbing md:h-[min(76vh,800px)] ${ruas && projecao ? "mapa-com-ruas" : ""} ${entrou ? "mapa-entrada" : "opacity-0"}`}
              role="img"
              aria-label="Mapa dos bairros de Osasco. Arraste para mover (no celular, com dois dedos); use os botões ou Ctrl + rolagem para aproximar."
              onMouseMove={(e) => {
                const r = caixa.current!.getBoundingClientRect();
                setDica({ x: e.clientX - r.left, y: e.clientY - r.top });
              }}
            >
              <defs>
                <pattern id="mapa-favela" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <line x1="0" y1="0" x2="0" y2="5" stroke="var(--mapa-camara)" strokeWidth="2.2" />
                </pattern>
                <pattern id="mapa-sem-dado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="var(--mapa-vazio)" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="var(--mapa-hachura)" strokeWidth="2" />
                </pattern>
              </defs>
              <g ref={grupoRef} transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
                {ruas && projecao && (
                  <Ruas projecao={projecao} caixa={vb} pxPorUnidade={pxPorUnidade} inscrever={inscrever} vistaInicial={vista} />
                )}
                <g>
                  {bairros.map((b) => {
                    const ativo = realce === b.id;
                    return (
                      <path
                        key={b.id}
                        d={b.d}
                        data-bairro={b.id}
                        className="mapa-bairro cursor-pointer"
                        style={{
                          ["--atraso" as string]: `${(b.distancia / maxDist) * 0.7}s`,
                          fill: corDaFaixa(faixa(valor(b))),
                          opacity: realce && !ativo && !citados.includes(b.id) ? 0.55 : 1,
                        }}
                        stroke="var(--mapa-borda)"
                        strokeWidth={1.2}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        tabIndex={0}
                        role="button"
                        aria-label={`${b.nome}: ${formatar(valor(b), formato)}`}
                        onMouseEnter={() => setFoco(b.id)}
                        onFocus={() => setFoco(b.id)}
                        onBlur={() => setFoco(null)}
                        onClick={() => setSelecionado(selecionado === b.id ? null : b.id)}
                        onKeyDown={(e) =>
                          (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelecionado(selecionado === b.id ? null : b.id))
                        }
                      />
                    );
                  })}
                </g>
                {citados.map(
                  (id) =>
                    porId.get(id) && (
                      <path
                        key={`citado-${id}`}
                        d={porId.get(id)!.d}
                        fill="none"
                        stroke="var(--mapa-destaque)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                    ),
                )}
                {realce && porId.get(realce) && (
                  <path
                    d={porId.get(realce)!.d}
                    fill="none"
                    stroke="var(--mapa-destaque)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                )}
                {/* Contornos das favelas e comunidades urbanas (IBGE) */}
                {verFavelas && (
                  <g>
                    {favelas.map((f) => (
                      <path
                        key={f.codigo}
                        d={f.d}
                        className="mapa-ponto cursor-help"
                        fill="url(#mapa-favela)"
                        stroke="var(--mapa-camara)"
                        strokeWidth={favelaFoco === f ? 2.2 : 1.2}
                        vectorEffect="non-scaling-stroke"
                        onMouseEnter={() => setFavelaFoco(f)}
                        onMouseLeave={() => setFavelaFoco(null)}
                      />
                    ))}
                  </g>
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
                      <g transform={`translate(${p.x} ${p.y})`}>
                        <g className="mapa-escala">
                          <Marcador tipo={p.tipo} ativo={pontoFoco === p} />
                        </g>
                      </g>
                    </g>
                  ))}
                </g>
                {/* Ondas: documentos do mês saindo do centro do bairro, na cor da origem */}
                {politica && (
                  <g key={`ondas-${mes}-${origem}-${autorAtivo}`}>
                    {doMes.flatMap((i, k) =>
                      i.bairros
                        .map((id) => porId.get(id))
                        .filter(Boolean)
                        .map((b) => (
                          <g key={`${i.id}-${b!.id}`} transform={`translate(${b!.cx} ${b!.cy})`}>
                            <g className="mapa-escala">
                              <circle
                                r={9}
                                fill="none"
                                stroke={corOrigem(i.origem)}
                                strokeWidth={3}
                                className="mapa-onda"
                                style={{ animationDelay: `${(k % 6) * 0.12}s` }}
                              />
                              <circle r={4.5} fill={corOrigem(i.origem)} stroke="var(--mapa-borda)" strokeWidth={1.5} />
                            </g>
                          </g>
                        )),
                    )}
                  </g>
                )}
                {sel && (
                  <g transform={`translate(${sel.cx} ${sel.cy})`}>
                    <g className="mapa-escala">
                      <circle r={7} fill="var(--mapa-destaque)" className="mapa-pulso" />
                    </g>
                  </g>
                )}
                {bairros
                  .filter((b) => rotulados.has(b.id) || b.id === realce || citados.includes(b.id))
                  .map((b) => (
                    <text
                      key={`t-${b.id}`}
                      x={b.cx}
                      y={b.cy}
                      dy={`${-10 / vista.k}`}
                      textAnchor="middle"
                      className="mapa-rotulo"
                      style={{
                        fontSize: `calc(${b.id === realce ? 15 : 12}px / var(--k, 1))`,
                      }}
                      fontWeight={600}
                    >
                      {b.nome}
                    </text>
                  ))}
              </g>
            </svg>

            {/* Controles do mapa: aproximar, afastar, ver a cidade inteira, ligar e desligar as ruas */}
            <div className="absolute right-2 top-2 flex flex-col gap-1">
              <div className="flex flex-col overflow-hidden rounded-lg bg-white/90 shadow-sm ring-1 ring-slate-200 backdrop-blur">
                <button
                  onClick={() => aproximar(1.7)}
                  aria-label="Aproximar"
                  className="grid h-8 w-8 place-items-center text-lg leading-none text-slate-700 hover:bg-slate-100"
                >
                  +
                </button>
                <button
                  onClick={() => aproximar(1 / 1.7)}
                  aria-label="Afastar"
                  className="grid h-8 w-8 place-items-center border-t border-slate-200 text-lg leading-none text-slate-700 hover:bg-slate-100"
                >
                  −
                </button>
              </div>
              {vista.k > 1.05 && (
                <button
                  onClick={() => (selecionado ? setSelecionado(null) : irPara(null))}
                  aria-label="Ver Osasco inteira"
                  title="Ver Osasco inteira"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur hover:bg-slate-100"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                    <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
                  </svg>
                </button>
              )}
              {projecao && (
                <button
                  onClick={() => setRuas((r) => !r)}
                  aria-pressed={ruas}
                  title={ruas ? "Esconder as ruas" : "Mostrar as ruas"}
                  className={`grid h-8 w-8 place-items-center rounded-lg shadow-sm ring-1 backdrop-blur transition ${ruas ? "bg-slate-900 text-white ring-slate-900" : "bg-white/90 text-slate-700 ring-slate-200 hover:bg-slate-100"}`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M1.5 4 5.5 2l5 2 4-2v10l-4 2-5-2-4 2Z M5.5 2v10 M10.5 4v10" />
                  </svg>
                  <span className="sr-only">Ruas</span>
                </button>
              )}
            </div>

            {ruas && projecao && (
              <div className="absolute left-2 top-2 rounded bg-white/80 px-1.5 py-0.5 text-[9px] text-slate-500 backdrop-blur">
                © <a href="https://www.openstreetmap.org/copyright" className="hover:underline">colaboradores do OpenStreetMap</a>
              </div>
            )}

            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-lg bg-slate-900/80 px-3 py-2 text-xs text-white transition-opacity ${avisoRolagem ? "opacity-100" : "opacity-0"}`}
            >
              {avisoRolagem === "toque" ? "Use dois dedos para mover o mapa" : "Segure Ctrl (ou ⌘) e role para aproximar"}
            </div>

            {/* Linha do tempo compacta, por cima do mapa: só no tema Política */}
            {politica && (
              <div className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-xl bg-white/90 p-1.5 shadow-sm ring-1 ring-slate-200 backdrop-blur">
                <button
                  onClick={tocar}
                  aria-label={tocando ? "Pausar" : "Tocar a linha do tempo"}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-800 text-white transition hover:scale-105 hover:bg-blue-700"
                >
                  {tocando ? (
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
                      <rect x="3" y="2" width="3.5" height="12" rx="1" />
                      <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" className="ml-0.5 h-3 w-3" fill="currentColor" aria-hidden>
                      <path d="M4 2.5v11a1 1 0 0 0 1.5.86l9-5.5a1 1 0 0 0 0-1.72l-9-5.5A1 1 0 0 0 4 2.5Z" />
                    </svg>
                  )}
                </button>
                <div className="w-[4.75rem] shrink-0 text-[11px] leading-tight text-slate-500">
                  <b className="block text-xs text-slate-900">até {rotuloMes(ateMes)}</b>
                  {visiveis.length} docs
                  {doMes.length ? ` · +${doMes.length}` : ""}
                </div>
                <div className="relative h-7 min-w-0 flex-1">
                  <div className="flex h-full items-end gap-px" aria-hidden>
                    {porMes.map((n, k) => (
                      <span
                        key={meses[k]}
                        className={`block flex-1 rounded-t-sm transition-all duration-300 ${k === mes ? "bg-blue-700" : k < mes ? "bg-blue-400" : "bg-slate-200"}`}
                        style={{
                          height: `${Math.max(n ? 14 : 6, (n / maxMes) * 100)}%`,
                        }}
                      />
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
                    aria-label="Mês da linha do tempo"
                    aria-valuetext={`até ${rotuloMes(ateMes)}, ${visiveis.length} documentos`}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
              </div>
            )}

            {dica && (pontoFoco || favelaFoco || bFoco) && (
              <div
                className="pointer-events-none absolute z-10 w-60 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
                style={{
                  left: Math.max(4, Math.min(dica.x + 14, (caixa.current?.clientWidth ?? 600) - 244)),
                  top: dica.y + 14,
                }}
              >
                {favelaFoco && !pontoFoco ? (
                  <>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Favela ou comunidade urbana</div>
                    <div className="text-sm font-semibold text-slate-900">{favelaFoco.nome}</div>
                    <div className="mt-0.5 text-slate-600">{favelaFoco.moradores.toLocaleString("pt-BR")} moradores no Censo 2022</div>
                  </>
                ) : pontoFoco ? (
                  <>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{pontoFoco.categoria}</div>
                    <div className="text-sm font-semibold text-slate-900">{pontoFoco.nome}</div>
                    {pontoFoco.eleitores != null && (
                      <div className="mt-0.5 text-slate-600">{pontoFoco.eleitores.toLocaleString("pt-BR")} eleitores</div>
                    )}
                    {pontoFoco.bairro && <div className="mt-0.5 text-slate-500">{porId.get(pontoFoco.bairro)?.nome}</div>}
                  </>
                ) : (
                  bFoco && (
                    <>
                      <div className="text-sm font-semibold text-slate-900">{bFoco.nome}</div>
                      <div className="mt-1 flex items-baseline justify-between gap-3">
                        <span className="text-slate-600">{indicador.nome}</span>
                        <span className="text-base font-semibold tabular-nums text-slate-900">{formatar(valor(bFoco), formato)}</span>
                      </div>
                      {mediaCidade != null && (
                        <div className="text-right text-[11px] text-slate-500">Osasco: {formatar(mediaCidade, formato)}</div>
                      )}
                      {chave === "votosVereador" && votos && (
                        <div className="text-right text-[11px] text-slate-500">
                          {formatar(((votos.porBairro[bFoco.id] ?? 0) / votos.total) * 100, "pct")} dos votos de {nomeVereador.get(autorAtivo)}
                        </div>
                      )}
                      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-t border-slate-100 pt-1.5 text-slate-600">
                        <span>Moradores</span>
                        <span className="text-right tabular-nums text-slate-900">
                          {(bFoco.censo?.pessoas ?? bFoco.populacao ?? 0).toLocaleString("pt-BR")}
                        </span>
                        {politica && (
                          <>
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
                          </>
                        )}
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
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {indicador.nome}
                {periodos && ` · ${rotuloPeriodo(periodoAtivo ?? periodos.filter((x) => x !== "mudanca").at(-1)!)}`}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                {politica ? (
                  <>
                    <span className="text-5xl font-bold tabular-nums tracking-tight text-slate-900">{visiveis.length}</span>
                    <span className="text-sm text-slate-500">
                      documentos {mes < meses.length - 1 || tocando ? `até ${rotuloMes(ateMes)}` : "na legislatura"}
                    </span>
                  </>
                ) : chave === "votosVereador" && votos ? (
                  <>
                    <span className="text-5xl font-bold tabular-nums tracking-tight text-slate-900">{votos.total.toLocaleString("pt-BR")}</span>
                    <span className="text-sm text-slate-500">votos de {nomeVereador.get(autorAtivo)} em 2024</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-900">
                      {formatar(mediaCidade ?? ranking[0]?.v ?? null, formato)}
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
                <span className="tabular-nums">{formatar(minimo, formato)}</span>
                <div className="flex overflow-hidden rounded">
                  {Array.from({ length: FAIXAS + (escala === "zero" ? 1 : 0) }, (_, f) => (
                    <span
                      key={f}
                      className="h-2.5 w-4 sm:w-5"
                      style={{
                        background: corDaFaixa(escala === "zero" ? f : f + 1),
                      }}
                    />
                  ))}
                </div>
                <span className="tabular-nums">{formatar(maximo, formato)}</span>
                <span className="ml-1 inline-flex items-center gap-1">
                  <span
                    className="h-2.5 w-3.5 rounded-sm"
                    style={{
                      background: "repeating-linear-gradient(45deg, var(--mapa-vazio) 0 2px, var(--mapa-hachura) 2px 4px)",
                    }}
                  />
                  sem dado
                </span>
              </div>
              {politica && (
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
              )}
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
                      <Marcador tipo={c.chave} ativo={false} />
                    </svg>
                    {c.nome} ({n})
                  </button>
                );
              })}
              <button
                onClick={() => setVerFavelas((v) => !v)}
                aria-pressed={verFavelas}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition ${verFavelas ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                  <rect x="1" y="1" width="10" height="10" rx="2" fill="url(#mapa-favela)" stroke="var(--mapa-camara)" strokeWidth="1.2" />
                </svg>
                Favelas e comunidades ({favelas.length})
              </button>
            </div>

            {politica && (
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {doMes.length ? `Documentos em ${rotuloMes(ateMes)}` : "Documentos mais recentes"}
                </div>
                <ol className="space-y-2">
                  {feed.map((i) => (
                    <li
                      key={`${mes}-${i.id}`}
                      className="animate-[mapa-painel_0.45s_ease_both] rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
                      style={{ borderLeft: `3px solid ${corOrigem(i.origem)}` }}
                      // Todos os bairros citados pelo documento ficam tracejados no mapa enquanto o ponteiro está nele.
                      onMouseEnter={() => setCitados(i.bairros)}
                      onMouseLeave={() => setCitados([])}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-700">{i.tipo}</span>
                        <span>·</span>
                        <span className="flex flex-wrap gap-x-1">
                          {i.bairros
                            .filter((id) => porId.get(id))
                            .map((id, k, arr) => (
                              <button
                                key={id}
                                className="font-medium text-blue-800 hover:underline"
                                onClick={() => {
                                  citadosAoEscolher.current = i.bairros.filter((b) => b !== id);
                                  setSelecionado(id);
                                }}
                              >
                                {porId.get(id)!.nome}
                                {k < arr.length - 1 ? "," : ""}
                              </button>
                            ))}
                        </span>
                        <span className="ml-auto">{dataCurta(i.data)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-slate-700">{i.texto}</p>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {i.autoresNomes?.join(", ") ?? i.autorNome}
                        {i.via && ` · via ${i.via[0].toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase())}`}
                      </div>
                    </li>
                  ))}
                  {!feed.length && <li className="text-xs text-slate-500">Nenhum documento com estes filtros.</li>}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Painel lateral: ranking do indicador ou bairro selecionado. No celular, o bairro abre num painel que sobe
          da parte de baixo da tela, por cima do mapa, em vez de ficar lá embaixo da página. */}
      <aside
        className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 lg:max-h-[60rem] lg:overflow-y-auto ${
          sel
            ? "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[58dvh] max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:rounded-b-none max-lg:pb-[calc(1rem+env(safe-area-inset-bottom))] max-lg:shadow-[0_-12px_40px_rgb(0_0_0/0.25)] max-lg:[animation:painel-sobe_0.28s_ease-out]"
            : ""
        }`}
      >
        {sel && (
          <button
            type="button"
            onClick={() => setSelecionado(null)}
            aria-label="Fechar o bairro"
            className="-mt-2 mb-2 flex w-full justify-center py-1 lg:hidden"
          >
            <span className="h-1.5 w-10 rounded-full bg-slate-300" />
          </button>
        )}
        {sel ? (
          <PainelBairro
            key={sel.id}
            bairro={sel}
            itens={visiveis
              .filter((i) => i.bairros.includes(sel.id))
              .slice()
              .reverse()}
            cidade={cidade}
            vereadores={idsVereadores}
            abaInicial={abaInicial}
            aoEscolherIndicador={escolherIndicador}
            aoFechar={() => setSelecionado(null)}
            mesTexto={mes < meses.length - 1 ? rotuloMes(ateMes) : null}
            anoSeguranca={anoSeguranca}
            historico={historico}
            nomesBairros={nomesBairros}
            marcarBairros={marcarBairros}
          />
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {indicador.nome}
              {periodoAtivo ? ` (${rotuloPeriodo(periodoAtivo).toLowerCase()})` : ""}: ranking dos bairros
            </h2>
            <p className="text-xs text-slate-500">
              {mediaCidade != null ? `A marca escura é a média de Osasco (${formatar(mediaCidade, formato)}). ` : ""}
              Clique em um bairro para ver tudo sobre ele.
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
                        <span
                          className="block h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${Math.max(3, pos(v))}%` }}
                        />
                        {mediaCidade != null && (
                          <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-slate-900" style={{ left: `${pos(mediaCidade)}%` }} />
                        )}
                      </span>
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{formatar(v, formato)}</span>
                  </button>
                </li>
              ))}
            </ol>
            {ranking.length > 15 && (
              <details className="mt-2 text-xs text-slate-600">
                <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-800">
                  Ver os outros {ranking.length - 15} bairros
                </summary>
                <ol className="mt-2 space-y-1">
                  {ranking.slice(15).map(({ b, v }, k) => (
                    <li key={b.id} className="flex justify-between gap-2">
                      <button onClick={() => setSelecionado(b.id)} className="truncate text-left hover:underline">
                        {k + 16}. {b.nome}
                      </button>
                      <span className="tabular-nums text-slate-900">{formatar(v, formato)}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {!ranking.length && <p className="mt-3 text-sm text-slate-500">Nenhum bairro com valor para este indicador e filtros.</p>}
            {politica && (
              <div className="mt-5 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                <div className="text-sm font-semibold text-amber-900">{nuncaCitados.length} bairros sem nenhum documento</div>
                <p className="mt-0.5 text-xs text-amber-900/80">
                  {Math.round(nuncaCitados.reduce((a, b) => a + (b.censo?.pessoas ?? b.populacao ?? 0), 0) / 1000).toLocaleString("pt-BR")} mil
                  moradores
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
