"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type Autor,
  type Emenda,
  EXPLICA_TIPO_EMENDA,
  ROTULO_TIPO_EMENDA,
  cargoDe,
  esferaDe,
  frase,
  mesAno,
  nomeAutor,
  nomeDe,
  nomeFuncao,
  nomeProprio,
  situacaoDe,
  situacaoPlano,
} from "@/lib/dinheiro";
import { comBase, dataBR, dinheiroCurto, iniciais, reais } from "@/lib/formato";
import { DinheiroAnimado } from "@/components/Animacoes";
import { Abre, Segmentos } from "@/components/movimento/Movimento";

// ---------- Peças pequenas ----------

const COR_ESFERA = { Federal: "var(--grafico-1)", Estadual: "var(--grafico-2)", Municipal: "var(--grafico-3)" } as const;

export function Etiqueta({ children, cor, forte }: { children: React.ReactNode; cor?: string; forte?: boolean }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium ${forte ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}
    >
      {cor && <span className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} aria-hidden />}
      {children}
    </span>
  );
}

const partidoLegivel = (s: string) => (/^S\/?\s*Part/i.test(s) || /^S\.PART/i.test(s) ? "sem partido" : s);

// Cargo, esfera, partido e situação de quem mandou a emenda.
export function Etiquetas({ a, partido }: { a: Autor; partido?: string | null }) {
  const cargo = cargoDe(a);
  const esfera = esferaDe(a);
  const p = partido ?? a.perfil?.partido ?? a.vereador?.partido ?? null;
  return (
    <span className="flex flex-wrap gap-1">
      {cargo && <Etiqueta>{cargo}</Etiqueta>}
      {esfera && <Etiqueta cor={COR_ESFERA[esfera]}>{esfera}</Etiqueta>}
      {p && (
        <Etiqueta>
          {partidoLegivel(p)}
          {a.perfil?.uf && ` · ${a.perfil.uf}`}
        </Etiqueta>
      )}
      {a.perfil && a.perfil.situacao !== "Exercício" && <Etiqueta>{situacaoDe(a.perfil)}</Etiqueta>}
    </span>
  );
}

function Foto({ a, tamanho = 40 }: { a: Autor; tamanho?: number }) {
  const src = a.perfil?.foto ?? a.vereador?.foto ?? null;
  const estilo = { width: tamanho, height: tamanho };
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={comBase(src)} alt="" loading="lazy" className="shrink-0 rounded-full bg-slate-100 object-cover object-top" style={estilo} />;
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500" style={estilo} aria-hidden>
      {a.coletiva ? "—" : iniciais(nomeDe(a))}
    </span>
  );
}

