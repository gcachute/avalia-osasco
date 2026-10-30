"use client";

import { useId, useState } from "react";
import { Abre } from "@/components/movimento/Movimento";
import type { Conferencia, Parcial } from "@/lib/dinheiro";
import { dinheiroCurto, pct, reaisExato } from "@/lib/formato";
import { RolagemLateral } from "@/components/RolagemLateral";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function Seta({ aberto }: { aberto: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Variacao({ atual, anterior }: { atual: number; anterior: number | null }) {
  if (!anterior) return null;
  const v = atual / anterior - 1;
  const sobe = v >= 0;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ring-1 ${sobe ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"}`}>
      {sobe ? "+" : "−"}
      {pct(Math.abs(v))}
    </span>
  );
}

// ---------- Ano em andamento ----------

const GRUPOS: { chave: Parcial["linhas"][number]["grupo"]; nome: string; cor: string }[] = [
  { chave: "estado", nome: "Do Estado", cor: "var(--grafico-2)" },
  { chave: "uniao", nome: "Da União", cor: "var(--grafico-1)" },
  { chave: "fundeb", nome: "FUNDEB", cor: "var(--grafico-3)" },
  { chave: "outras", nome: "Outros repasses", cor: "var(--grafico-1)" },
  { chave: "retencao", nome: "Retido para o FUNDEB", cor: "var(--grafico-3)" },
  { chave: "propria", nome: "Da própria cidade", cor: "var(--grafico-outro)" },
];

function LinhaParcial({ l, ano, ateMes, cor }: { l: Parcial["linhas"][number]; ano: number; ateMes: number; cor: string }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const feito = l.previsao ? Math.min(1, l.atual / l.previsao) : null;
  return (
    <li>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-controls={id}
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${aberto ? "bg-slate-50" : "hover:bg-slate-50"}`}
      >
        <span className="min-w-0 text-slate-800">{l.nome}</span>
        <span className="font-semibold tabular-nums text-slate-900">{dinheiroCurto(l.atual)}</span>
        <Variacao atual={l.atual} anterior={l.anterior} />
        <Seta aberto={aberto} />
        {feito != null && (
          <span className="col-span-4 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <span className="barra-anim absolute inset-y-0 left-0 rounded-full" style={{ width: `${feito * 100}%`, background: cor }} />
            </span>
            <span className="shrink-0 tabular-nums">{pct(l.atual / l.previsao!)} do previsto para o ano</span>
          </span>
        )}
      </button>
      <Abre aberto={aberto} id={id}>
        <dl className="mt-1 mb-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-xl border border-slate-200 p-3 text-xs">
          <dt className="text-slate-500">
            Janeiro a {MESES[ateMes - 1]} de {ano}
          </dt>
          <dd className="tabular-nums text-slate-900">{reaisExato(l.atual)}</dd>
          {l.anterior != null && (
            <>
              <dt className="text-slate-500">
                Janeiro a {MESES[ateMes - 1]} de {ano - 1}
              </dt>
              <dd className="tabular-nums text-slate-900">{reaisExato(l.anterior)}</dd>
            </>
          )}
          {l.previsao != null && (
            <>
              <dt className="text-slate-500">Previsto no orçamento de {ano}</dt>
              <dd className="tabular-nums text-slate-900">{reaisExato(l.previsao)}</dd>
            </>
          )}
        </dl>
      </Abre>
    </li>
  );
}

export function AnoEmAndamento({ p }: { p: Parcial }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">
          {p.ano}, de janeiro a {MESES[p.ateMes - 1]}
        </div>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">ano em andamento</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Pelo último relatório bimestral da Prefeitura. A variação compara com os mesmos meses de {p.ano - 1}; a barra mostra quanto do valor previsto no orçamento
        do ano já entrou. ICMS, IPVA e FPM aparecem pelo valor bruto. Toque numa linha para ver os valores exatos.
      </p>
      <div className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {GRUPOS.map((g) => {
          const linhas = p.linhas.filter((l) => l.grupo === g.chave);
          if (!linhas.length) return null;
          return (
            <div key={g.chave}>
              <div className="mb-1 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ background: g.cor }} aria-hidden />
                {g.nome}
              </div>
              <ul className="space-y-0.5">
                {linhas.map((l) => (
                  <LinhaParcial key={l.chave} l={l} ano={p.ano} ateMes={p.ateMes} cor={g.cor} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        Fonte:{" "}
        <a href={p.fonte.url} className="underline">
          {p.fonte.nome}
        </a>
        . Os valores do ano fechado (com o detalhe de cada conta) entram quando a Prefeitura entrega a declaração anual.
      </p>
    </div>
  );
}

// ---------- Conferência dos números (dentro do detalhe de cada linha) ----------

const SELO = {
  igual: { texto: "igual", classe: "bg-emerald-50 text-emerald-800 ring-emerald-200", icone: "✓" },
  proximo: { texto: "próximo", classe: "bg-sky-50 text-sky-800 ring-sky-200", icone: "≈" },
  diferente: { texto: "diferente", classe: "bg-amber-50 text-amber-800 ring-amber-200", icone: "!" },
} as const;

// Nome curto de cada fonte de conferência, para as etiquetas.
const curta = (fonte: string) =>
  /bimestral/i.test(fonte) ? "relatório bimestral" : /Fazenda|Estado/i.test(fonte) ? "repasses do Estado" : /Transfer[eê]ncias do governo federal/i.test(fonte) ? "governo federal" : /Emendas recebidas/i.test(fonte) ? "lista de emendas da CGU" : fonte;

function TabelaConferencia({ c, destaque }: { c: Conferencia; destaque?: number }) {
  return (
    <div className="space-y-2">
      <RolagemLateral>
        <table className="w-full min-w-[28rem] text-left">
          <thead className="text-[11px] text-slate-500">
            <tr>
              <th className="py-1 pr-3 font-medium">Ano</th>
              <th className="py-1 pr-3 text-right font-medium">{c.fonteA}</th>
              <th className="py-1 pr-3 text-right font-medium">{c.fonteB}</th>
              <th className="py-1 text-right font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {c.anos.map((a) => (
              <tr key={a.ano} className={`align-top ${a.ano === destaque ? "bg-slate-50 font-medium" : ""}`}>
                <td className="py-1 pr-3">
                  <span className={`inline-flex items-center gap-1 rounded px-1 ring-1 ${SELO[a.situacao].classe}`}>
                    <span aria-hidden>{SELO[a.situacao].icone}</span>
                    {a.ano}
                  </span>
                </td>
                <td className="py-1 pr-3 text-right text-slate-900">{reaisExato(a.a)}</td>
                <td className="py-1 pr-3 text-right text-slate-900">{reaisExato(a.b)}</td>
                <td className="py-1 text-right text-slate-700">
                  {reaisExato(a.b - a.a)}
                  <span className="block text-[10px] text-slate-500">{a.a ? pct(Math.abs(a.b - a.a) / Math.abs(a.a)) : "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </RolagemLateral>
      {c.nota && <p className="text-slate-600">{c.nota}</p>}
      {c.anos
        .filter((a) => a.nota)
        .map((a) => (
          <p key={a.ano} className="rounded-lg bg-slate-50 px-2 py-1.5 text-slate-700">
            <b>{a.ano}:</b> {a.nota}
          </p>
        ))}
    </div>
  );
}

// Resumo da conferência do ano escolhido e, ao abrir, a tabela ano a ano com os valores exatos das duas fontes.
export function ConferirLinha({ conferencias, ano, titulo = "Conferido com outras fontes" }: { conferencias: Conferencia[]; ano?: number; titulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  if (!conferencias.length) return null;
  const doAno = conferencias.map((c) => ({ c, a: ano != null ? c.anos.find((x) => x.ano === ano) : undefined }));
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-700">{titulo}:</span>
        {doAno.map(({ c, a }) =>
          a ? (
            <span key={c.chave} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${SELO[a.situacao].classe}`}>
              <span aria-hidden>{SELO[a.situacao].icone}</span>
              {SELO[a.situacao].texto} {a.situacao === "diferente" ? "do" : "ao"} {curta(c.fonteB)}
            </span>
          ) : ano != null ? (
            <span key={c.chave} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              sem dado do {curta(c.fonteB)} em {ano}
            </span>
          ) : null,
        )}
        <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} aria-controls={id} className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-blue-800">
          {aberto ? "Esconder" : "Ver a conferência ano a ano"}
          <Seta aberto={aberto} />
        </button>
      </div>
      <Abre aberto={aberto} id={id}>
        <div className="mt-2 space-y-3 text-xs">
          {conferencias.map((c) => (
            <div key={c.chave}>
              <div className="mb-1 font-medium text-slate-900">
                {c.nome}: {c.fonteA} × {c.fonteB}
              </div>
              <TabelaConferencia c={c} destaque={ano} />
            </div>
          ))}
          <p className="text-[11px] text-slate-500">
            Igual: diferença de até 0,1%. Próximo: até 3%, em geral por mês de lançamento ou restituições. Diferente: acima disso, com a explicação quando foi
            conferida numa terceira fonte.
          </p>
        </div>
      </Abre>
    </div>
  );
}
