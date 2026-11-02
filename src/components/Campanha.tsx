import bruto from "@/data/campanhas.json";
import { Barra, Cartao } from "@/components/ui";
import { comBase, dinheiroCurto, reaisExato } from "@/lib/formato";

export type Campanha = {
  sq: string;
  numero: string;
  urna: string;
  nome: string;
  cargo: string;
  partido: string;
  situacao: string;
  plano: string | null;
  receitas: { total: number; porOrigem: Record<string, number>; porFonte: Record<string, number> };
  despesas: { contratado: number; pago: number; porTipo: Record<string, number> };
  empresas: { nome: string; valor: number }[];
  bens: { total: number; quantidade: number };
};

export const campanhas = bruto as unknown as {
  fonte: string;
  url: string;
  coletadoEm: string;
  porId: Record<string, Campanha>;
  prefeitos: Campanha[];
  vereadores: { candidaturas: number; receitas: number; gastos: number };
};

const SITUACOES: Record<string, string> = {
  ELEITO: "Venceu a eleição",
  "ELEITO POR QP": "Vaga pelo quociente partidário",
  "ELEITO POR MÉDIA": "Vaga por média",
  SUPLENTE: "Suplência",
  "NÃO ELEITO": "Não obteve vaga",
};
export const situacaoLegivel = (s: string) => SITUACOES[s] ?? "Sem resultado registrado";

const fundo = (c: Campanha, nome: string) => c.receitas.porFonte[nome] ?? 0;

export function ResumoCampanha({ c }: { c: Campanha }) {
  const origens = Object.entries(c.receitas.porOrigem);
  const maior = Math.max(...origens.map(([, v]) => v), 1);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Dinheiro recebido" valor={<span title={reaisExato(c.receitas.total)}>{dinheiroCurto(c.receitas.total)}</span>} detalhe={situacaoLegivel(c.situacao)} />
        <Cartao titulo="Fundo eleitoral" valor={<span title={reaisExato(fundo(c, "FUNDO ESPECIAL"))}>{dinheiroCurto(fundo(c, "FUNDO ESPECIAL"))}</span>} detalhe="dinheiro público de campanha" />
        <Cartao titulo="Gastos contratados" valor={<span title={reaisExato(c.despesas.contratado)}>{dinheiroCurto(c.despesas.contratado)}</span>} detalhe={`${dinheiroCurto(c.despesas.pago)} pagos`} />
        <Cartao titulo="Bens declarados" valor={<span title={reaisExato(c.bens.total)}>{dinheiroCurto(c.bens.total)}</span>} detalhe={`${c.bens.quantidade} ${c.bens.quantidade === 1 ? "item" : "itens"}, valor informado pelo candidato`} />
      </div>
      {origens.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-900">De onde veio o dinheiro</div>
          <ul className="mt-3 space-y-2.5">
            {origens.map(([nome, v]) => (
              <li key={nome}>
                <div className="flex justify-between gap-3 text-sm text-slate-700">
                  <span>{nome}</span>
                  <span className="shrink-0 tabular-nums" title={reaisExato(v)}>
                    {dinheiroCurto(v)}
                  </span>
                </div>
                <Barra valor={v / maior} altura="h-1.5" />
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.empresas.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-900">Empresas contratadas na campanha</div>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {c.empresas.slice(0, 5).map((e) => (
              <li key={e.nome} className="flex justify-between gap-3 py-1.5 text-slate-700">
                <span className="min-w-0 break-words">{e.nome}</span>
                <span className="shrink-0 tabular-nums" title={reaisExato(e.valor)}>
                  {dinheiroCurto(e.valor)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Eleição de 2024, candidatura nº {c.numero} pelo {c.partido}. Fonte:{" "}
        <a href={campanhas.url} className="underline">
          {campanhas.fonte}
        </a>
        . Doações de pessoas aparecem só na soma.
      </p>
    </>
  );
}

export function Candidatos({ lista }: { lista: Campanha[] }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4 text-sm">
      {lista.map((c) => (
        <li key={c.sq} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
          <span className="min-w-0 text-slate-900">
            {c.urna} <span className="text-slate-500">({c.partido})</span>
          </span>
          <span className="tabular-nums text-slate-700" title={reaisExato(c.receitas.total)}>
            {dinheiroCurto(c.receitas.total)}
            {c.plano && (
              <>
                {" · "}
                <a href={comBase(c.plano)} className="text-blue-800 underline">
                  plano de governo
                </a>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
