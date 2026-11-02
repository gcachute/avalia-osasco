"use client";

import { useEffect, useMemo, useState } from "react";
import { Barra } from "@/components/ui";
import { comBase, dataBR, dinheiroCurto, reaisExato } from "@/lib/formato";

export type ResumoContratos = {
  fonte: string;
  url: string;
  coletadoEm: string;
  total: number;
  porAno: { ano: number; quantidade: number; valor: number }[];
  pessoasFisicas: Record<string, { quantidade: number; valor: number }>;
  fornecedores: number;
  maiores: { cnpj: string; nome: string; quantidade: number; valor: number }[];
};
type Contrato = { ano: number; sequencial: number; numero: string | null; tipo: string | null; cnpj: string; fornecedor: string; objeto: string; valor: number; assinatura: string; fim: string | null; url: string };

const POR_VEZ = 10;
const dobra = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

function Lista({ contratos, total }: { contratos: Contrato[]; total: number }) {
  const [quantos, setQuantos] = useState(POR_VEZ);
  useEffect(() => setQuantos(POR_VEZ), [contratos]);
  return (
    <>
      <ul className="mt-3 divide-y divide-slate-100">
        {contratos.slice(0, quantos).map((c) => (
          <li key={c.url} className="py-2.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 font-medium break-words text-slate-900">{c.fornecedor}</span>
              <span className="shrink-0 font-medium tabular-nums text-slate-900" title={reaisExato(c.valor ?? 0)}>
                {dinheiroCurto(c.valor ?? 0)}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-3 break-words text-slate-600">{c.objeto}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {c.tipo ? `${c.tipo}, ` : ""}assinado em {dataBR(c.assinatura)}
              {c.fim ? `, até ${dataBR(c.fim)}` : ""} ·{" "}
              <a href={c.url} className="underline">
                ver o contrato
              </a>
            </p>
          </li>
        ))}
      </ul>
      {contratos.length > quantos && (
        <button type="button" onClick={() => setQuantos(quantos + POR_VEZ * 2)} className="mt-2 text-sm font-medium text-blue-800 underline">
          Ver mais ({total - quantos})
        </button>
      )}
    </>
  );
}

export function Contratos({ resumo }: { resumo: ResumoContratos }) {
  const [busca, setBusca] = useState("");
  const [todos, setTodos] = useState<Contrato[] | null>(null);
  const [erro, setErro] = useState(false);
  const maiorAno = Math.max(...resumo.porAno.map((a) => a.valor), 1);
  const maiorFornecedor = resumo.maiores[0]?.valor ?? 1;

  // A lista inteira só é buscada quando a pessoa começa a procurar ou pede para ver.
  const carrega = () => {
    if (todos || erro) return;
    fetch(comBase("/dados/contratos.json"))
      .then((r) => r.json())
      .then(setTodos)
      .catch(() => setErro(true));
  };
  const achados = useMemo(() => {
    if (!todos) return [];
    const t = dobra(busca.trim());
    return t ? todos.filter((c) => dobra(`${c.fornecedor} ${c.objeto} ${c.cnpj}`).includes(t)) : todos;
  }, [todos, busca]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-900">Por ano de contrato</div>
        <ul className="mt-3 space-y-2.5">
          {resumo.porAno.map((a) => (
            <li key={a.ano}>
              <div className="flex justify-between gap-3 text-sm text-slate-700">
                <span className="tabular-nums">
                  {a.ano} · {a.quantidade.toLocaleString("pt-BR")} contratos
                </span>
                <span className="shrink-0 tabular-nums" title={reaisExato(a.valor)}>
                  {dinheiroCurto(a.valor)}
                </span>
              </div>
              <Barra valor={a.valor / maiorAno} altura="h-1.5" />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-900">Empresas com maior valor em contratos</div>
        <ul className="mt-3 space-y-2.5">
          {resumo.maiores.slice(0, 10).map((f) => (
            <li key={f.cnpj}>
              <div className="flex justify-between gap-3 text-sm text-slate-700">
                <span className="min-w-0 break-words">{f.nome}</span>
                <span className="shrink-0 tabular-nums" title={reaisExato(f.valor)}>
                  {dinheiroCurto(f.valor)}
                </span>
              </div>
              <Barra valor={f.valor / maiorFornecedor} altura="h-1.5" />
              <div className="text-xs text-slate-500">{f.quantidade === 1 ? "1 contrato" : `${f.quantidade} contratos`}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-900" htmlFor="busca-contratos">
          Procurar nos {resumo.total.toLocaleString("pt-BR")} contratos
        </label>
        <input
          id="busca-contratos"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onFocus={carrega}
          placeholder="Empresa ou o que foi contratado"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
        {!todos && !erro && (
          <button type="button" onClick={carrega} className="mt-2 text-sm font-medium text-blue-800 underline">
            Ver os contratos, do maior para o menor
          </button>
        )}
        {erro && <p className="mt-2 text-sm text-slate-600">A lista não abriu. Tente de novo em instantes.</p>}
        {todos && (
          <>
            <p className="mt-2 text-xs text-slate-500">{achados.length.toLocaleString("pt-BR")} encontrados</p>
            <Lista contratos={achados} total={achados.length} />
          </>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Fonte:{" "}
        <a href={resumo.url} className="underline">
          {resumo.fonte}
        </a>
        . O portal tem contratos da Prefeitura a partir de {resumo.porAno[0]?.ano}. Valor do contrato inteiro, que pode ser pago ao longo de mais de um ano.
      </p>
    </div>
  );
}
