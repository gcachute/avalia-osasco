"use client";

import { useId, useState } from "react";
import { Abre, Segmentos } from "@/components/movimento/Movimento";
import type { ContaDCA, EntradaAno, GastoAno, ResumoGasto } from "@/lib/dinheiro";
import { dinheiroCurto, pct } from "@/lib/formato";

// Seletor de ano, do mais recente para o mais antigo, com o destaque que desliza.
function Anos({ anos, ano, setAno, rotulo }: { anos: number[]; ano: number; setAno: (a: number) => void; rotulo: (a: number) => string }) {
  return <Segmentos rotulo="Ano" valor={ano} aoEscolher={setAno} opcoes={anos.map((a) => ({ valor: a, nome: rotulo(a) }))} />;
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
        <span className="barra-anim absolute inset-y-0 left-0 rounded" style={{ width: `${maximo ? Math.max(0.5, (valor / maximo) * 100) : 0}%`, background: cor }} />
      </span>
      <span className="text-right font-semibold tabular-nums text-slate-900">{dinheiroCurto(valor)}</span>
    </li>
  );
}

const OBRIGATORIO = "obrigatório, por lei";
const PROGRAMA = "por programa, segue regras do ministério";
const VOLUNTARIO = "voluntário, depende de acordo";

// Uma linha do quadro de entradas, com o que ela é, a série de todos os anos e as contas oficiais que a formam.
type LinhaEntrada = {
  chave: string;
  nome: string;
  etiqueta?: string;
  explica: string;
  valor: (e: EntradaAno) => number;
  contas: (e: EntradaAno) => ContaDCA[];
};

const UNIAO: LinhaEntrada[] = [
  {
    chave: "fpm",
    nome: "Fundo de Participação dos Municípios (FPM)",
    etiqueta: OBRIGATORIO,
    explica: "Parte do Imposto de Renda e do IPI que a União divide entre todas as cidades, conforme a população. Chega a cada dez dias e pode ser usada em qualquer área.",
    valor: (e) => e.uniao.fpm,
    contas: (e) => e.uniao.contas.fpm ?? [],
  },
  {
    chave: "sus",
    nome: "Saúde (SUS)",
    etiqueta: PROGRAMA,
    explica: "Repasses do Fundo Nacional de Saúde para o Fundo Municipal de Saúde: manutenção de postos, hospitais e programas. Boa parte das emendas federais de saúde chega por aqui.",
    valor: (e) => e.uniao.sus,
    contas: (e) => e.uniao.contas.sus ?? [],
  },
  {
    chave: "educacao",
    nome: "Educação (FNDE, merenda, salário-educação)",
    etiqueta: PROGRAMA,
    explica: "Salário-educação (contribuição das empresas, dividida pelo número de alunos) e programas do FNDE, como a merenda escolar.",
    valor: (e) => e.uniao.educacao,
    contas: (e) => e.uniao.contas.educacao ?? [],
  },
  {
    chave: "assistencia",
    nome: "Assistência social",
    etiqueta: PROGRAMA,
    explica: "Repasses do Fundo Nacional de Assistência Social para os centros de referência (CRAS e CREAS) e os serviços de acolhimento.",
    valor: (e) => e.uniao.assistencia,
    contas: (e) => e.uniao.contas.assistencia ?? [],
  },
  {
    chave: "convenios",
    nome: "Convênios",
    etiqueta: VOLUNTARIO,
    explica: "Dinheiro de um acordo assinado com um órgão federal para uma obra ou um projeto, com prestação de contas.",
    valor: (e) => e.uniao.convenios,
    contas: (e) => e.uniao.contas.convenios ?? [],
  },
  {
    chave: "outras",
    nome: "Outras",
    explica: "Repasses federais que não entram nas linhas acima. As contas abaixo dizem o que são.",
    valor: (e) => e.uniao.outras,
    contas: (e) => e.uniao.contas.outras ?? [],
  },
];

