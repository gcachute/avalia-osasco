"use client";

import { useState } from "react";
import { Abre } from "@/components/movimento/Movimento";
import { Contratacoes, parteSemLicitacao, somaModalidades } from "@/components/dinheiro/Contratacoes";
import { ListaPunidos } from "@/components/dinheiro/Punidos";
import type { Integridade } from "@/lib/dinheiro";
import { dataBR, dinheiroCurto, listaBR, pct } from "@/lib/formato";

// Cada conferência é um cartão: o que foi conferido, o resultado em uma frase e, ao abrir, os casos.
function Conferencia({
  titulo,
  resultado,
  achou,
  children,
}: {
  titulo: string;
  resultado: React.ReactNode;
  achou?: boolean;
  children?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <li className={`revelar rounded-xl border bg-white transition-[border-color,box-shadow] duration-200 ${aberto ? "border-slate-300 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
      <button
        type="button"
        onClick={() => children && setAberto(!aberto)}
        aria-expanded={children ? aberto : undefined}
        className={`flex w-full items-start gap-3 rounded-xl p-4 text-left ${children ? "" : "cursor-default"}`}
      >
        {achou !== undefined && (
          <span
            className={`selo-pula mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${achou ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
            aria-label={achou ? "Caso encontrado" : "Nada encontrado"}
          >
            {achou ? "!" : "✓"}
          </span>
        )}
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
      {children && (
        <Abre aberto={aberto}>
          <div className="border-t border-slate-100 px-4 pt-3 pb-4 text-sm">{children}</div>
        </Abre>
      )}
    </li>
  );
}

export function ConferenciasIntegridade({ i }: { i: Integridade }) {
  const pagosDurante = i.punidos.filter((p) => p.punicoes.some((s) => s.valeParaOsasco && s.pagoDurante > 0));
  const valemDepois = i.punidos.filter((p) => !pagosDurante.includes(p) && p.punicoes.some((s) => s.valeParaOsasco));
  const outros = i.punidos.filter((p) => !pagosDurante.includes(p) && !valemDepois.includes(p));
  const datas = [...new Set(Object.values(i.listas))].map(dataBR).join(" e ");

  const comEmendas = i.modalidades.filter((m) => m.emendas.total > m.emendas.semContratacao);
  const emendasTodas = somaModalidades(comEmendas.map((m) => m.emendas));
  const rastreioTotal = i.rastreio.reduce((a, r) => ({ total: a.total + r.total, comNumero: a.comNumero + r.comNumero }), { total: 0, comNumero: 0 });

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
          <ListaPunidos punidos={i.punidos} />
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
          resultado={
            <>
              {pct(parteSemLicitacao(emendasTodas))} das compras e serviços pagos com dinheiro de emenda desde {comEmendas[0].ano} (
              {dinheiroCurto(emendasTodas.dispensa + emendasTodas.inexigivel)} de {dinheiroCurto(emendasTodas.total - emendasTodas.semContratacao)}) foram contratados sem
              licitação, ou seja, sem disputa entre empresas. Em todas as verbas de fora, essa parte é de {pct(parteSemLicitacao(somaModalidades(i.modalidades.map((m) => m.todos))))}.
            </>
          }
        >
          <Contratacoes i={i} />
        </Conferencia>
      )}

      {i.rastreio.length > 0 && (
        <Conferencia
          titulo="Dá para seguir cada emenda até a nota?"
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
          resultado={
            <>
              Osasco recebeu {dinheiroCurto(i.relator.total)} em {i.relator.quantidade} emendas de relator, pagas em {listaBR(i.relator.anos)}. Nesse tipo de emenda o
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
          resultado={`${i.atrasadas.length} emendas chegaram três anos ou mais depois do ano em que foram aprovadas, somando ${dinheiroCurto(i.atrasadas.reduce((s, x) => s + x.valor, 0))}.`}
        >
          <ul className="divide-y divide-slate-100 text-xs">
            {i.atrasadas.map((x) => (
              <li key={x.codigo} className="flex items-baseline gap-3 py-1">
                <span className="min-w-0 flex-1 text-slate-700">
                  {x.autor}, emenda de {x.ano}, paga em {listaBR(x.anosRecebido)}
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
                  {dinheiroCurto(e.federal)} de emenda federal, {dinheiroCurto(e.vereadores)} de emenda de vereador · {listaBR(e.autores)}
                </div>
              </li>
            ))}
          </ul>
        </Conferencia>
      )}
    </ul>
  );
}
