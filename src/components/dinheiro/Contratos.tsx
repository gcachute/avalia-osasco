"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListaDetalhe } from "@/components/ListaDetalhe";
import { Barra } from "@/components/ui";
import { comBase, dataBR, dinheiroCurto, reaisExato } from "@/lib/formato";

type Grupo = { quantidade: number; valor: number };
type ResumoOrgao = {
  total: number;
  valor?: number;
  vigentes?: Grupo;
  porCategoria?: (Grupo & { categoria: string })[];
  porTema?: (Grupo & { tema: string })[];
  porBairro?: (Grupo & { id: string; nome: string })[];
  porAno: (Grupo & { ano: number })[];
  pessoasFisicas: Record<string, Grupo>;
  fornecedores: number;
  maiores: (Grupo & { cnpj: string; nome: string })[];
};
export type ResumoContratos = { fonte: string; url: string; coletadoEm: string; orgaos: Record<string, ResumoOrgao> };
const NOMES: Record<string, string> = { prefeitura: "Prefeitura", camara: "Câmara" };
type Contrato = {
  orgao: string;
  ano: number;
  sequencial: number;
  numero: string | null;
  tipo: string | null;
  categoria: string | null;
  cnpj: string;
  fornecedor: string;
  objeto: string;
  valor: number;
  assinatura: string;
  fim: string | null;
  url: string;
  tema?: string;
  bairros?: string[];
};
// Filtros que se somam: tema e ano, por exemplo. `nome` e `nomeBairro` são só para mostrar no botão do filtro.
type Filtro = { tema?: string; ano?: number; categoria?: string; cnpj?: string; nome?: string; bairro?: string; nomeBairro?: string };
type Faceta = "tema" | "ano" | "categoria" | "empresa" | "bairro";
const POR_VEZ_FACETA = 9;

const dobra = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
const cnpjBR = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
// Meses inteiros entre a assinatura e o fim do prazo.
const meses = (de: string, ate: string) => {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
};
const prazo = (n: number) => (n < 1 ? "menos de 1 mês" : n === 1 ? "1 mês" : `${n} meses`);

// Uma linha de resumo que também é filtro: tocar abre a lista só com aquele ano, tipo de compra ou empresa.
function LinhaFiltro({ rotulo, detalhe, valor, proporcao, ativo, aoTocar }: { rotulo: string; detalhe: string; valor: number; proporcao: number; ativo: boolean; aoTocar: () => void }) {
  return (
    <li>
      <button type="button" aria-pressed={ativo} onClick={aoTocar} className={`-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1.5 text-left transition ${ativo ? "bg-blue-50" : "hover:bg-white"}`}>
        <span className="flex justify-between gap-3 text-sm text-slate-800">
          <span className={`min-w-0 break-words ${ativo ? "font-bold text-blue-900" : ""}`}>{rotulo}</span>
          <span className="shrink-0 tabular-nums" title={reaisExato(valor)}>
            {dinheiroCurto(valor)}
          </span>
        </span>
        <span className="mt-1 block">
          <Barra valor={proporcao} altura="h-1.5" />
        </span>
        <span className="mt-0.5 block text-xs text-slate-600">{detalhe}</span>
      </button>
    </li>
  );
}

