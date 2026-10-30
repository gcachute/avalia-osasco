"use client";

import { useState } from "react";
import { PorQueOsasco } from "@/components/dinheiro/PorQueOsasco";
import { Abre, Segmentos } from "@/components/movimento/Movimento";
import { nomeProprio, type GastoAno, type ResumoGasto } from "@/lib/dinheiro";
import { dinheiroCurto, pct, reaisExato } from "@/lib/formato";

type Origem = "federal" | "estadual" | "emendas";
type TipoEmenda = "emendasFederais" | "emendasEstaduais" | "emendasVereadores";
type Recebedor = { cnpj: string; nome: string; valor: number; principal?: string | null; sede?: string | null };

const ORIGENS: { chave: Origem; nome: string; cor: string }[] = [
  { chave: "federal", nome: "Verba federal", cor: "var(--grafico-1)" },
  { chave: "estadual", nome: "Verba estadual", cor: "var(--grafico-2)" },
  { chave: "emendas", nome: "Emendas", cor: "var(--grafico-4)" },
];

const TIPOS_EMENDA: { chave: TipoEmenda; nome: string }[] = [
  { chave: "emendasFederais", nome: "Federais" },
  { chave: "emendasEstaduais", nome: "Estaduais" },
  { chave: "emendasVereadores", nome: "Fonte “emendas individuais”" },
];

const MESES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const AREAS_VISIVEIS = 4;
const RECEBEDORES_VISIVEIS = 5;

const totalEmendas = (g: GastoAno) => TIPOS_EMENDA.reduce((s, t) => s + (g[t.chave]?.total ?? 0), 0);
const totalDe = (g: GastoAno, o: Origem) => (o === "emendas" ? totalEmendas(g) : (g[o]?.total ?? 0));

// O nome oficial de cada aplicação, no texto do dia a dia.
const usoLegivel = (s: string | null | undefined) => {
  if (!s || /^GERAL/i.test(s)) return null;
  if (/BANCADAS/i.test(s)) return "Emenda de bancada";
  if (/EMENDAS PARLAMENTARES/i.test(s)) return "Emenda individual";
  if (/CORONAVIRUS/i.test(s)) return "Combate à covid-19";
  if (/MAGIST[EÉ]RIO/i.test(s)) return "FUNDEB, magistério";
  if (/FUNDEB/i.test(s)) return "FUNDEB";
  if (/EDUCA[CÇ][AÃ]O/i.test(s)) return "Educação";
  if (/SA[UÚ]DE/i.test(s)) return "Saúde";
  if (/ASSIST[EÊ]NCIA SOCIAL/i.test(s)) return "Assistência social";
  return s.charAt(0) + s.slice(1).toLowerCase();
};