const ESTADO: LinhaEntrada[] = [
  {
    chave: "icms",
    nome: "ICMS (parte do imposto estadual)",
    etiqueta: OBRIGATORIO,
    explica: "Um quarto do ICMS arrecadado pelo Estado pertence às cidades. A parte de cada uma depende principalmente do movimento econômico gerado nela.",
    valor: (e) => e.estado.icms,
    contas: (e) => e.estado.contas.icms ?? [],
  },
  {
    chave: "ipva",
    nome: "IPVA (metade do imposto dos veículos)",
    etiqueta: OBRIGATORIO,
    explica: "Metade do IPVA dos veículos registrados em Osasco fica com a cidade.",
    valor: (e) => e.estado.ipva,
    contas: (e) => e.estado.contas.ipva ?? [],
  },
  {
    chave: "sus",
    nome: "Saúde (SUS)",
    etiqueta: PROGRAMA,
    explica: "Repasses do Estado para a saúde da cidade.",
    valor: (e) => e.estado.sus,
    contas: (e) => e.estado.contas.sus ?? [],
  },
  {
    chave: "convenios",
    nome: "Convênios",
    etiqueta: VOLUNTARIO,
    explica: "Dinheiro de um acordo assinado com uma secretaria estadual para uma obra ou um projeto.",
    valor: (e) => e.estado.convenios,
    contas: (e) => e.estado.contas.convenios ?? [],
  },
  {
    chave: "outras",
    nome: "Outras",
    explica: "Repasses estaduais que não entram nas linhas acima. As contas abaixo dizem o que são.",
    valor: (e) => e.estado.outras,
    contas: (e) => e.estado.contas.outras ?? [],
  },
];

const FUNDEB: LinhaEntrada[] = [
  {
    chave: "fundeb",
    nome: "Fundo da educação básica",
    etiqueta: "obrigatório, conforme o número de alunos",
    explica:
      "O FUNDEB junta parte dos impostos do Estado e das cidades (com um complemento da União) e devolve conforme o número de alunos da rede municipal. Pelo menos 70% vai para os salários dos profissionais da educação.",
    valor: (e) => e.fundeb,
    contas: (e) => e.contasFundeb ?? [],
  },
];

function Variacao({ atual, antes, anoAntes }: { atual: number; antes: number | null; anoAntes: number }) {
  if (!antes) return null;
  const v = atual / antes - 1;
  const sobe = v >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${sobe ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"}`}>
      <svg viewBox="0 0 12 12" className={`h-3 w-3 ${sobe ? "" : "rotate-180"}`} aria-hidden>
        <path d="M6 2.5 10 8H2l4-5.5Z" fill="currentColor" />
      </svg>
      {sobe ? "+" : "−"}
      {pct(Math.abs(v))} em relação a {anoAntes}
    </span>
  );
}