function LinhaContrato({ c, ativo, coletadoEm }: { c: Contrato; ativo: boolean; coletadoEm: string }) {
  return (
    <span className="block text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className={`min-w-0 truncate font-bold ${ativo ? "text-blue-900" : "text-slate-950"}`}>{c.fornecedor}</span>
        <span className="shrink-0 font-bold tabular-nums text-slate-950" title={reaisExato(c.valor ?? 0)}>
          {dinheiroCurto(c.valor ?? 0)}
        </span>
      </span>
      <span className="mt-0.5 block truncate text-slate-700">{c.objeto}</span>
      <span className="mt-0.5 block text-xs text-slate-600">
        {c.tema ? `${c.tema}, ` : ""}assinado em {dataBR(c.assinatura)}
        {c.fim != null && c.fim >= coletadoEm && <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-px font-bold text-blue-900">em vigor</span>}
      </span>
    </span>
  );
}

function DetalheContrato({ c, coletadoEm, aoFiltrarEmpresa }: { c: Contrato; coletadoEm: string; aoFiltrarEmpresa: () => void }) {
  const vigente = c.fim != null && c.fim >= coletadoEm;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 text-base font-bold break-words text-slate-950">{c.fornecedor}</h3>
        <span className="shrink-0 font-serif text-[1.5rem] leading-tight tabular-nums text-slate-950">{dinheiroCurto(c.valor ?? 0)}</span>
      </div>
      <p className="mt-2 break-words text-slate-700">{c.objeto}</p>
      <dl className="mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-slate-200 pt-3">
        <dt className="text-slate-500">Valor exato</dt>
        <dd className="tabular-nums text-slate-900">{reaisExato(c.valor ?? 0)}</dd>
        <dt className="text-slate-500">CNPJ</dt>
        <dd className="tabular-nums text-slate-900">{cnpjBR(c.cnpj)}</dd>
        {c.tema && (
          <>
            <dt className="text-slate-500">Tema</dt>
            <dd className="text-slate-900">{c.tema}</dd>
          </>
        )}
        <dt className="text-slate-500">Tipo de compra</dt>
        <dd className="text-slate-900">{c.categoria ?? "Não informado"}</dd>
        <dt className="text-slate-500">Registro</dt>
        <dd className="text-slate-900">
          {c.tipo ?? "Não informado"}
          {c.numero && <span className="tabular-nums"> nº {c.numero}/{c.ano}</span>}
        </dd>
        <dt className="text-slate-500">Prazo</dt>
        <dd className="text-slate-900">
          {dataBR(c.assinatura)}
          {c.fim ? ` a ${dataBR(c.fim)} (${prazo(meses(c.assinatura, c.fim))})` : ", fim não informado"}
          <span className="text-slate-500">{c.fim ? (vigente ? `, em vigor em ${dataBR(coletadoEm)}` : ", encerrado") : ""}</span>
        </dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <a href={c.url} className="font-bold text-blue-800 underline">
          Ver o contrato no portal nacional
        </a>
        <button type="button" onClick={aoFiltrarEmpresa} className="font-bold text-blue-800 underline">
          Todos os contratos desta empresa
        </button>
      </div>
    </div>
  );
}