// Um ano por coluna, do mais antigo ao mais recente, na altura do total da verba escolhida. Tocar escolhe o ano.
function AnosEmBarras({ lista, ano, origem, cor, aoEscolher }: { lista: GastoAno[]; ano: number; origem: Origem; cor: string; aoEscolher: (a: number) => void }) {
  const maximo = Math.max(...lista.map((g) => totalDe(g, origem)), 1);
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${lista.length}, minmax(0, 1fr))` }} role="group" aria-label="Ano">
      {lista.map((g) => {
        const v = totalDe(g, origem);
        const ativo = g.ano === ano;
        return (
          <button
            key={g.ano}
            type="button"
            aria-pressed={ativo}
            aria-label={`${g.ano}: ${dinheiroCurto(v)}`}
            title={`${g.ano}: ${dinheiroCurto(v)}`}
            onClick={() => aoEscolher(g.ano)}
            className="group flex h-20 flex-col justify-end gap-1 rounded-md px-0.5 pt-1 pb-0.5 transition-colors hover:bg-slate-100"
          >
            <span
              className={`block rounded-t transition-[height,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${ativo ? "" : "bg-slate-300 group-hover:bg-slate-400"}`}
              style={{ height: `${Math.max(2, (v / maximo) * 52)}px`, ...(ativo ? { background: cor } : {}) }}
            />
            <span className={`text-center text-[10px] tabular-nums ${ativo ? "font-semibold text-slate-900" : "text-slate-500"}`}>
              {g.ano}
              {g.ultimoMes < 12 && "*"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Areas({ funcoes, total, cor }: { funcoes: ResumoGasto["funcoes"]; total: number; cor: string }) {
  const [todas, setTodas] = useState(false);
  const visiveis = todas ? funcoes : funcoes.slice(0, AREAS_VISIVEIS);
  return (
    <div>
      <div className="text-xs font-medium text-slate-900">Por área</div>
      <ul className="mt-2 space-y-2">
        {visiveis.map((f, n) => (
          <li key={f.nome} className="entra text-sm" style={{ "--i": n } as React.CSSProperties}>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 text-slate-800">{f.nome.charAt(0) + f.nome.slice(1).toLowerCase()}</span>
              <span className="shrink-0 tabular-nums text-slate-500">{f.valor / total < 0.01 ? "menos de 1%" : pct(f.valor / total)}</span>
              <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-slate-900">{dinheiroCurto(f.valor)}</span>
            </div>
            <span className="relative mt-1 block h-1.5 rounded bg-slate-100" aria-hidden>
              <span className="barra-anim absolute inset-y-0 left-0 rounded" style={{ width: `${Math.max(0.5, (f.valor / total) * 100)}%`, background: cor }} />
            </span>
          </li>
        ))}
      </ul>
      {funcoes.length > AREAS_VISIVEIS && (
        <button type="button" onClick={() => setTodas(!todas)} className="mt-2 text-xs font-medium text-blue-800 underline">
          {todas ? "Ver menos áreas" : `Ver as outras ${funcoes.length - AREAS_VISIVEIS} áreas`}
        </button>
      )}
    </div>
  );
}

function LinhaRecebedor({ f, total, cor, indice }: { f: Recebedor; total: number; cor: string; indice: number }) {
  const [aberto, setAberto] = useState(false);
  const uso = f.cnpj === "folha" ? "Professores e outros servidores pagos com este dinheiro" : usoLegivel(f.principal);
  return (
    <li className="entra" style={{ "--i": indice } as React.CSSProperties}>
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="w-full rounded-md py-2 text-left text-sm transition-colors hover:bg-slate-50">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 text-slate-800">{nomeProprio(f.nome)}</span>
          <span className="shrink-0 font-semibold tabular-nums text-slate-900">{dinheiroCurto(f.valor)}</span>
          <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 shrink-0 self-center text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="relative mt-1 block h-1 rounded bg-slate-100" aria-hidden>
          <span className="barra-anim absolute inset-y-0 left-0 rounded" style={{ width: `${Math.max(0.5, (f.valor / total) * 100)}%`, background: cor }} />
        </span>
      </button>
      <Abre aberto={aberto}>
        <dl className="mb-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 rounded-md bg-slate-50 p-2 text-xs">
          <dt className="text-slate-500">Valor exato</dt>
          <dd className="tabular-nums text-slate-900">{reaisExato(f.valor)}</dd>
          <dt className="text-slate-500">Parte do total</dt>
          <dd className="tabular-nums text-slate-900">{pct(f.valor / total)}</dd>
          {f.sede && (
            <>
              <dt className="text-slate-500">Sede</dt>
              <dd className="text-slate-900">{f.sede}</dd>
            </>
          )}
          {uso && (
            <>
              <dt className="text-slate-500">Principal uso</dt>
              <dd className="text-slate-900">{uso}</dd>
            </>
          )}
        </dl>
      </Abre>
    </li>
  );
}

function Recebedores({ itens, total, cor }: { itens: Recebedor[]; total: number; cor: string }) {
  const [todos, setTodos] = useState(false);
  const visiveis = todos ? itens : itens.slice(0, RECEBEDORES_VISIVEIS);
  return (
    <div>
      <div className="text-xs font-medium text-slate-900">Quem mais recebeu</div>
      <PorQueOsasco className="mt-1">pagamentos feitos pela Prefeitura de Osasco. Abra uma linha para ver a sede.</PorQueOsasco>
      <ol className="mt-1 divide-y divide-slate-100">
        {visiveis.map((f, n) => (
          <LinhaRecebedor key={f.cnpj} f={f} total={total} cor={cor} indice={n} />
        ))}
      </ol>
      {itens.length > RECEBEDORES_VISIVEIS && (
        <button type="button" onClick={() => setTodos(!todos)} className="mt-1 text-xs font-medium text-blue-800 underline">
          {todos ? "Ver menos" : `Ver os ${itens.length} que mais receberam`}
        </button>
      )}
    </div>
  );
}

export function GastosPorAno({ gastos }: { gastos: GastoAno[] }) {
  const lista = [...gastos].sort((a, b) => a.ano - b.ano);
  const [ano, setAno] = useState(lista.findLast((g) => g.ultimoMes === 12)?.ano ?? lista.at(-1)!.ano);
  const [origem, setOrigem] = useState<Origem>("federal");
  const [tipo, setTipo] = useState<TipoEmenda>("emendasFederais");

  const g = lista.find((x) => x.ano === ano)!;
  const o = ORIGENS.find((x) => x.chave === origem)!;
  const tipos = TIPOS_EMENDA.filter((t) => (g[t.chave]?.total ?? 0) > 0);
  const tipoAtual = tipos.find((t) => t.chave === tipo) ?? tipos[0];
  const resumo = origem === "emendas" ? null : g[origem];
  const emenda = tipoAtual ? g[tipoAtual.chave] : null;
  const total = totalDe(g, origem);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <Segmentos rotulo="Origem do dinheiro" valor={origem} aoEscolher={setOrigem} opcoes={ORIGENS.map((x) => ({ valor: x.chave, nome: x.nome }))} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-end">
        <div>
          <div className="text-xs text-slate-500">
            {o.nome}, {ano}
          </div>
          <div className="text-3xl font-semibold tabular-nums text-slate-900">{dinheiroCurto(total)}</div>
          {resumo && <div className="text-xs text-slate-500">{resumo.quantidadeFornecedores.toLocaleString("pt-BR")} fornecedores e entidades</div>}
        </div>
        <AnosEmBarras lista={lista} ano={ano} origem={origem} cor={o.cor} aoEscolher={setAno} />
      </div>
      {g.ultimoMes < 12 && <p className="text-xs text-slate-500">* Ano em andamento: pagamentos até {MESES[g.ultimoMes]}.</p>}

      {total === 0 && <p className="py-4 text-center text-sm text-slate-500">Sem pagamentos registrados nesse ano.</p>}

      {resumo && total > 0 && (
        <div key={`${origem}-${ano}`} className="grid gap-5 lg:grid-cols-2">
          <Areas funcoes={resumo.funcoes} total={total} cor={o.cor} />
          <div>
            <Recebedores itens={resumo.fornecedores} total={total} cor={o.cor} />
            {resumo.pessoasFisicas > 0 && <p className="mt-2 text-[11px] text-slate-500">Pagamentos a pessoas físicas ({dinheiroCurto(resumo.pessoasFisicas)}) entram só no total, sem nomes.</p>}
          </div>
        </div>
      )}

      {origem === "emendas" && emenda && tipoAtual && (
        <div key={`${tipoAtual.chave}-${ano}`} className="space-y-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de emenda">
            {tipos.map((t) => (
              <button
                key={t.chave}
                type="button"
                aria-pressed={t.chave === tipoAtual.chave}
                onClick={() => setTipo(t.chave)}
                className={`rounded-full px-2 py-0.5 text-xs ring-1 transition ${t.chave === tipoAtual.chave ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"}`}
              >
                {t.nome} <span className="tabular-nums opacity-70">{dinheiroCurto(g[t.chave]!.total)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {tipoAtual.chave === "emendasVereadores"
              ? "Fonte de pagamento da Prefeitura. Quando o histórico cita o vereador, a emenda aparece na aba Vereadores de Osasco."
              : "Pagamentos que a Prefeitura marca com o código de emenda. Já estão somados na verba federal ou estadual."}
          </p>
          <Recebedores itens={emenda.fornecedores} total={emenda.total} cor={o.cor} />
        </div>
      )}
    </div>
  );
}
