"use client";

import { useState } from "react";
import { Abre } from "@/components/movimento/Movimento";
import { nomeProprio, type Integridade, type Modalidades } from "@/lib/dinheiro";
import { dinheiroCurto, listaBR, pct, reaisExato } from "@/lib/formato";

const PARTES: { chave: "licitacao" | "dispensa" | "inexigivel"; nome: string; explica: string; cor: string }[] = [
  { chave: "licitacao", nome: "Licitação", explica: "Disputa aberta: várias empresas concorrem e vence a melhor proposta.", cor: "var(--grafico-1)" },
  { chave: "dispensa", nome: "Dispensa de licitação", explica: "Sem disputa, nos casos que a lei permite, como valores pequenos e emergências.", cor: "var(--grafico-2)" },
  { chave: "inexigivel", nome: "Inexigível", explica: "Sem disputa porque não há com quem concorrer, como um fornecedor único.", cor: "var(--grafico-4)" },
];

const VAZIO: Modalidades = { licitacao: 0, dispensa: 0, inexigivel: 0, semContratacao: 0, total: 0 };

// Salários e repasses não são compras: ficam fora da conta, senão a parte sem licitação pareceria menor do que é.
const compras = (m: Modalidades) => m.total - m.semContratacao;
export const parteSemLicitacao = (m: Modalidades) => (m.dispensa + m.inexigivel) / Math.max(1, compras(m));
export const somaModalidades = (lista: Modalidades[]) =>
  lista.reduce(
    (a, m) => ({
      licitacao: a.licitacao + m.licitacao,
      dispensa: a.dispensa + m.dispensa,
      inexigivel: a.inexigivel + m.inexigivel,
      semContratacao: a.semContratacao + m.semContratacao,
      total: a.total + m.total,
    }),
    VAZIO,
  );

function Barra({ m, alta }: { m: Modalidades; alta?: boolean }) {
  const presentes = PARTES.filter((p) => m[p.chave] > 0);
  return (
    <span className={`flex overflow-hidden rounded ${alta ? "h-4" : "h-2.5"}`} role="img" aria-label={presentes.map((p) => `${p.nome}: ${pct(m[p.chave] / compras(m))}`).join("; ")}>
      {presentes.map((p) => (
        <span
          key={p.chave}
          title={`${p.nome}: ${pct(m[p.chave] / compras(m))}, ${dinheiroCurto(m[p.chave])}`}
          style={{ width: `${(m[p.chave] / compras(m)) * 100}%`, background: p.cor }}
          className="barra-anim border-r-2 border-white last:border-r-0"
        />
      ))}
    </span>
  );
}

function LinhaAno({ ano, emendas, todos }: { ano: number; emendas: Modalidades; todos: Modalidades }) {
  const [aberto, setAberto] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="flex w-full items-start gap-2 rounded-md py-1.5 text-left transition-colors hover:bg-slate-50">
        <span className="w-10 shrink-0 text-xs font-medium tabular-nums text-slate-900">{ano}</span>
        <span className="min-w-0 flex-1 pt-0.5">
          <Barra m={emendas} />
          <span className="mt-0.5 block text-[11px] text-slate-500">
            {dinheiroCurto(compras(emendas))} em compras · {pct(parteSemLicitacao(emendas))} sem licitação
          </span>
        </span>
        <svg viewBox="0 0 20 20" className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Abre aberto={aberto}>
        <div className="mb-2 rounded-md bg-slate-50 p-2 text-xs">
          <ul className="space-y-0.5">
            {PARTES.map((p) => (
              <li key={p.chave} className="flex items-baseline gap-2">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: p.cor }} aria-hidden />
                <span className="min-w-0 flex-1 text-slate-700">{p.nome}</span>
                <span className="shrink-0 tabular-nums text-slate-900">{reaisExato(emendas[p.chave])}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-slate-500">
            {emendas.semContratacao > 0 && `Fora da conta: ${reaisExato(emendas.semContratacao)} de salários e repasses, que não são compras. `}
            Em todas as verbas de fora de {ano}, {pct(parteSemLicitacao(todos))} das compras foram sem licitação.
          </p>
        </div>
      </Abre>
    </li>
  );
}

export function Contratacoes({ i }: { i: Integridade }) {
  const comEmendas = i.modalidades.filter((m) => compras(m.emendas) > 0);
  const soma = somaModalidades(comEmendas.map((m) => m.emendas));
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 text-xs font-medium text-slate-900">
          Todas as compras com emenda desde {comEmendas[0].ano}: {dinheiroCurto(compras(soma))}
        </div>
        <Barra m={soma} alta />
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {PARTES.map((p) => (
            <li key={p.chave} className="rounded-lg bg-slate-50 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: p.cor }} aria-hidden />
                {p.nome}
              </div>
              <div className="mt-0.5 tabular-nums text-slate-900">
                <span className="text-base font-semibold">{pct(soma[p.chave] / compras(soma))}</span> · {dinheiroCurto(soma[p.chave])}
              </div>
              <p className="mt-0.5 text-slate-600">{p.explica}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-900">Ano a ano</div>
        <p className="text-[11px] text-slate-500">Cada barra é o total de compras do ano. Abra um ano para ver os valores exatos.</p>
        <ul className="mt-1">
          {comEmendas
            .slice()
            .reverse()
            .map((m) => (
              <LinhaAno key={m.ano} ano={m.ano} emendas={m.emendas} todos={m.todos} />
            ))}
        </ul>
      </div>

      {i.dispensasEmendas.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-900">Quem mais recebeu dinheiro de emenda sem licitação</div>
          <ul className="mt-1 divide-y divide-slate-100 text-xs">
            {i.dispensasEmendas.map((d) => (
              <li key={d.fornecedor} className="flex items-baseline gap-3 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-slate-800">{nomeProprio(d.fornecedor)}</span>
                  <span className="block text-[11px] text-slate-500">
                    {d.modalidade}, {listaBR(d.anos)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-900">{reaisExato(d.valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500">Comprar sem licitação não é irregular por si. Compras pela bolsa eletrônica do Estado contam como licitação.</p>
    </div>
  );
}