export function Contratos({ resumo: tudo }: { resumo: ResumoContratos }) {
  const chaves = Object.keys(tudo.orgaos).sort((a, b) => Object.keys(NOMES).indexOf(a) - Object.keys(NOMES).indexOf(b));
  const [orgao, setOrgao] = useState(chaves[0]);
  const resumo = tudo.orgaos[orgao];
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>({});
  const [ordem, setOrdem] = useState<"valor" | "data">("valor");
  const [todos, setTodos] = useState<Contrato[] | null>(null);
  const [erro, setErro] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const deDoOrgao = NOMES[orgao] === "Câmara" ? "da Câmara" : "da Prefeitura";
  const [faceta, setFaceta] = useState<Faceta>(resumo.porTema ? "tema" : "ano");
  const [linhasFaceta, setLinhasFaceta] = useState(POR_VEZ_FACETA);

  // A lista inteira só é buscada quando a pessoa começa a procurar, toca num filtro ou pede para ver.
  const carrega = () => {
    if (todos || erro) return;
    fetch(comBase("/dados/contratos.json"))
      .then((r) => r.json())
      .then(setTodos)
      .catch(() => setErro(true));
  };
  // Liga ou desliga um filtro sem mexer nos outros.
  const alterna = (f: Filtro) => {
    carrega();
    const chaves = Object.keys(f) as (keyof Filtro)[];
    const igual = chaves.every((k) => filtro[k] === f[k]);
    setFiltro((atual) => {
      const novo = { ...atual };
      for (const k of chaves) delete novo[k];
      return igual ? novo : { ...novo, ...f };
    });
    if (!igual) requestAnimationFrame(() => lista.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  useEffect(() => setFiltro({}), [orgao]);
  useEffect(() => setLinhasFaceta(POR_VEZ_FACETA), [faceta, orgao]);

  const achados = useMemo(() => {
    if (!todos) return [];
    const t = dobra(busca.trim());
    const r = todos.filter(
      (c) =>
        (c.orgao ?? "prefeitura") === orgao &&
        (filtro.tema == null || c.tema === filtro.tema) &&
        (filtro.bairro == null || (c.bairros ?? []).includes(filtro.bairro)) &&
        (filtro.ano == null || c.ano === filtro.ano) &&
        (filtro.categoria == null || (c.categoria ?? "Não informado") === filtro.categoria) &&
        (filtro.cnpj == null || c.cnpj === filtro.cnpj) &&
        (!t || dobra(`${c.fornecedor} ${c.objeto} ${c.cnpj}`).includes(t)),
    );
    return ordem === "data" ? [...r].sort((a, b) => b.assinatura.localeCompare(a.assinatura)) : r;
  }, [todos, busca, orgao, filtro, ordem]);
  const somaAchados = achados.reduce((s, c) => s + (c.valor ?? 0), 0);
  const ativos: { rotulo: string; tirar: Filtro }[] = [
    ...(filtro.tema ? [{ rotulo: filtro.tema, tirar: { tema: filtro.tema } }] : []),
    ...(filtro.ano != null ? [{ rotulo: `Ano ${filtro.ano}`, tirar: { ano: filtro.ano } }] : []),
    ...(filtro.categoria ? [{ rotulo: filtro.categoria, tirar: { categoria: filtro.categoria } }] : []),
    ...(filtro.cnpj ? [{ rotulo: filtro.nome ?? filtro.cnpj, tirar: { cnpj: filtro.cnpj, nome: filtro.nome } }] : []),
    ...(filtro.bairro ? [{ rotulo: filtro.nomeBairro ?? filtro.bairro, tirar: { bairro: filtro.bairro, nomeBairro: filtro.nomeBairro } }] : []),
  ];

  // Cada aba de "Navegar por" vira uma lista de linhas que também são filtros.
  const conta = (n: number) => (n === 1 ? "1 contrato" : `${n.toLocaleString("pt-BR")} contratos`);
  type LinhaFaceta = { id: string; rotulo: string; detalhe: string; valor: number; ativo: boolean; filtro: Filtro };
  const FACETAS: { chave: Faceta; nome: string; linhas: LinhaFaceta[] }[] = [
    ...(resumo.porTema
      ? [{ chave: "tema" as const, nome: "Tema", linhas: resumo.porTema.map((t) => ({ id: t.tema, rotulo: t.tema, detalhe: conta(t.quantidade), valor: t.valor, ativo: filtro.tema === t.tema, filtro: { tema: t.tema } })) }]
      : []),
    {
      chave: "ano",
      nome: "Ano",
      linhas: [...resumo.porAno].reverse().map((a) => ({ id: String(a.ano), rotulo: String(a.ano), detalhe: conta(a.quantidade), valor: a.valor, ativo: filtro.ano === a.ano, filtro: { ano: a.ano } })),
    },
    ...(resumo.porCategoria
      ? [
          {
            chave: "categoria" as const,
            nome: "Tipo de compra",
            linhas: resumo.porCategoria.map((k) => ({ id: k.categoria, rotulo: k.categoria, detalhe: conta(k.quantidade), valor: k.valor, ativo: filtro.categoria === k.categoria, filtro: { categoria: k.categoria } })),
          },
        ]
      : []),
    {
      chave: "empresa",
      nome: "Empresa",
      linhas: resumo.maiores.map((f) => ({ id: f.cnpj, rotulo: f.nome, detalhe: conta(f.quantidade), valor: f.valor, ativo: filtro.cnpj === f.cnpj, filtro: { cnpj: f.cnpj, nome: f.nome } })),
    },
    ...(resumo.porBairro?.length
      ? [
          {
            chave: "bairro" as const,
            nome: "Bairro citado",
            linhas: resumo.porBairro.map((b) => ({ id: b.id, rotulo: b.nome, detalhe: conta(b.quantidade), valor: b.valor, ativo: filtro.bairro === b.id, filtro: { bairro: b.id, nomeBairro: b.nome } })),
          },
        ]
      : []),
  ];
  const facetaAtual = FACETAS.find((x) => x.chave === faceta) ?? FACETAS[0];
  const maiorFaceta = Math.max(...facetaAtual.linhas.map((l) => l.valor), 1);

  return (
    <div className="space-y-6">
      {chaves.length > 1 && (
        <div className="flex gap-1 border-b border-slate-200" role="group" aria-label="Órgão">
          {chaves.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={k === orgao}
              onClick={() => setOrgao(k)}
              className={`px-3 py-2 text-sm transition ${k === orgao ? "font-bold text-slate-950 shadow-[inset_0_-3px_0_var(--color-blue-700)]" : "text-slate-600 hover:text-slate-950"}`}
            >
              {NOMES[k] ?? k} <span className="tabular-nums text-slate-500">{tudo.orgaos[k].total.toLocaleString("pt-BR")}</span>
            </button>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { t: "Contratos", v: resumo.total.toLocaleString("pt-BR"), d: `desde ${resumo.porAno[0]?.ano}` },
          { t: "Valor somado", v: dinheiroCurto(resumo.valor ?? resumo.porAno.reduce((s, a) => s + a.valor, 0)), d: "valor de cada contrato inteiro" },
          { t: "Empresas", v: resumo.fornecedores.toLocaleString("pt-BR"), d: "com pelo menos um contrato" },
          ...(resumo.vigentes
            ? [{ t: `Em vigor em ${dataBR(tudo.coletadoEm)}`, v: resumo.vigentes.quantidade.toLocaleString("pt-BR"), d: `somando ${dinheiroCurto(resumo.vigentes.valor)}` }]
            : []),
        ].map((c) => (
          <div key={c.t} className="rounded-2xl bg-slate-50 px-4 py-3">
            <dt className="text-xs text-slate-600">{c.t}</dt>
            <dd className="mt-0.5 font-serif text-[1.6rem] leading-tight tabular-nums text-slate-950">{c.v}</dd>
            <dd className="mt-0.5 text-[11px] text-slate-600">{c.d}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="flex flex-wrap items-end gap-x-1 border-b border-slate-200" role="tablist" aria-label="Navegar por">
          <span className="mr-2 pb-2 text-sm font-bold text-slate-950">Navegar por</span>
          {FACETAS.map((x) => (
            <button
              key={x.chave}
              type="button"
              role="tab"
              aria-selected={x.chave === facetaAtual.chave}
              onClick={() => setFaceta(x.chave)}
              className={`px-3 py-2 text-sm transition ${x.chave === facetaAtual.chave ? "font-bold text-slate-950 shadow-[inset_0_-3px_0_var(--color-blue-700)]" : "text-slate-600 hover:text-slate-950"}`}
            >
              {x.nome}
            </button>
          ))}
        </div>
        <ul className="mt-3 grid gap-x-8 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
          {facetaAtual.linhas.slice(0, linhasFaceta).map((l) => (
            <LinhaFiltro key={l.id} rotulo={l.rotulo} detalhe={l.detalhe} valor={l.valor} proporcao={l.valor / maiorFaceta} ativo={l.ativo} aoTocar={() => alterna(l.filtro)} />
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {facetaAtual.linhas.length > linhasFaceta && (
            <button type="button" onClick={() => setLinhasFaceta(linhasFaceta + POR_VEZ_FACETA)} className="font-bold text-blue-800 underline">
              Ver mais {Math.min(POR_VEZ_FACETA, facetaAtual.linhas.length - linhasFaceta)}
            </button>
          )}
          {linhasFaceta > POR_VEZ_FACETA && (
            <button type="button" onClick={() => setLinhasFaceta(POR_VEZ_FACETA)} className="font-bold text-blue-800 underline">
              Ver menos
            </button>
          )}
          <span className="text-xs text-slate-600">
            {facetaAtual.chave === "tema"
              ? "O tema vem das palavras do que foi contratado; cada contrato fica em um tema só. Toque para ver só esses contratos; os filtros se somam."
              : facetaAtual.chave === "bairro"
                ? "Só entram os contratos cujo texto cita o bairro; o portal não informa o lugar de cada contrato."
                : "Toque em uma linha para ver só esses contratos na lista abaixo. Os filtros se somam."}
          </span>
        </div>
      </div>

      <div ref={lista} className="scroll-mt-32">
        <label className="block text-sm font-bold text-slate-950" htmlFor="busca-contratos">
          Procurar nos {resumo.total.toLocaleString("pt-BR")} contratos {deDoOrgao}
        </label>
        <input
          id="busca-contratos"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onFocus={carrega}
          placeholder="Empresa, CNPJ ou o que foi contratado"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 lg:max-w-xl"
        />
        {!todos && !erro && (
          <button type="button" onClick={carrega} className="mt-3 block text-sm font-bold text-blue-800 underline">
            Ver os contratos, do maior para o menor
          </button>
        )}
        {erro && <p className="mt-2 text-sm text-slate-600">A lista não abriu. Tente de novo em instantes.</p>}
        {todos && (
          <>
            <div className="mt-3 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              {ativos.map((a) => (
                <button key={a.rotulo} type="button" onClick={() => alterna(a.tirar)} className="flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pr-2 pl-3 font-bold text-blue-900 hover:bg-blue-100">
                  {a.rotulo}
                  <span aria-label="Tirar o filtro">×</span>
                </button>
              ))}
              {ativos.length > 1 && (
                <button type="button" onClick={() => setFiltro({})} className="font-bold text-blue-800 underline">
                  Tirar todos
                </button>
              )}
              <span className="text-slate-600 tabular-nums">
                {achados.length.toLocaleString("pt-BR")} {achados.length === 1 ? "contrato" : "contratos"}, {dinheiroCurto(somaAchados)}
              </span>
              <label className="ml-auto flex items-center gap-2 text-slate-600">
                Ordem
                <select value={ordem} onChange={(e) => setOrdem(e.target.value as "valor" | "data")} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900">
                  <option value="valor">Maior valor</option>
                  <option value="data">Mais recente</option>
                </select>
              </label>
            </div>
            <ListaDetalhe
              itens={achados}
              chave={(c) => c.url}
              nome="contratos"
              colunas="lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
              vazio={<p className="text-sm text-slate-600">Nenhum contrato encontrado.</p>}
              linha={(c, ativo) => <LinhaContrato c={c} ativo={ativo} coletadoEm={tudo.coletadoEm} />}
              detalhe={(c) => <DetalheContrato c={c} coletadoEm={tudo.coletadoEm} aoFiltrarEmpresa={() => alterna({ cnpj: c.cnpj, nome: c.fornecedor })} />}
            />
          </>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Fonte:{" "}
        <a href={tudo.url} className="underline">
          {tudo.fonte}
        </a>
        , consultado em {dataBR(tudo.coletadoEm)}. O portal tem contratos {deDoOrgao} a partir de {resumo.porAno[0]?.ano}. Valor do contrato inteiro, que pode ser pago ao longo de
        mais de um ano. Em vigor: o prazo final do contrato não tinha passado na data da consulta.
      </p>
    </div>
  );
}
