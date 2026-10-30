"use client";

import { useState } from "react";
import type { EntradaAno, GastoAno, ResumoGasto } from "@/lib/dinheiro";
import { dinheiroCurto } from "@/lib/formato";

// Seletor de ano em botões, do mais recente para o mais antigo.
function Anos({ anos, ano, setAno, rotulo }: { anos: number[]; ano: number; setAno: (a: number) => void; rotulo: (a: number) => string }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Ano">
      {anos.map((a) => (
        <button
          key={a}
          onClick={() => setAno(a)}
          aria-pressed={a === ano}
          className={`rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition ${a === ano ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          {rotulo(a)}
        </button>
      ))}
    </div>
  );
}

// Linha de barra horizontal: nome, etiqueta opcional, barra proporcional ao maior valor do bloco e o valor.
function Linha({ nome, etiqueta, valor, maximo, cor, detalhe }: { nome: string; etiqueta?: string; valor: number; maximo: number; cor: string; detalhe?: string }) {
  return (
    <li className="grid grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 text-sm max-sm:grid-cols-[minmax(0,1fr)_auto]">
      <span className="min-w-0">
        <span className="block text-slate-800">{nome}</span>
        {(etiqueta || detalhe) && <span className="block text-[11px] text-slate-500">{[etiqueta, detalhe].filter(Boolean).join(" · ")}</span>}
      </span>
      <span className="relative h-3 max-sm:order-3 max-sm:col-span-2" aria-hidden>
        <span className="absolute inset-0 rounded bg-slate-100" />
        <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${maximo ? Math.max(0.5, (valor / maximo) * 100) : 0}%`, background: cor }} />
      </span>
      <span className="text-right font-semibold tabular-nums text-slate-900">{dinheiroCurto(valor)}</span>
    </li>
  );
}

const OBRIGATORIO = "obrigatório, por lei";
const PROGRAMA = "por programa, segue regras do ministério";
const VOLUNTARIO = "voluntário, depende de acordo";

export function ComposicaoEntradas({ anos }: { anos: EntradaAno[] }) {
  const lista = [...anos].sort((a, b) => b.ano - a.ano);
  const [ano, setAno] = useState(lista[0].ano);
  const e = lista.find((x) => x.ano === ano)!;
  const linhasUniao = [
    { nome: "Fundo de Participação dos Municípios (FPM)", etiqueta: OBRIGATORIO, valor: e.uniao.fpm },
    { nome: "Saúde (SUS)", etiqueta: PROGRAMA, valor: e.uniao.sus },
    { nome: "Educação (FNDE, merenda, salário-educação)", etiqueta: PROGRAMA, valor: e.uniao.educacao },
    { nome: "Assistência social", etiqueta: PROGRAMA, valor: e.uniao.assistencia },
    { nome: "Convênios", etiqueta: VOLUNTARIO, valor: e.uniao.convenios },
    { nome: "Outras", valor: e.uniao.outras },
  ];
  const linhasEstado = [
    { nome: "ICMS (parte do imposto estadual)", etiqueta: OBRIGATORIO, valor: e.estado.icms },
    { nome: "IPVA (metade do imposto dos veículos)", etiqueta: OBRIGATORIO, valor: e.estado.ipva },
    { nome: "Saúde (SUS)", etiqueta: PROGRAMA, valor: e.estado.sus },
    { nome: "Convênios", etiqueta: VOLUNTARIO, valor: e.estado.convenios },
    { nome: "Outras", valor: e.estado.outras },
  ];
  const maximo = Math.max(...linhasUniao.map((l) => l.valor), ...linhasEstado.map((l) => l.valor), e.fundeb);
  const bloco = (titulo: string, total: number, cor: string, linhas: { nome: string; etiqueta?: string; valor: number }[]) => (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{dinheiroCurto(total)}</span>
      </div>
      <ul className="space-y-2.5">
        {linhas
          .filter((l) => l.valor > 0)
          .map((l) => (
            <Linha key={l.nome} {...l} maximo={maximo} cor={cor} />
          ))}
      </ul>
    </div>
  );
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4">
      <Anos anos={lista.map((x) => x.ano)} ano={ano} setAno={setAno} rotulo={String} />
      {bloco("Da União", e.uniao.total, "var(--grafico-1)", linhasUniao)}
      {bloco("Do Estado de São Paulo", e.estado.total, "var(--grafico-2)", linhasEstado)}
      {e.fundeb > 0 &&
        bloco("FUNDEB", e.fundeb, "var(--grafico-3)", [{ nome: "Fundo da educação básica", etiqueta: "obrigatório, conforme o número de alunos", valor: e.fundeb }])}
    </div>
  );
}

