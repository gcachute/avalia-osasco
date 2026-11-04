"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ListaDetalhe } from "@/components/ListaDetalhe";
import { dataBR, dinheiroCurto, reaisExato } from "@/lib/formato";

export type ObraLista = {
  id: string;
  nome: string;
  descricao: string | null;
  endereco: string | null;
  situacao: string | null;
  natureza: string | null;
  especie: string | null;
  tipo: string | null;
  inicioPrevisto: string | null;
  fimPrevisto: string | null;
  inicio: string | null;
  fim: string | null;
  tomador: string | null;
  executor: string | null;
  fontes: { origem: string; valor: number | null }[];
  valor: number;
  localGenerico: boolean;
  bairros: { id: string; nome: string }[];
};

// Nome todo em maiúsculas vira frase comum; o resto fica como foi cadastrado.
const frase = (s: string) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);
const titulo = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase())
    .replace(/\b(De|Da|Do|Dos|Das|E|Para)\b/g, (m) => m.toLowerCase());
// Algumas descrições vêm no formato "programa | código | nome da obra": fica só o que acrescenta ao título.
const descricaoObra = (o: ObraLista) => {
  const comeco = o.nome.slice(0, 30).toLowerCase();
  return (o.descricao ?? "")
    .split(" | ")
    .filter((p) => p.trim() && !/^cod_/i.test(p.trim()) && !p.trim().toLowerCase().startsWith(comeco))
    .join(". ");
};
const periodo = (de: string | null, ate: string | null) => (de || ate ? `${de ? dataBR(de) : "sem data"} a ${ate ? dataBR(ate) : "sem data"}` : null);

function Detalhe({ o }: { o: ObraLista }) {
  const descricao = descricaoObra(o);
  const linhas: [string, React.ReactNode][] = [
    ["Situação", o.situacao ?? "Não informada"],
    ["Área", o.tipo],
    ["Tipo de obra", [o.natureza, o.especie].filter(Boolean).join(", ") || null],
    ["Endereço", o.endereco],
    ["Bairros", o.bairros.map((b) => b.nome).join(", ") || null],
    ["Previsto", periodo(o.inicioPrevisto, o.fimPrevisto)],
    ["Realizado", periodo(o.inicio, o.fim)],
    ["Quem pediu", o.tomador && titulo(o.tomador)],
    ["Quem executa", o.executor && titulo(o.executor)],
    [
      "Recursos",
      o.fontes.length
        ? o.fontes.map((f, i) => (
            <span key={i} className="block tabular-nums">
              {f.origem}: {f.valor != null ? reaisExato(f.valor) : "valor não informado"}
            </span>
          ))
        : null,
    ],
    ["Código no cadastro", o.id],
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 text-base font-bold break-words text-slate-950">{frase(o.nome)}</h3>
        {o.valor > 0 && <span className="shrink-0 font-serif text-[1.5rem] leading-tight tabular-nums text-slate-950">{dinheiroCurto(o.valor)}</span>}
      </div>
      {descricao && <p className="mt-2 break-words text-slate-700">{frase(descricao)}</p>}
      <dl className="mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-slate-200 pt-3">
        {linhas
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd className="break-words text-slate-900">{v}</dd>
            </div>
          ))}
      </dl>
      <div className="mt-3">
        {o.bairros.length ? (
          <Link href={`/mapa?obra=${encodeURIComponent(o.id)}`} className="inline-block rounded-full bg-blue-700 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-blue-800">
            Ver esta obra no mapa
          </Link>
        ) : (
          <span className="text-xs text-slate-600">
            {o.localGenerico ? "O ponto do cadastro é o mesmo de várias outras obras, por isso esta obra fica fora do mapa." : "O cadastro não traz o lugar da obra em Osasco."}
          </span>
        )}
      </div>
    </div>
  );
}

export function Obras({ obras }: { obras: ObraLista[] }) {
  const [situacao, setSituacao] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [escolhida, setEscolhida] = useState<string | null>(null);

  // ?obra= (link do painel do bairro, no mapa) abre a página já com a obra escolhida.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("obra");
    if (id && obras.some((o) => o.id === id)) setEscolhida(id);
  }, [obras]);

  const contaPor = (k: "situacao" | "tipo") =>
    Object.entries(obras.reduce<Record<string, number>>((a, o) => ((a[o[k] ?? "Não informado"] = (a[o[k] ?? "Não informado"] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const situacoes = contaPor("situacao");
  const areas = contaPor("tipo");
  const filtradas = useMemo(
    () => obras.filter((o) => (situacao == null || (o.situacao ?? "Não informado") === situacao) && (area == null || (o.tipo ?? "Não informado") === area)),
    [obras, situacao, area],
  );
  const total = filtradas.reduce((s, o) => s + o.valor, 0);
  const chip = (ativo: boolean) => `rounded-full px-3 py-1.5 text-[13px] transition ${ativo ? "bg-slate-900 font-bold text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { t: "Obras no cadastro", v: String(obras.length) },
          { t: "Investimento previsto, somado", v: dinheiroCurto(obras.reduce((s, o) => s + o.valor, 0)) },
          ...situacoes.slice(0, 2).map(([s, q]) => ({ t: s, v: String(q) })),
        ].map((c) => (
          <div key={c.t} className="rounded-2xl bg-slate-50 px-4 py-3">
            <dt className="text-xs text-slate-600">{c.t}</dt>
            <dd className="mt-0.5 font-serif text-[1.6rem] leading-tight tabular-nums text-slate-950">{c.v}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação">
          <button type="button" aria-pressed={situacao == null} onClick={() => setSituacao(null)} className={chip(situacao == null)}>
            Todas as situações
          </button>
          {situacoes.map(([s, q]) => (
            <button key={s} type="button" aria-pressed={situacao === s} onClick={() => setSituacao(situacao === s ? null : s)} className={chip(situacao === s)}>
              {s} <span className="tabular-nums opacity-70">{q}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            Área
            <select value={area ?? ""} onChange={(e) => setArea(e.target.value || null)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900">
              <option value="">Todas</option>
              {areas.map(([a, q]) => (
                <option key={a} value={a}>
                  {a} ({q})
                </option>
              ))}
            </select>
          </label>
          <span className="tabular-nums">
            {filtradas.length} {filtradas.length === 1 ? "obra" : "obras"}, {dinheiroCurto(total)} previstos
          </span>
          <Link href="/mapa?tema=obras" className="font-bold text-blue-800 underline sm:ml-auto">
            Ver todas no mapa
          </Link>
        </div>
      </div>

      <ListaDetalhe
        itens={filtradas}
        chave={(o) => o.id}
        nome="obras"
        porVez={8}
        escolhido={escolhida}
        aoEscolher={setEscolhida}
        vazio={<p className="text-sm text-slate-600">Nenhuma obra com esses filtros.</p>}
        linha={(o, ativo) => (
          <span className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className={`min-w-0 truncate text-sm font-bold ${ativo ? "text-blue-900" : "text-slate-950"}`}>{frase(o.nome)}</span>
              {o.valor > 0 && (
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-950" title={reaisExato(o.valor)}>
                  {dinheiroCurto(o.valor)}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-600">
              <span className="font-bold text-slate-800">{o.situacao ?? "Situação não informada"}</span>
              {o.tipo && `, ${o.tipo}`}
              {o.bairros.length > 0 && `, ${o.bairros.map((b) => b.nome).join(", ")}`}
            </span>
          </span>
        )}
        detalhe={(o) => <Detalhe o={o} />}
      />
    </div>
  );
}