function EntradaExpansivel({
  l,
  lista,
  ano,
  setAno,
  total,
  nomeTotal,
  maximo,
  cor,
  indice,
}: {
  l: LinhaEntrada;
  lista: EntradaAno[];
  ano: number;
  setAno: (a: number) => void;
  total: number;
  nomeTotal: string;
  maximo: number;
  cor: string;
  indice: number;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const e = lista.find((x) => x.ano === ano)!;
  const antes = lista.find((x) => x.ano === ano - 1);
  const valor = l.valor(e);
  const serie = [...lista].sort((a, b) => a.ano - b.ano).map((x) => ({ ano: x.ano, v: l.valor(x) }));
  const maxSerie = Math.max(...serie.map((s) => s.v), 1);
  const contas = l.contas(e);
  return (
    <li className="entra" style={{ "--i": indice } as React.CSSProperties}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-controls={id}
        className={`-mx-2 grid w-[calc(100%+1rem)] grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-0.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors max-sm:grid-cols-[minmax(0,1fr)_auto_auto] ${aberto ? "bg-slate-50" : "hover:bg-slate-50"}`}
      >
        <span className="min-w-0">
          <span className="block text-slate-800">{l.nome}</span>
          {l.etiqueta && <span className="block text-[11px] text-slate-500">{l.etiqueta}</span>}
        </span>
        <span className="relative h-3 max-sm:order-4 max-sm:col-span-3" aria-hidden>
          <span className="absolute inset-0 rounded bg-slate-100" />
          <span className="barra-anim absolute inset-y-0 left-0 rounded" style={{ width: `${maximo ? Math.max(0.5, (valor / maximo) * 100) : 0}%`, background: cor }} />
        </span>
        <span className="text-right font-semibold tabular-nums text-slate-900">{dinheiroCurto(valor)}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Abre aberto={aberto} id={id}>
        <div className="mt-1 mb-2 space-y-3 rounded-xl border border-slate-200 p-3 text-xs">
          <p className="text-slate-600">{l.explica}</p>
          <div className="flex flex-wrap items-center gap-2">
            {total > 0 && l.chave !== "fundeb" && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                {pct(valor / total)} {nomeTotal} em {ano}
              </span>
            )}
            {antes && <Variacao atual={valor} antes={l.valor(antes)} anoAntes={antes.ano} />}
          </div>

          <div>
            <div className="font-medium text-slate-900">Ano a ano</div>
            <div className="mt-2 flex h-20 items-end gap-1.5" role="group" aria-label={`${l.nome}, ano a ano`}>
              {serie.map((s) => (
                <button
                  key={s.ano}
                  type="button"
                  onClick={() => setAno(s.ano)}
                  title={`${s.ano}: ${dinheiroCurto(s.v)}`}
                  aria-label={`${s.ano}: ${dinheiroCurto(s.v)}`}
                  aria-pressed={s.ano === ano}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span
                    className="w-full max-w-8 rounded-t transition-[height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
                    style={{ height: `${Math.max(3, (s.v / maxSerie) * 100)}%`, background: cor, opacity: s.ano === ano ? 1 : 0.35 }}
                  />
                  <span className={`text-[10px] tabular-nums ${s.ano === ano ? "font-semibold text-slate-900" : "text-slate-500"}`}>{String(s.ano).slice(2)}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Toque numa barra para ver aquele ano. Valores sem correção pela inflação.</p>
          </div>

          {contas.length > 0 && !(contas.length === 1 && l.chave === "fundeb") && (
            <div>
              <div className="font-medium text-slate-900">Contas da declaração anual de {ano}</div>
              <ul className="mt-1 divide-y divide-slate-100">
                {contas.map((c, i) => (
                  <li key={i} className="flex items-baseline gap-3 py-1">
                    <span className="min-w-0 flex-1 text-slate-700">{c.conta}</span>
                    <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(c.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Abre>
    </li>
  );
}

export function ComposicaoEntradas({ anos }: { anos: EntradaAno[] }) {
  const lista = [...anos].sort((a, b) => b.ano - a.ano);
  const [ano, setAno] = useState(lista[0].ano);
  const e = lista.find((x) => x.ano === ano)!;
  const maximo = Math.max(...UNIAO.map((l) => l.valor(e)), ...ESTADO.map((l) => l.valor(e)), e.fundeb);
  const totalGeral = e.uniao.total + e.estado.total + e.fundeb;
  const bloco = (titulo: string, total: number, cor: string, linhas: LinhaEntrada[], nomeTotal: string) => (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ background: cor }} aria-hidden />
          {titulo}
        </span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{dinheiroCurto(total)}</span>
      </div>
      <ul className="space-y-0.5">
        {linhas
          .filter((l) => l.valor(e) > 0)
          .map((l, i) => (
            <EntradaExpansivel key={l.chave} l={l} lista={lista} ano={ano} setAno={setAno} total={total} nomeTotal={nomeTotal} maximo={maximo} cor={cor} indice={i} />
          ))}
      </ul>
    </div>
  );
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Anos anos={lista.map((x) => x.ano)} ano={ano} setAno={setAno} rotulo={String} />
        <span className="text-xs text-slate-500">
          Total em {ano}: <span className="font-semibold tabular-nums text-slate-900">{dinheiroCurto(totalGeral)}</span>
        </span>
      </div>
      {/* Proporção de cada origem no total do ano. */}
      <div className="flex h-2.5 overflow-hidden rounded-full" role="img" aria-label={`União ${pct(e.uniao.total / totalGeral)}, Estado ${pct(e.estado.total / totalGeral)}, FUNDEB ${pct(e.fundeb / totalGeral)}`}>
        {[
          [e.uniao.total, "var(--grafico-1)"],
          [e.estado.total, "var(--grafico-2)"],
          [e.fundeb, "var(--grafico-3)"],
        ].map(([v, c], i) => (
          <span key={i} className="border-r-2 border-white transition-[width] duration-500 last:border-r-0" style={{ width: `${((v as number) / totalGeral) * 100}%`, background: c as string }} />
        ))}
      </div>
      <p className="-mt-3 text-[11px] text-slate-500">Toque numa linha para ver o que ela é, como mudou e as contas oficiais que a formam.</p>
      {bloco("Da União", e.uniao.total, "var(--grafico-1)", UNIAO, "do que veio da União")}
      {bloco("Do Estado de São Paulo", e.estado.total, "var(--grafico-2)", ESTADO, "do que veio do Estado")}
      {e.fundeb > 0 && bloco("FUNDEB", e.fundeb, "var(--grafico-3)", FUNDEB, "")}
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