function BlocoGasto({ titulo, g, cor }: { titulo: string; g: ResumoGasto; cor: string }) {
  const funcoes = g.funcoes.slice(0, 6);
  const maxF = Math.max(...funcoes.map((f) => f.valor));
  const forn = g.fornecedores.slice(0, 10);
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{dinheiroCurto(g.total)}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{g.quantidadeFornecedores.toLocaleString("pt-BR")} fornecedores e entidades receberam</p>
      <div className="mt-3 text-xs font-medium text-slate-900">Por área</div>
      <ul className="mt-2 space-y-2">
        {funcoes.map((f) => (
          <Linha key={f.nome} nome={f.nome.charAt(0) + f.nome.slice(1).toLowerCase()} valor={f.valor} maximo={maxF} cor={cor} />
        ))}
      </ul>
      <div className="mt-4 text-xs font-medium text-slate-900">Quem mais recebeu</div>
      <ol className="mt-2 divide-y divide-slate-100 text-sm">
        {forn.map((f) => (
          <li key={f.cnpj} className="flex items-baseline gap-3 py-1.5">
            <span className="min-w-0 flex-1">
              <span className="block text-slate-800">{f.nome}</span>
              {f.cnpj === "folha" ? (
                <span className="block text-[11px] text-slate-500">professores e outros servidores pagos com este dinheiro</span>
              ) : (
                f.principal && <span className="block text-[11px] text-slate-500">{f.principal.charAt(0) + f.principal.slice(1).toLowerCase()}</span>
              )}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(f.valor)}</span>
          </li>
        ))}
      </ol>
      {g.pessoasFisicas > 0 && <p className="mt-2 text-[11px] text-slate-500">Pagamentos a pessoas físicas ({dinheiroCurto(g.pessoasFisicas)}) entram só no total, sem nomes.</p>}
    </div>
  );
}

const MESES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function GastosPorAno({ gastos }: { gastos: GastoAno[] }) {
  const lista = [...gastos].sort((a, b) => b.ano - a.ano);
  const [ano, setAno] = useState(lista.find((g) => g.ultimoMes === 12)?.ano ?? lista[0].ano);
  const g = lista.find((x) => x.ano === ano)!;
  const emendas = [
    { titulo: "Pago com emendas federais", e: g.emendasFederais },
    { titulo: "Pago com emendas estaduais", e: g.emendasEstaduais },
    { titulo: "Pago com a fonte “emendas individuais”", e: g.emendasVereadores },
  ].filter((x) => x.e && x.e.total > 0);
  return (
    <div className="space-y-4">
      <Anos anos={lista.map((x) => x.ano)} ano={ano} setAno={setAno} rotulo={(a) => (lista.find((x) => x.ano === a)!.ultimoMes < 12 ? `${a} (até ${MESES[lista.find((x) => x.ano === a)!.ultimoMes].slice(0, 3)})` : String(a))} />
      {g.ultimoMes < 12 && <p className="text-xs text-slate-500">Ano em andamento: pagamentos até {MESES[g.ultimoMes]}.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {g.federal && <BlocoGasto titulo="Pago com dinheiro federal" g={g.federal} cor="var(--grafico-1)" />}
        {g.estadual && <BlocoGasto titulo="Pago com dinheiro estadual (quase todo do FUNDEB)" g={g.estadual} cor="var(--grafico-2)" />}
      </div>
      {emendas.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-900">Quem recebeu o dinheiro das emendas</div>
          <p className="mt-0.5 text-xs text-slate-500">
            A Prefeitura marca com um código próprio o que paga com dinheiro de emendas federais e estaduais, e usa uma fonte chamada “emendas parlamentares
            individuais” (em parte, emendas de vereadores; quando o histórico cita o vereador, ele aparece na aba Vereadores de Osasco). Aqui está quem
            recebeu esse dinheiro em {ano}.
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {emendas.map(({ titulo, e }) => (
              <div key={titulo} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{dinheiroCurto(e!.total)}</span>
                </div>
                <ol className="mt-1.5 divide-y divide-slate-100 text-sm">
                  {e!.fornecedores.slice(0, 6).map((f) => (
                    <li key={f.cnpj} className="flex items-baseline gap-3 py-1.5">
                      <span className="min-w-0 flex-1 text-slate-800">{f.nome}</span>
                      <span className="shrink-0 tabular-nums text-slate-700">{dinheiroCurto(f.valor)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
