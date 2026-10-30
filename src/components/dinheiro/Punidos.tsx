"use client";

import { useState } from "react";
import { Abre } from "@/components/movimento/Movimento";
import { frase, nomeProprio, type Integridade, type Punicao } from "@/lib/dinheiro";
import { dataBR, dinheiroCurto, listaBR, reaisExato } from "@/lib/formato";

type Punido = Integridade["punidos"][number];
type Alcance = "pago" | "vale" | "outros";
type Tipo = "contratar" | "suspensao" | "inidonea" | "multa" | "contas";

const ALCANCES: { chave: Alcance; nome: string; selo: string }[] = [
  { chave: "pago", nome: "pagas durante uma punição que vale para Osasco", selo: "Paga durante a punição" },
  { chave: "vale", nome: "com punição que vale para Osasco, sem pagamento no período", selo: "Vale para Osasco" },
  { chave: "outros", nome: "punidas por outros órgãos, sem alcance em Osasco", selo: "Não alcança Osasco" },
];

const TIPOS: { chave: Tipo; nome: string }[] = [
  { chave: "contratar", nome: "Proibida de contratar" },
  { chave: "suspensao", nome: "Suspensão" },
  { chave: "inidonea", nome: "Inidônea" },
  { chave: "multa", nome: "Multa" },
  { chave: "contas", nome: "Repasses federais" },
];

const VISIVEIS = 8;

const alcanceDe = (p: Punido): Alcance =>
  p.punicoes.some((s) => s.valeParaOsasco && s.pagoDurante > 0) ? "pago" : p.punicoes.some((s) => s.valeParaOsasco) ? "vale" : "outros";

const tipoDe = (s: Punicao): Tipo =>
  s.lista === "CEPIM" ? "contas" : /Inidoneidade/i.test(s.categoria) ? "inidonea" : /Suspens/i.test(s.categoria) ? "suspensao" : /Multa|Publica/i.test(s.categoria) ? "multa" : "contratar";

const tiposDe = (p: Punido) => TIPOS.filter((t) => p.punicoes.some((s) => tipoDe(s) === t.chave));

const semAcento = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const consequencia = (s: Punicao) =>
  s.lista === "CEPIM"
    ? "Impede a entidade de receber repasses do governo federal."
    : s.valeParaOsasco
      ? s.pagoDurante > 0
        ? `Vale para Osasco; ${dinheiroCurto(s.pagoDurante)} foram pagos no período da punição.`
        : "Vale para Osasco; nenhum pagamento com verbas de fora no período da punição."
      : /Multa|Publica/i.test(s.categoria)
        ? "Multa, sem proibição de contratar."
        : "Só vale para o órgão que puniu ou para o governo dele.";

