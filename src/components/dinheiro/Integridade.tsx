"use client";

import { useState } from "react";
import type { Integridade, Modalidades } from "@/lib/dinheiro";
import { dataBR, dinheiroCurto, pct } from "@/lib/formato";

// "2020, 2021 e 2024"
const lista = (xs: (string | number)[]) => new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(xs.map(String));

// Cada conferência é um cartão: o que foi conferido, o resultado em uma frase e, ao abrir, os casos.
function Conferencia({
  titulo,
  resultado,
  achou,
  children,
}: {
  titulo: string;
  resultado: React.ReactNode;
  achou: boolean;
  children?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <li className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => children && setAberto(!aberto)}
        aria-expanded={children ? aberto : undefined}
        className={`flex w-full items-start gap-3 p-4 text-left ${children ? "" : "cursor-default"}`}
      >
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${achou ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
          aria-label={achou ? "Ponto de atenção" : "Nada encontrado"}
        >
          {achou ? "!" : "✓"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-slate-900">{titulo}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{resultado}</span>
        </span>
        {children && (
          <svg viewBox="0 0 20 20" className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {aberto && children && <div className="border-t border-slate-100 px-4 pt-3 pb-4 text-sm">{children}</div>}
    </li>
  );
}

const PARTES: { chave: keyof Omit<Modalidades, "total">; nome: string; cor: string }[] = [
  { chave: "licitacao", nome: "Licitação", cor: "var(--grafico-1)" },
  { chave: "dispensa", nome: "Dispensa de licitação", cor: "var(--grafico-2)" },
  { chave: "inexigivel", nome: "Inexigível", cor: "var(--grafico-4)" },
  { chave: "semContratacao", nome: "Sem compra (salários, repasses)", cor: "var(--grafico-outro)" },
];

function Barra({ m, rotulo }: { m: Modalidades; rotulo: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-2 text-xs max-sm:grid-cols-1">
      <span className="text-slate-600">{rotulo}</span>
      <span className="flex h-3 overflow-hidden rounded" role="img" aria-label={PARTES.map((p) => `${p.nome}: ${pct(m[p.chave] / m.total)}`).join("; ")}>
        {PARTES.map((p) => (m[p.chave] > 0 ? <span key={p.chave} style={{ width: `${(m[p.chave] / m.total) * 100}%`, background: p.cor }} className="border-r-2 border-white last:border-r-0" /> : null))}
      </span>
    </div>
  );
}

export function ConferenciasIntegridade({ i }: { i: Integridade }) {
  const pagosDurante = i.punidos.filter((p) => p.punicoes.some((s) => s.valeParaOsasco && s.pagoDurante > 0));
  const valemDepois = i.punidos.filter((p) => !pagosDurante.includes(p) && p.punicoes.some((s) => s.valeParaOsasco));
  const outros = i.punidos.filter((p) => !pagosDurante.includes(p) && !valemDepois.includes(p));
  const datas = [...new Set(Object.values(i.listas))].map(dataBR).join(" e ");

  const comEmendas = i.modalidades.filter((m) => m.emendas.total > 0);
  const somaM = (lista: Modalidades[]) =>
    lista.reduce((a, m) => ({ licitacao: a.licitacao + m.licitacao, dispensa: a.dispensa + m.dispensa, inexigivel: a.inexigivel + m.inexigivel, semContratacao: a.semContratacao + m.semContratacao, total: a.total + m.total }), {
      licitacao: 0,
      dispensa: 0,
      inexigivel: 0,
      semContratacao: 0,
      total: 0,
    });
  const emendasTodas = somaM(comEmendas.map((m) => m.emendas));
  const semLicitacao = (m: Modalidades) => (m.dispensa + m.inexigivel) / Math.max(1, m.total - m.semContratacao);
  const rastreioTotal = i.rastreio.reduce((a, r) => ({ total: a.total + r.total, comNumero: a.comNumero + r.comNumero }), { total: 0, comNumero: 0 });

  const ListaPunidos = ({ itens }: { itens: Integridade["punidos"] }) => (
    <ul className="space-y-3">
      {itens.map((p) => (
        <li key={p.cnpj} className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 font-medium text-slate-900">{p.nome}</span>
            <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(p.recebeu)}</span>
          </div>
          <div className="text-xs text-slate-500">
            Recebeu verbas de fora em {lista(p.anos)}
            {p.deEmenda > 0 && ` (${dinheiroCurto(p.deEmenda)} de emendas)`}
          </div>
          <ul className="mt-2 space-y-1.5 text-xs">
            {p.punicoes.map((s, k) => (
              <li key={k} className="text-slate-700">
                <span className="font-medium">{s.categoria}</span>
                {s.inicio && ` desde ${dataBR(s.inicio)}`}
                {s.fim && ` até ${dataBR(s.fim)}`}, aplicada por {s.orgao}
                {s.outraUnidade && " (a outra unidade da mesma empresa)"}.{" "}
                <span className={s.valeParaOsasco ? "text-amber-800" : "text-slate-500"}>
                  {s.lista === "CEPIM"
                    ? "Impede a entidade de receber repasses do governo federal."
                    : s.valeParaOsasco
                      ? s.pagoDurante > 0
                        ? `Vale para Osasco; ${dinheiroCurto(s.pagoDurante)} foram pagos no período da punição.`
                        : "Vale para Osasco; nenhum pagamento com verbas de fora no período da punição."
                      : /Multa|Publica/i.test(s.categoria)
                        ? "Multa, sem proibição de contratar."
                        : "Só vale para o órgão que puniu ou para o governo dele."}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );

  return (
    <ul className="space-y-3">
      <Conferencia
        titulo="Empresas e entidades em listas de punidos"
        achou={pagosDurante.length > 0}
        resultado={
          <>
            {i.conferidos.toLocaleString("pt-BR")} empresas e entidades que receberam dinheiro federal, estadual ou de emenda foram conferidas nas três listas de
            punidos da Controladoria-Geral da União (versões de {datas}).{" "}
            {pagosDurante.length
              ? `${pagosDurante.length} receberam pagamento enquanto valia uma punição que alcança Osasco.`
              : "Nenhuma recebeu pagamento enquanto valia uma punição que alcança Osasco."}{" "}
            {valemDepois.length + outros.length > 0 && `${valemDepois.length + outros.length} aparecem nas listas por outras punições.`}
          </>
        }
      >
        <div className="space-y-4">
          {pagosDurante.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium text-slate-900">Pagas durante uma punição que vale para Osasco</div>
              <ListaPunidos itens={pagosDurante} />
            </div>
          )}
          {valemDepois.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium text-slate-900">Punição que vale para Osasco, mas sem pagamento no período</div>
              <ListaPunidos itens={valemDepois} />
            </div>
          )}
          {outros.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium text-slate-900">Punidas por outros órgãos (a punição não alcança Osasco)</div>
              <ListaPunidos itens={outros} />
            </div>
          )}
          <p className="text-xs text-slate-500">
            As listas mostram só as punições em vigor hoje ou ainda registradas. Estar numa lista não quer dizer que houve irregularidade em Osasco: uma
            suspensão aplicada por outra prefeitura, por exemplo, só vale lá. Pagamentos a pessoas físicas não foram conferidos. Fonte:{" "}
            <a href={i.fonteListas.url} className="underline">
              {i.fonteListas.nome}
            </a>
            .
          </p>
        </div>
      </Conferencia>

      {comEmendas.length > 0 && (
        <Conferencia
          titulo="Como as compras com dinheiro de emenda foram contratadas"
          achou={semLicitacao(emendasTodas) > 0.25}
          resultado={
            <>
              Das compras e serviços pagos com dinheiro de emenda desde {comEmendas[0].ano}, {pct(semLicitacao(emendasTodas))} foram contratados sem licitação
              (dispensa ou inexigibilidade). No total das verbas de fora, a parte sem licitação é de {pct(semLicitacao(somaM(i.modalidades.map((m) => m.todos))))}.
            </>
          }
        >
          <div className="space-y-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
              {PARTES.map((p) => (
                <span key={p.chave} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: p.cor }} aria-hidden />
                  {p.nome}
                </span>
              ))}
            </div>
            {comEmendas
              .slice()
              .reverse()
              .map((m) => (
                <div key={m.ano} className="space-y-1">
                  <Barra m={m.emendas} rotulo={`${m.ano}, emendas`} />
                  <Barra m={m.todos} rotulo={`${m.ano}, tudo`} />
                </div>
              ))}
            {i.dispensasEmendas.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-medium text-slate-900">Quem mais recebeu dinheiro de emenda sem licitação</div>
                <ul className="mt-1 divide-y divide-slate-100 text-xs">
                  {i.dispensasEmendas.map((d) => (
                    <li key={d.fornecedor} className="flex items-baseline gap-3 py-1">
                      <span className="min-w-0 flex-1 text-slate-800">
                        {d.fornecedor}
                        <span className="text-slate-500">
                          {" "}
                          · {d.modalidade}, {lista(d.anos)}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(d.valor)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-500">
              A lei permite comprar sem licitação em casos como valores pequenos, emergências ou fornecedor único; isso não é irregular por si. Compras pela
              bolsa eletrônica do Estado contam como licitação.
            </p>
          </div>
        </Conferencia>
      )}

      {i.rastreio.length > 0 && (
        <Conferencia
          titulo="Dá para seguir cada emenda até a nota?"
          achou={rastreioTotal.comNumero / rastreioTotal.total < 0.5}
          resultado={
            <>
              {pct(rastreioTotal.comNumero / rastreioTotal.total)} do que a Prefeitura pagou com dinheiro de emenda ({dinheiroCurto(rastreioTotal.comNumero)} de{" "}
              {dinheiroCurto(rastreioTotal.total)}) traz no histórico o número da emenda ou o nome do vereador. O resto foi pago com a marca de emenda, mas sem dizer
              qual.
            </>
          }
        >
          <ul className="divide-y divide-slate-100 text-xs">
            {i.rastreio
              .slice()
              .reverse()
              .map((r) => (
                <li key={r.ano} className="flex items-baseline gap-3 py-1">
                  <span className="w-12 shrink-0 tabular-nums text-slate-500">{r.ano}</span>
                  <span className="min-w-0 flex-1 text-slate-700">
                    {dinheiroCurto(r.comNumero)} de {dinheiroCurto(r.total)} com a emenda identificada
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-900">{pct(r.comNumero / r.total)}</span>
                </li>
              ))}
          </ul>
        </Conferencia>
      )}

      {i.concentracao.length > 0 && (
        <Conferencia
          titulo="Concentração em um só fornecedor"
          achou={i.concentracao.some((c) => c.valor / c.total > 0.3)}
          resultado={(() => {
            const c = i.concentracao.at(-1)!;
            return (
              <>
                Em {c.ano}, o fornecedor que mais recebeu dinheiro de emenda foi {c.fornecedor}, com {dinheiroCurto(c.valor)} ({pct(c.valor / c.total)} do total
                pago com emendas no ano).
              </>
            );
          })()}
        >
          <ul className="divide-y divide-slate-100 text-xs">
            {i.concentracao
              .slice()
              .reverse()
              .map((c) => (
                <li key={c.ano} className="flex items-baseline gap-3 py-1">
                  <span className="w-12 shrink-0 tabular-nums text-slate-500">{c.ano}</span>
                  <span className="min-w-0 flex-1 text-slate-700">{c.fornecedor}</span>
                  <span className="shrink-0 tabular-nums text-slate-900">
                    {dinheiroCurto(c.valor)} · {pct(c.valor / c.total)}
                  </span>
                </li>
              ))}
          </ul>
        </Conferencia>
      )}

      {i.relator.total > 0 && (
        <Conferencia
          titulo="Emendas de relator"
          achou
          resultado={
            <>
              Osasco recebeu {dinheiroCurto(i.relator.total)} em {i.relator.quantidade} emendas de relator, pagas em {lista(i.relator.anos)}. Nesse tipo de emenda o
              registro oficial não diz qual parlamentar pediu o dinheiro; o Supremo Tribunal Federal julgou o modelo inconstitucional em dezembro de 2022.
            </>
          }
        />
      )}

      {(i.pix.impedidos.length > 0 || i.pix.atrasados.length > 0 || i.pix.semObjeto > 0) && (
        <Conferencia
          titulo="Emendas Pix"
          achou={i.pix.atrasados.length > 0 || i.pix.semObjeto > 0}
          resultado={[
            i.pix.impedidos.length > 0 && `${i.pix.impedidos.length} foram barradas antes do pagamento (${dinheiroCurto(i.pix.impedidos.reduce((s, x) => s + x.valor, 0))} que não vieram).`,
            i.pix.atrasados.length > 0 && `${i.pix.atrasados.length} passaram do prazo de execução sem a prestação de contas concluída.`,
            i.pix.semObjeto > 0 && `${i.pix.semObjeto} ainda sem a descrição do que será feito.`,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <ul className="divide-y divide-slate-100 text-xs">
            {i.pix.atrasados.map((x, k) => (
              <li key={`a${k}`} className="flex items-baseline gap-3 py-1">
                <span className="min-w-0 flex-1 text-slate-700">
                  {x.autor}, emenda de {x.ano}: prazo até {dataBR(x.fim)}, plano {x.situacao.toLowerCase()}
                </span>
                <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(x.valor)}</span>
              </li>
            ))}
            {i.pix.impedidos.map((x, k) => (
              <li key={`i${k}`} className="flex items-baseline gap-3 py-1">
                <span className="min-w-0 flex-1 text-slate-700">
                  {x.autor}, emenda de {x.ano}: barrada
                </span>
                <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(x.valor)}</span>
              </li>
            ))}
          </ul>
        </Conferencia>
      )}

      {i.atrasadas.length > 0 && (
        <Conferencia
          titulo="Dinheiro que chegou anos depois"
          achou={false}
          resultado={`${i.atrasadas.length} emendas chegaram três anos ou mais depois do ano em que foram aprovadas, somando ${dinheiroCurto(i.atrasadas.reduce((s, x) => s + x.valor, 0))}. É dinheiro empenhado num ano e pago bem depois.`}
        >
          <ul className="divide-y divide-slate-100 text-xs">
            {i.atrasadas.map((x) => (
              <li key={x.codigo} className="flex items-baseline gap-3 py-1">
                <span className="min-w-0 flex-1 text-slate-700">
                  {x.autor}, emenda de {x.ano}, paga em {lista(x.anosRecebido)}
                </span>
                <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(x.valor)}</span>
              </li>
            ))}
          </ul>
        </Conferencia>
      )}

      {i.entidadesVariasFontes.length > 0 && (
        <Conferencia
          titulo="Entidades com emendas de mais de um político"
          achou={false}
          resultado={`${i.entidadesVariasFontes.length} entidades da cidade receberam emenda federal direto e também dinheiro de emenda de vereador pago pela Prefeitura.`}
        >
          <ul className="divide-y divide-slate-100 text-xs">
            {i.entidadesVariasFontes.map((e) => (
              <li key={e.nome} className="py-1">
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 font-medium text-slate-800">{e.nome}</span>
                  <span className="shrink-0 tabular-nums text-slate-900">{dinheiroCurto(e.federal + e.vereadores)}</span>
                </div>
                <div className="text-slate-500">
                  {dinheiroCurto(e.federal)} de emenda federal, {dinheiroCurto(e.vereadores)} de emenda de vereador · {lista(e.autores)}
                </div>
              </li>
            ))}
          </ul>
        </Conferencia>
      )}
    </ul>
  );
}