function Seta({ aberto }: { aberto: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const anosDe = (a: Autor) => {
  const anos = Object.keys(a.porAno).sort();
  return anos.length ? (anos.length === 1 ? anos[0] : `${anos[0]} a ${anos.at(-1)}`) : null;
};

// Legislaturas seguidas viram um período só (a 55ª foi de 2015 a 2019; a 56ª e a 57ª, de 2019 a 2027).
const periodos = (ls: number[]) => {
  const out: [number, number][] = [];
  for (const l of [...ls].sort((a, b) => a - b)) {
    const ini = 2015 + (l - 55) * 4;
    if (out.length && out.at(-1)![1] === ini) out.at(-1)![1] = ini + 4;
    else out.push([ini, ini + 4]);
  }
  return out.map(([a, b]) => `${a} a ${b}`).join(", ");
};

const MODALIDADE: [RegExp, string][] = [
  [/DISPENSA/i, "sem licitação (dispensa)"],
  [/INEXIG/i, "sem licitação (inexigível)"],
  [/PREG/i, "pregão"],
  [/CONCORR/i, "concorrência"],
  [/BEC/i, "bolsa eletrônica de compras"],
  [/TOMADA/i, "tomada de preços"],
  [/CONVITE/i, "convite"],
  [/RDC/i, "regime diferenciado"],
];
const modalidade = (m: string) => MODALIDADE.find(([re]) => re.test(m))?.[1] ?? null;

// Emendas que foram só para entidades (sem passar pela Prefeitura) ficam na aba "Direto a entidades".
const soEntidades = (e: Emenda) => e.paraEntidades > 0 && !e.recebido && !e.semRegistro;
const emendasPrefeitura = (a: Autor) => a.emendas.filter((e) => !soEntidades(e));

// ---------- Uma emenda ----------

function resumoEmenda(e: Emenda) {
  if (e.tipo === "vereador") return e.pagamentos[0]?.fornecedor ?? e.acao ?? null;
  if (e.pix?.objetos.length) return e.pix.objetos[0].objeto;
  if (e.convenios.length) return e.convenios[0].objeto;
  return e.acao ? frase(e.acao) : e.funcao ? nomeFuncao(e.funcao) : null;
}

// "indice": posição na lista, para os cartões entrarem em sequência.
export function CartaoEmenda({ e, abertoInicial = false, indice }: { e: Emenda; abertoInicial?: boolean; indice?: number }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const id = useId();
  const resumo = resumoEmenda(e);
  const valor = e.tipo === "vereador" ? e.recebido : e.semRegistro ? e.pagoNasNotas : e.recebido || e.paraEntidades || e.pix?.valor || 0;
  const naoChegou = e.tipo !== "vereador" && !e.semRegistro && !e.recebido && !e.paraEntidades;
  return (
    <li
      className={`rounded-xl border bg-white transition-[border-color,box-shadow] duration-200 ${indice != null ? "entra" : ""} ${aberto ? "border-slate-300 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
      style={indice != null ? ({ "--i": indice } as React.CSSProperties) : undefined}
    >
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} aria-controls={id} className="flex w-full items-start gap-3 rounded-xl p-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 tabular-nums">{e.ano}</span>
            <Etiqueta>{ROTULO_TIPO_EMENDA[e.tipo]}</Etiqueta>
            {e.partido && e.tipo !== "vereador" && <span>{partidoLegivel(e.partido)} na época</span>}
            {e.pagamentos.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 text-emerald-800 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
                rastreada até a nota
              </span>
            )}
          </span>
          {resumo && <span className="mt-1 line-clamp-2 block text-sm text-slate-800">{frase(resumo)}</span>}
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums text-slate-900">{dinheiroCurto(valor)}</span>
          <span className="block text-[11px] text-slate-500">{naoChegou ? "não chegou" : e.tipo === "vereador" || e.semRegistro ? "pago" : e.recebido ? "recebido" : "a entidades"}</span>
        </span>
        <span className="mt-0.5 text-slate-400">
          <Seta aberto={aberto} />
        </span>
      </button>
      <Abre aberto={aberto} id={id}>
        <div className="space-y-3 border-t border-slate-100 px-3 pt-2 pb-3 text-sm">
          {EXPLICA_TIPO_EMENDA[e.tipo] && <p className="text-xs text-slate-500">{EXPLICA_TIPO_EMENDA[e.tipo]}</p>}
          {e.semRegistro && (
            <p className="text-xs text-slate-500">
              A Prefeitura cita esta emenda{e.numero ? ` (número ${e.numero})` : ""} nos pagamentos abaixo, mas o registro federal não a mostra como recebida
              por Osasco: o dinheiro pode ter chegado por outro caminho, como um repasse a um fundo.
            </p>
          )}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            {e.codigo && (
              <>
                <dt className="text-slate-500">Número</dt>
                <dd className="tabular-nums text-slate-800">{e.codigo}</dd>
              </>
            )}
            {e.funcao && (
              <>
                <dt className="text-slate-500">Área</dt>
                <dd className="text-slate-800">
                  {nomeFuncao(e.funcao)}
                  {e.subfuncao && ` · ${e.subfuncao.toLowerCase()}`}
                </dd>
              </>
            )}
            {e.programa && (
              <>
                <dt className="text-slate-500">Programa</dt>
                <dd className="text-slate-800">{frase(e.programa)}</dd>
              </>
            )}
            {e.acao && e.tipo !== "vereador" && (
              <>
                <dt className="text-slate-500">Para quê</dt>
                <dd className="text-slate-800">{frase(e.acao)}</dd>
              </>
            )}
            {e.localidade && e.localidade !== "OSASCO - SP" && e.valorEmenda && (
              <>
                <dt className="text-slate-500">Emenda inteira</dt>
                <dd className="text-slate-800">
                  {dinheiroCurto(e.valorEmenda.pago)} pagos{" "}
                  {/M[UÚ]LTIPLO/i.test(e.localidade) ? "a várias cidades" : `para ${frase(e.localidade.replace(/\s*\(UF\)/, ""))}`}; Osasco recebeu{" "}
                  {dinheiroCurto(e.recebido + e.paraEntidades)}
                </dd>
              </>
            )}
          </dl>

          {e.recebimentos.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-900">Quando o dinheiro chegou</div>
              <ul className="mt-1 divide-y divide-slate-100 text-xs">
                {e.recebimentos.map((r, i) => (
                  <li key={i} className="flex items-baseline gap-3 py-1">
                    <span className="w-16 shrink-0 tabular-nums text-slate-500">{mesAno(r.mes)}</span>
                    <span className="min-w-0 flex-1 text-slate-700">
                      {nomeProprio(r.favorecido)}
                      {r.entidade && <span className="text-slate-500"> (entidade, fora da Prefeitura)</span>}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-900">{reais(r.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {e.convenios.map((c) => (
            <div key={c.numero} className="rounded-lg bg-slate-50 p-2 text-xs">
              <div className="font-medium text-slate-900">
                Convênio {c.numero}, assinado em {dataBR(c.data)}, {dinheiroCurto(c.valor)}
              </div>
              <p className="mt-0.5 text-slate-700">{frase(c.objeto)}</p>
            </div>
          ))}

          {e.pix && (
            <div className="rounded-lg bg-slate-50 p-2 text-xs">
              <div className="font-medium text-slate-900">
                O que a Prefeitura disse que faria
                {e.pix.planoTrabalho && <span className="font-normal text-slate-500"> · {situacaoPlano(e.pix.planoTrabalho.situacao)}</span>}
                {e.pix.planoTrabalho?.fim && <span className="font-normal text-slate-500"> · prazo até {dataBR(e.pix.planoTrabalho.fim)}</span>}
              </div>
              {/IMPEDIDO/i.test(e.pix.situacao) ? (
                <p className="mt-0.5 text-slate-700">A emenda foi barrada antes do pagamento (impedimento registrado no sistema federal) e o dinheiro não veio.</p>
              ) : e.pix.objetos.length ? (
                <ul className="mt-1 space-y-1">
                  {e.pix.objetos.map((o, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="min-w-0 flex-1 text-slate-700">{o.objeto}</span>
                      <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(o.valor)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-slate-700">A Prefeitura ainda não informou o que vai fazer com este dinheiro.</p>
              )}
            </div>
          )}

          {e.pagamentos.length > 0 && <Pagamentos e={e} />}

          {e.codigo && e.tipo !== "vereador" && (
            <a
              href={`https://portaldatransparencia.gov.br/emendas/detalhe?codigoEmenda=${e.codigo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-medium text-blue-800 underline"
            >
              Ver esta emenda no Portal da Transparência ↗
            </a>
          )}
          {/* Sem número de emenda (a CGU grava "Sem informação"): o link vai para quem recebeu, que lista as emendas recebidas. */}
          {!e.codigo &&
            [...new Map(e.recebimentos.map((r) => [r.cnpj, r.favorecido])).entries()].map(([cnpj, nome]) => (
              <a
                key={cnpj}
                href={`https://portaldatransparencia.gov.br/pessoa-juridica/${cnpj}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs font-medium text-blue-800 underline"
              >
                Ver as emendas recebidas por {nomeProprio(nome)} no Portal da Transparência ↗
              </a>
            ))}
          {!e.codigo && e.recebimentos.length > 0 && (
            <p className="text-xs text-slate-500">O registro federal não traz o número nem o autor desta emenda.</p>
          )}
        </div>
      </Abre>
    </li>
  );
}

function Pagamentos({ e }: { e: Emenda }) {
  const [todos, setTodos] = useState(false);
  const lista = todos ? e.pagamentos : e.pagamentos.slice(0, 5);
  return (
    <div>
      <div className="text-xs font-medium text-slate-900">
        {e.tipo === "vereador" ? "Pagamentos" : "Compras pagas com esta emenda"}{" "}
        <span className="font-normal text-slate-500">
          ({dinheiroCurto(e.pagoNasNotas)}
          {e.tipo !== "vereador" && e.recebido > 0 && ` de ${dinheiroCurto(e.recebido)} recebidos`})
        </span>
      </div>
      <ul className="mt-1 divide-y divide-slate-100 text-xs">
        {lista.map((p, i) => (
          <li key={i} className="py-1.5">
            <div className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1 font-medium text-slate-800">{p.fornecedor ?? "Pagamento a pessoa física"}</span>
              <span className="shrink-0 tabular-nums text-slate-900">{reais(p.valor)}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {[dataBR(p.data), modalidade(p.modalidade), p.pagamentos > 1 && `${p.pagamentos} pagamentos`].filter(Boolean).join(" · ")}
            </div>
            {p.texto && <p className="mt-0.5 line-clamp-3 text-slate-600">{frase(p.texto)}</p>}
          </li>
        ))}
      </ul>
      {e.pagamentos.length > 5 && (
        <button type="button" onClick={() => setTodos(!todos)} className="mt-1 text-xs font-medium text-blue-800 underline">
          {todos ? "Mostrar menos" : `Ver todas as ${e.pagamentos.length} compras`}
        </button>
      )}
    </div>
  );
}

// ---------- Ficha do político (janela) ----------

function Ficha({ a, aoFechar }: { a: Autor; aoFechar: () => void }) {
  const janela = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  const arraste = useRef<{ y0: number; dy: number } | null>(null);
  useEffect(() => {
    const d = janela.current;
    if (d && !d.open) d.showModal();
    document.documentElement.classList.add("overflow-hidden");
    return () => document.documentElement.classList.remove("overflow-hidden");
  }, []);
  // Fecha depois da animação de saída (sem animação quando o sistema pede menos movimento).
  const fechar = () => {
    const d = janela.current;
    if (!d || d.hasAttribute("data-fechando")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return d.close();
    d.style.transform = "";
    d.setAttribute("data-fechando", "");
    setTimeout(() => {
      d.removeAttribute("data-fechando");
      d.close();
    }, 190);
  };
  // No celular, arrastar a alça do topo para baixo fecha a janela.
  const comecaArraste = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    arraste.current = { y0: e.clientY, dy: 0 };
  };
  const arrasta = (e: React.PointerEvent) => {
    const a = arraste.current;
    const d = janela.current;
    if (!a || !d) return;
    a.dy = Math.max(0, e.clientY - a.y0);
    d.style.transition = "none";
    d.style.transform = `translateY(${a.dy}px)`;
  };
  const soltaArraste = () => {
    const a = arraste.current;
    const d = janela.current;
    arraste.current = null;
    if (!a || !d) return;
    d.style.transition = "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)";
    if (a.dy > 90) fechar();
    else d.style.transform = "";
  };
  const anos = Object.entries(a.porAno).sort(([x], [y]) => x.localeCompare(y));
  const maxAno = Math.max(...anos.map(([, v]) => v), 1);
  const p = a.perfil;
  const casa = p?.casa === "senado" ? "Senado Federal" : "Câmara dos Deputados";
  const paraPrefeitura = emendasPrefeitura(a);
  const paraEntidades = a.emendas.filter(soEntidades);
  return (
    <dialog
      ref={janela}
      aria-labelledby={tituloId}
      onClose={aoFechar}
      onCancel={(e) => {
        e.preventDefault();
        fechar();
      }}
      onClick={(e) => e.target === janela.current && fechar()}
      className="ficha fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm md:inset-0 md:m-auto md:h-fit md:w-[min(44rem,calc(100vw-2rem))] md:rounded-2xl"
    >
      <div className="relative max-h-[88dvh] overflow-y-auto overscroll-contain p-4 sm:p-6 md:max-h-[calc(100dvh-3rem)]">
        {/* Faixa de cor da esfera no topo da ficha. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.14]"
          style={{ background: `linear-gradient(to bottom, ${COR_ESFERA[esferaDe(a) ?? "Federal"]}, transparent)` }}
          aria-hidden
        />
        <div
          className="relative -mx-4 -mt-4 mb-1 flex h-8 cursor-grab touch-none items-center justify-center md:hidden"
          onPointerDown={comecaArraste}
          onPointerMove={arrasta}
          onPointerUp={soltaArraste}
          onPointerCancel={soltaArraste}
          aria-hidden
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <div className="relative flex items-start gap-4">
          <Foto a={a} tamanho={72} />
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="text-lg font-semibold text-balance text-slate-900">
              {nomeDe(a)}
            </h2>
            <div className="mt-1">
              <Etiquetas a={a} />
            </div>
            {p?.indicacaoDe && <p className="mt-1 text-xs text-slate-500">Assumiu a indicação de emendas de {nomeAutor(p.indicacaoDe)}, que deixou o mandato.</p>}
          </div>
          <button type="button" onClick={fechar} className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Fechar">
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {p && (
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            <dt className="text-slate-500">Mandatos</dt>
            <dd className="text-slate-800">
              {p.casa === "senado" ? "Senado" : "Câmara dos Deputados"}
              {p.uf && `, por ${p.uf}`}
              {p.legislaturas.filter((l) => l >= 52).length > 0 && `: ${periodos(p.legislaturas.filter((l) => l >= 52))}`}
            </dd>
            {p.partidos.length > 0 && (
              <>
                <dt className="text-slate-500">Partidos</dt>
                <dd className="text-slate-800">{p.partidos.map((x) => `${partidoLegivel(x.sigla)}${x.desde ? ` (${x.desde.slice(0, 4)})` : ""}`).join(" → ")}</dd>
              </>
            )}
          </dl>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] text-slate-500">{a.tipo === "vereador" ? "Pago com as emendas" : "Chegou à Prefeitura"}</div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">
              <DinheiroAnimado valor={a.total} />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] text-slate-500">{a.tipo === "vereador" ? "Destinos" : "Emendas à Prefeitura"}</div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">{paraPrefeitura.length}</div>
          </div>
          {a.totalEntidades > 0 && (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[11px] text-slate-500">Direto a entidades</div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                <DinheiroAnimado valor={a.totalEntidades} />
              </div>
            </div>
          )}
        </div>

        {anos.length > 1 && (
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-900">Por ano</div>
            <ul className="mt-1 space-y-1">
              {anos.map(([ano, v]) => (
                <li key={ano} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                  <span className="tabular-nums text-slate-500">{ano}</span>
                  <span className="relative h-2.5" aria-hidden>
                    <span className="absolute inset-0 rounded bg-slate-100" />
                    <span className="barra-anim absolute inset-y-0 left-0 rounded" style={{ width: `${Math.max(1, (v / maxAno) * 100)}%`, background: COR_ESFERA[esferaDe(a) ?? "Federal"] }} />
                  </span>
                  <span className="tabular-nums text-slate-900">{dinheiroCurto(v)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {paraPrefeitura.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-900">{paraPrefeitura.length === 1 ? "A emenda" : `As ${paraPrefeitura.length} emendas`}</div>
            <ul className="mt-2 space-y-2">
              {paraPrefeitura.map((e, i) => (
                <CartaoEmenda key={e.codigo ?? i} e={e} abertoInicial={a.emendas.length === 1} indice={i} />
              ))}
            </ul>
          </div>
        )}
        {paraEntidades.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-900">Direto a entidades, sem passar pela Prefeitura</div>
            <ul className="mt-2 space-y-2">
              {paraEntidades.map((e, i) => (
                <CartaoEmenda key={e.codigo ?? i} e={e} abertoInicial={a.emendas.length === 1} indice={i} />
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {p && (
            <a href={p.perfil} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-800 underline">
              Perfil oficial no {casa} ↗
            </a>
          )}
          {a.vereador && (
            <Link href={`/vereadores/${a.vereador.id}`} className="font-medium text-blue-800 underline">
              Página do vereador neste site
            </Link>
          )}
        </div>
      </div>
    </dialog>
  );
}

// ---------- Lista de quem mandou ----------

type Grupo = "individuais" | "coletivas" | "vereadores" | "entidades";
type Ordem = "valor" | "emendas" | "recentes";

// Linha compacta: foto, nome, uma etiqueta de cargo e uma de partido, barra fina e valor. As emendas abrem embaixo.
function LinhaAutor({ a, maximo, aoAbrir, partido, indice }: { a: Autor; maximo: number; aoAbrir: () => void; partido: string | null; indice: number }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const emendas = emendasPrefeitura(a).filter((e) => !partido || e.partido === partido);
  const valor = partido ? emendas.reduce((s, e) => s + e.recebido, 0) : a.total;
  const cargo = cargoDe(a);
  const esfera = esferaDe(a);
  const p = partido ?? a.perfil?.partido ?? a.vereador?.partido ?? null;
  const detalhe = [
    anosDe(a),
    a.funcoes.slice(0, 2).map(nomeFuncao).join(", "),
    a.perfil && a.perfil.situacao !== "Exercício" && situacaoDe(a.perfil),
  ].filter(Boolean);
  return (
    <li className="entra" style={{ "--i": indice } as React.CSSProperties}>
      {/* Em cima: foto, nome, valor e botão; embaixo, na largura toda (no celular), as etiquetas e a barra. */}
      <div className="group -mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50">
        <button
          type="button"
          onClick={aoAbrir}
          className="shrink-0 rounded-full ring-2 ring-transparent transition group-hover:ring-slate-200 focus-visible:outline-2 sm:row-span-3 sm:self-start"
          aria-label={`Abrir a ficha de ${nomeDe(a)}`}
        >
          <Foto a={a} tamanho={32} />
        </button>
        <button type="button" onClick={aoAbrir} className="min-w-0 text-left text-sm font-medium text-slate-900 hover:underline">
          {nomeDe(a)}
        </button>
        <span className="text-right text-sm font-semibold tabular-nums text-slate-900">{dinheiroCurto(valor)}</span>
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          aria-controls={id}
          aria-label={aberto ? "Esconder as emendas" : `Ver ${emendas.length === 1 ? "a emenda" : `as ${emendas.length} emendas`} de ${nomeDe(a)}`}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-blue-800 tabular-nums hover:bg-slate-50"
        >
          {emendas.length}
          <span className="max-sm:hidden">&nbsp;{a.tipo === "vereador" ? (emendas.length === 1 ? "destino" : "destinos") : emendas.length === 1 ? "emenda" : "emendas"}</span>
          <Seta aberto={aberto} />
        </button>
        {(cargo || p) && (
          <span className="col-span-4 flex flex-wrap gap-1 sm:col-span-3 sm:col-start-2">
            {cargo && esfera && (
              <Etiqueta cor={COR_ESFERA[esfera]}>{a.tipo === "deputado" ? `${cargo} ${esfera.toLowerCase()}` : `${cargo} · ${esfera.toLowerCase()}`}</Etiqueta>
            )}
            {p && (
              <Etiqueta>
                {partidoLegivel(p)}
                {a.perfil?.uf && ` · ${a.perfil.uf}`}
              </Etiqueta>
            )}
          </span>
        )}
        <span className="relative col-span-4 block h-1.5 sm:col-span-3 sm:col-start-2" aria-hidden>
          <span className="absolute inset-0 rounded bg-slate-100" />
          <span className="barra-anim absolute inset-y-0 left-0 rounded" style={{ width: `${maximo ? Math.max(0.5, (valor / maximo) * 100) : 0}%`, background: COR_ESFERA[esfera ?? "Federal"] }} />
        </span>
      </div>
      <Abre aberto={aberto} id={id}>
        <div className="pb-3 sm:pl-11">
          {detalhe.length > 0 && <p className="mb-2 text-xs text-slate-500">{detalhe.join(" · ")}</p>}
          <ul className="space-y-2">
            {emendas.map((e, i) => (
              <CartaoEmenda key={e.codigo ?? i} e={e} indice={i} />
            ))}
          </ul>
        </div>
      </Abre>
    </li>
  );
}

// Uma entidade da cidade que recebeu emenda federal direto: quem mandou (abre a ficha) e as emendas.
type Entidade = { nome: string; total: number; itens: { a: Autor; e: Emenda }[] };
function LinhaEntidade({ x, maximo, aoAbrir, indice }: { x: Entidade; maximo: number; aoAbrir: (a: Autor) => void; indice: number }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const autoresX = [...new Map(x.itens.map((i) => [i.a.chave, i.a])).values()];
  return (
    <li className="entra" style={{ "--i": indice } as React.CSSProperties}>
      <div className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900">{nomeProprio(x.nome)}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
            {autoresX.map((a) => (
              <button key={a.chave} type="button" onClick={() => aoAbrir(a)} className="text-left text-blue-800 hover:underline">
                {nomeDe(a)}
                {a.perfil?.partido && ` (${partidoLegivel(a.perfil.partido)})`}
              </button>
            ))}
          </div>
          <span className="relative mt-1.5 block h-1.5" aria-hidden>
            <span className="absolute inset-0 rounded bg-slate-100" />
            <span className="barra-anim absolute inset-y-0 left-0 rounded" style={{ width: `${Math.max(0.5, (x.total / maximo) * 100)}%`, background: "var(--grafico-4)" }} />
          </span>
        </div>
        <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">{dinheiroCurto(x.total)}</span>
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          aria-controls={id}
          aria-label={aberto ? "Esconder as emendas" : `Ver as emendas de ${nomeProprio(x.nome)}`}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-blue-800 tabular-nums hover:bg-slate-50"
        >
          {x.itens.length}
          <span className="max-sm:hidden">&nbsp;{x.itens.length === 1 ? "emenda" : "emendas"}</span>
          <Seta aberto={aberto} />
        </button>
      </div>
      <Abre aberto={aberto} id={id}>
        <ul className="space-y-2 pb-3">
          {x.itens.map(({ a, e }, k) => (
            <li key={k}>
              <div className="mb-1 text-[11px] text-slate-500">De {nomeDe(a)}</div>
              <ul>
                <CartaoEmenda e={e} />
              </ul>
            </li>
          ))}
        </ul>
      </Abre>
    </li>
  );
}

const VISIVEIS = 8;
const semAcento = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function QuemMandou({ autores, vereadores, porPartido }: { autores: Autor[]; vereadores: Autor[]; porPartido: { sigla: string; valor: number; autores: number }[] }) {
  const [grupo, setGrupo] = useState<Grupo>("individuais");
  const [ordem, setOrdem] = useState<Ordem>("valor");
  const [partido, setPartido] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Autor | null>(null);
  const [montado, setMontado] = useState(false);
  const [busca, setBusca] = useState("");
  const [todosVisiveis, setTodosVisiveis] = useState(false);
  const [todosPartidos, setTodosPartidos] = useState(false);
  const todos = useMemo(() => [...autores, ...vereadores], [autores, vereadores]);

  // /verbas?autor=giordano abre a ficha direto (links do mapa).
  useEffect(() => {
    setMontado(true);
    const chave = new URLSearchParams(window.location.search).get("autor");
    const a = chave && todos.find((x) => x.chave === chave);
    if (a) setFicha(a);
  }, [todos]);
  const abrir = (a: Autor) => {
    setFicha(a);
    const u = new URL(window.location.href);
    u.searchParams.set("autor", a.chave);
    window.history.replaceState(null, "", u);
  };
  const fechar = () => {
    setFicha(null);
    const u = new URL(window.location.href);
    u.searchParams.delete("autor");
    window.history.replaceState(null, "", u);
  };

  // Entidades: cada uma com as emendas que recebeu direto, de qualquer autor.
  const entidades = useMemo(() => {
    const m = new Map<string, Entidade>();
    for (const a of autores)
      for (const e of a.emendas)
        for (const r of e.recebimentos.filter((r) => r.entidade)) {
          const x = m.get(r.favorecido) ?? { nome: r.favorecido, total: 0, itens: [] };
          x.total += r.valor;
          if (!x.itens.some((i) => i.e === e)) x.itens.push({ a, e });
          m.set(r.favorecido, x);
        }
    return [...m.values()].sort((x, y) => y.total - x.total);
  }, [autores]);
  const base = grupo === "vereadores" ? vereadores : grupo === "entidades" ? [] : autores.filter((a) => (grupo === "coletivas" ? a.coletiva : !a.coletiva));
  const filtrados = base
    .filter((a) => !partido || a.emendas.some((e) => e.partido === partido && e.recebido > 0))
    .filter((a) => emendasPrefeitura(a).length > 0)
    .filter((a) => !busca.trim() || semAcento(`${nomeDe(a)} ${a.perfil?.partido ?? ""} ${a.vereador?.partido ?? ""}`).includes(semAcento(busca.trim())));
  const valorDe = (a: Autor) => (partido ? a.emendas.filter((e) => e.partido === partido).reduce((s, e) => s + e.recebido, 0) : a.total);
  const ultimo = (a: Autor) => Math.max(...a.emendas.map((e) => e.ano));
  const lista = [...filtrados].sort((x, y) =>
    ordem === "emendas" ? y.quantidade - x.quantidade || valorDe(y) - valorDe(x) : ordem === "recentes" ? ultimo(y) - ultimo(x) || valorDe(y) - valorDe(x) : valorDe(y) - valorDe(x) || y.totalEntidades - x.totalEntidades,
  );
  const maximo = Math.max(...lista.map(valorDe), 1);
  const maxPartido = porPartido[0]?.valor ?? 1;
  const total = lista.reduce((s, a) => s + valorDe(a), 0);

  const GRUPOS: { chave: Grupo; nome: string; n: number }[] = [
    { chave: "individuais", nome: "Deputados e senadores", n: autores.filter((a) => !a.coletiva && emendasPrefeitura(a).length).length },
    { chave: "coletivas", nome: "Sem autor individual", n: autores.filter((a) => a.coletiva && emendasPrefeitura(a).length).length },
    { chave: "vereadores", nome: "Vereadores de Osasco", n: vereadores.length },
    { chave: "entidades", nome: "Direto a entidades", n: entidades.length },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmentos
            rotulo="Quem"
            valor={grupo}
            aoEscolher={(g) => {
              setGrupo(g);
              if (g !== "individuais") setPartido(null);
            }}
            opcoes={GRUPOS.filter((g) => g.n > 0).map((g) => ({
              valor: g.chave,
              nome: (
                <>
                  {g.nome} <span className="tabular-nums text-slate-400">{g.n}</span>
                </>
              ),
            }))}
          />
          <label className={`flex items-center gap-1.5 text-xs text-slate-500 ${grupo === "entidades" ? "hidden" : ""}`}>
            Ordem
            <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800">
              <option value="valor">maior valor</option>
              <option value="emendas">mais emendas</option>
              <option value="recentes">mais recentes</option>
            </select>
          </label>
        </div>
        {partido && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            Só emendas de quando o autor era do {partidoLegivel(partido)}: {dinheiroCurto(total)}.
            <button type="button" onClick={() => setPartido(null)} className="font-medium text-blue-800 underline">
              Ver todos os partidos
            </button>
          </p>
        )}
        {grupo === "coletivas" && (
          <p className="mt-3 text-xs text-slate-500">Emendas de relator, de comissão ou de bancada: o registro oficial não diz qual parlamentar pediu cada uma.</p>
        )}
        {grupo === "entidades" && (
          <>
            <p className="mt-3 text-xs text-slate-500">
              Associações e institutos sediados em Osasco que receberam emenda federal direto. Esse dinheiro não passa pela Prefeitura e não entra nos
              valores das outras abas.
            </p>
            <ol className="mt-1 divide-y divide-slate-100">
              {entidades.map((x, k) => (
                <LinhaEntidade key={x.nome} x={x} maximo={entidades[0]?.total ?? 1} aoAbrir={abrir} indice={k} />
              ))}
            </ol>
          </>
        )}
        {grupo === "vereadores" && (
          <p className="mt-3 text-xs text-slate-500">
            Pagamentos da Prefeitura cujo histórico cita a emenda de um vereador (emenda impositiva ao orçamento da cidade). Só entra o que traz o nome do
            vereador no texto.
          </p>
        )}
        {base.length > VISIVEIS && grupo !== "entidades" && (
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou partido"
            aria-label="Buscar por nome ou partido"
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        )}
        <ol key={`${grupo}|${partido}|${ordem}`} className="mt-1 divide-y divide-slate-100">
          {(todosVisiveis || busca ? lista : lista.slice(0, VISIVEIS)).map((a, k) => (
            <LinhaAutor key={a.chave} a={a} maximo={maximo} partido={partido} aoAbrir={() => abrir(a)} indice={k} />
          ))}
        </ol>
        {!lista.length && grupo !== "entidades" && <p className="py-6 text-center text-sm text-slate-500">Nada encontrado.</p>}
        {!busca && lista.length > VISIVEIS && (
          <button
            type="button"
            onClick={() => setTodosVisiveis(!todosVisiveis)}
            className="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-blue-800 hover:bg-slate-50"
          >
            {todosVisiveis ? "Mostrar só os primeiros" : `Ver todos os ${lista.length}`}
          </button>
        )}
      </div>

      {grupo === "individuais" && porPartido.length > 0 && (
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-900">Por partido</div>
          <p className="mt-0.5 text-xs text-slate-500">Partido do autor quando a emenda foi apresentada. Toque para filtrar.</p>
          <ul className="mt-3 space-y-1">
            {(todosPartidos ? porPartido : porPartido.slice(0, VISIVEIS)).map((p) => (
              <li key={p.sigla}>
                <button
                  type="button"
                  onClick={() => setPartido(partido === p.sigla ? null : p.sigla)}
                  aria-pressed={partido === p.sigla}
                  className={`grid w-full grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition ${partido === p.sigla ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  <span className="truncate font-medium text-slate-800">{partidoLegivel(p.sigla)}</span>
                  <span className="relative h-2" aria-hidden>
                    <span className="barra-anim absolute inset-y-0 left-0 rounded transition-opacity" style={{ width: `${Math.max(1, (p.valor / maxPartido) * 100)}%`, background: "var(--grafico-1)", opacity: partido && partido !== p.sigla ? 0.35 : 1 }} />
                  </span>
                  <span className="tabular-nums text-slate-900">{dinheiroCurto(p.valor)}</span>
                </button>
              </li>
            ))}
          </ul>
          {porPartido.length > VISIVEIS && (
            <button type="button" onClick={() => setTodosPartidos(!todosPartidos)} className="mt-2 text-xs font-medium text-blue-800 underline">
              {todosPartidos ? "Mostrar só os maiores" : `Ver os ${porPartido.length} partidos`}
            </button>
          )}
        </aside>
      )}

      {montado && ficha && createPortal(<Ficha key={ficha.chave} a={ficha} aoFechar={fechar} />, document.body)}
    </div>
  );
}