function Linha({ p }: { p: Punido }) {
  const [aberto, setAberto] = useState(false);
  const alcance = ALCANCES.find((a) => a.chave === alcanceDe(p))!;
  const punicoes = [...p.punicoes].sort((a, b) => Number(b.valeParaOsasco) - Number(a.valeParaOsasco));
  return (
    <li className="rounded-lg bg-slate-50">
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="flex w-full items-start gap-2 rounded-lg p-3 text-left transition-colors hover:bg-slate-100">
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-slate-900">{nomeProprio(p.nome)}</span>
          <span className="mt-1 flex flex-wrap gap-1 text-[11px]">
            <span className={`rounded-full px-1.5 font-medium ${alcance.chave === "outros" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>{alcance.selo}</span>
            {tiposDe(p).map((t) => (
              <span key={t.chave} className="rounded-full bg-white px-1.5 text-slate-700 ring-1 ring-slate-200">
                {t.nome}
              </span>
            ))}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            Recebeu em {listaBR(p.anos)}
            {p.deEmenda > 0 && `, com ${dinheiroCurto(p.deEmenda)} de emendas`}
            {p.punicoes.length > 1 && ` · ${p.punicoes.length} punições`}
          </span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(p.recebeu)}</span>
        <svg viewBox="0 0 20 20" className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Abre aberto={aberto}>
        <div className="space-y-2 px-3 pb-3 text-xs">
          <p className="tabular-nums text-slate-600">
            Valor exato recebido: {reaisExato(p.recebeu)}
            {p.deEmenda > 0 && `, sendo ${reaisExato(p.deEmenda)} de emendas`}.
          </p>
          <ul className="space-y-1.5">
            {punicoes.map((s, k) => (
              <li key={k} className="rounded-md bg-white p-2 ring-1 ring-slate-200">
                <div className="font-medium text-slate-800">{frase(s.categoria)}</div>
                <div className="text-slate-500">
                  {s.inicio && `Desde ${dataBR(s.inicio)}`}
                  {s.fim && ` até ${dataBR(s.fim)}`}
                  {s.inicio ? ", aplicada por " : "Aplicada por "}
                  {nomeProprio(s.orgao)}
                  {s.outraUnidade && " (a outra unidade da mesma empresa)"}.
                </div>
                <div className={s.valeParaOsasco ? "text-amber-800" : "text-slate-500"}>{consequencia(s)}</div>
              </li>
            ))}
          </ul>
        </div>
      </Abre>
    </li>
  );
}

function Chip({ ativo, desligado, aoClicar, children }: { ativo: boolean; desligado?: boolean; aoClicar: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      disabled={desligado}
      onClick={aoClicar}
      className={`rounded-full px-2 py-0.5 text-xs ring-1 transition ${ativo ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-700 ring-slate-200 enabled:hover:ring-slate-300 disabled:opacity-40"}`}
    >
      {children}
    </button>
  );
}

// Quadros de cima e etiquetas filtram juntos; cada contagem já leva em conta os outros filtros.
export function ListaPunidos({ punidos }: { punidos: Integridade["punidos"] }) {
  const [alcance, setAlcance] = useState<Alcance | null>(null);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [soEmenda, setSoEmenda] = useState(false);
  const [busca, setBusca] = useState("");
  const [todos, setTodos] = useState(false);

  const termo = semAcento(busca.trim());
  const base = (p: Punido) => (!soEmenda || p.deEmenda > 0) && (!termo || semAcento(p.nome).includes(termo));
  const temTipo = (p: Punido, t: Tipo | null) => !t || p.punicoes.some((s) => tipoDe(s) === t);
  const temAlcance = (p: Punido, a: Alcance | null) => !a || alcanceDe(p) === a;

  const ordenados = [...punidos].sort((a, b) => b.recebeu - a.recebeu);
  const lista = ordenados.filter((p) => base(p) && temTipo(p, tipo) && temAlcance(p, alcance));
  const soma = lista.reduce((s, p) => s + p.recebeu, 0);
  const visiveis = todos ? lista : lista.slice(0, VISIVEIS);
  const filtrado = alcance || tipo || soEmenda || termo;

  const muda = <T,>(definir: (v: T) => void, valor: T) => {
    definir(valor);
    setTodos(false);
  };
  const limpar = () => {
    setAlcance(null);
    setTipo(null);
    setSoEmenda(false);
    setBusca("");
    setTodos(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {ALCANCES.map((a) => {
          const n = ordenados.filter((p) => base(p) && temTipo(p, tipo) && temAlcance(p, a.chave)).length;
          const ativo = alcance === a.chave;
          return (
            <button
              key={a.chave}
              type="button"
              aria-pressed={ativo}
              disabled={n === 0 && !ativo}
              onClick={() => muda(setAlcance, ativo ? null : a.chave)}
              className={`flex items-baseline gap-2 rounded-lg p-2.5 text-left ring-1 transition sm:block ${ativo ? "bg-white ring-2 ring-slate-800" : "bg-slate-50 ring-slate-200 enabled:hover:ring-slate-300"}`}
            >
              <span className={`text-xl font-semibold tabular-nums ${n === 0 ? "text-emerald-700" : a.chave === "outros" ? "text-slate-900" : "text-amber-800"}`}>{n}</span>
              <span className="text-xs leading-snug text-slate-600 sm:mt-0.5 sm:block">{a.nome}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo de punição">
          {TIPOS.map((t) => {
            const n = ordenados.filter((p) => base(p) && temAlcance(p, alcance) && temTipo(p, t.chave)).length;
            const ativo = tipo === t.chave;
            return (
              <Chip key={t.chave} ativo={ativo} desligado={n === 0 && !ativo} aoClicar={() => muda(setTipo, ativo ? null : t.chave)}>
                {t.nome} <span className="tabular-nums opacity-70">{n}</span>
              </Chip>
            );
          })}
          <Chip ativo={soEmenda} aoClicar={() => muda(setSoEmenda, !soEmenda)}>
            Receberam emenda
          </Chip>
        </div>
        <input
          type="search"
          value={busca}
          onChange={(e) => muda(setBusca, e.target.value)}
          placeholder="Buscar pelo nome"
          aria-label="Buscar pelo nome da empresa ou entidade"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <p className="text-xs text-slate-500" aria-live="polite">
        {lista.length === 1 ? "1 empresa ou entidade" : `${lista.length} empresas e entidades`}, da que mais recebeu para a que menos recebeu
        {lista.length > 0 && <>, somando {dinheiroCurto(soma)} em verbas de fora</>}.
        {filtrado && (
          <>
            {" "}
            <button type="button" onClick={limpar} className="font-medium text-blue-800 underline">
              Limpar filtros
            </button>
          </>
        )}
      </p>

      {lista.length > 0 ? (
        <ul className="space-y-2">
          {visiveis.map((p) => (
            <Linha key={p.cnpj} p={p} />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-slate-500">Nada encontrado com esses filtros.</p>
      )}
      {!todos && lista.length > VISIVEIS && (
        <button type="button" onClick={() => setTodos(true)} className="w-full rounded-lg py-2 text-sm font-medium text-blue-800 ring-1 ring-slate-200 transition hover:bg-slate-50">
          Ver mais {lista.length - VISIVEIS}
        </button>
      )}
    </div>
  );
}
