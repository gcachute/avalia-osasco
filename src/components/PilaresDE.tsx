import type { Resultados, Transparencia } from "@/lib/dados";
import { milhoes, nota, nota10, num, plural } from "@/lib/formato";
import { Barra, Secao } from "./ui";

const sinal = (v: number | null, casas = 1) => (v == null ? "" : `${v > 0 ? "+" : v < 0 ? "−" : "±"}${num(Math.abs(v), casas)}`);

function Componente({ nome, pontos, children }: { nome: string; pontos: number | null; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="font-medium text-slate-900">{nome}</div>
        <div className="text-sm text-slate-600">{children}</div>
      </div>
      <div className="flex items-center gap-3 sm:w-48">
        <Barra valor={pontos ?? 0} classe={pontos == null ? "bg-slate-300" : "bg-blue-700"} />
        <span className="w-10 text-right text-sm tabular-nums text-slate-600">{nota(nota10(pontos))}</span>
      </div>
    </div>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: { chave: number; foco: boolean; celulas: React.ReactNode[] }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {cabecalho.map((h, i) => (
              <th key={h} className={`px-3 py-2 ${i ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {linhas.map((l) => (
            <tr key={l.chave} className={l.foco ? "bg-blue-50/60 font-medium" : ""}>
              {l.celulas.map((c, i) => (
                <td key={i} className={`px-3 py-2.5 tabular-nums ${i ? "text-right text-slate-700" : "text-slate-900"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PilarD({ r }: { r: Resultados }) {
  const o = r.cidades.find((c) => c.foco)!;
  const ordenadas = [...r.cidades].sort((a, b) => (a.ranking ?? 99) - (b.ranking ?? 99));
  const anoM = r.mortalidade?.ano;
  return (
    <Secao titulo="Pilar D · Resultados para o cidadão" id="pilar-D">
      <p className="-mt-2 mb-4 text-slate-600">
        Dois resultados que dependem muito da prefeitura: a qualidade das escolas municipais e a sobrevivência dos bebês no primeiro ano de vida.
        Cada item vale metade pela posição entre as cidades comparadas e metade pela evolução em relação à medição anterior.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-2 divide-y divide-slate-100">
        {r.ideb && (
          <Componente nome={`Educação · IDEB ${r.ideb.edicao}, anos iniciais da rede municipal`} pontos={o.componentes.educacao}>
            <span className="font-semibold text-slate-900">{num(o.ideb.valor)}</span> (em {r.ideb.anterior}: {num(o.ideb.anterior)}, {sinal(o.ideb.delta)}) ·{" "}
            {o.ideb.valor != null && `${r.cidades.filter((c) => (c.ideb.valor ?? -1) > o.ideb.valor!).length + 1}º de ${r.cidades.filter((c) => c.ideb.valor != null).length}`} entre as
            cidades comparadas ·{" "}
            <a href={r.ideb.fonte} className="text-blue-800 underline">
              planilha do INEP
            </a>
          </Componente>
        )}
        {r.mortalidade && (
          <Componente nome={`Saúde · mortalidade infantil em ${anoM}`} pontos={o.componentes.saude}>
            <span className="font-semibold text-slate-900">{num(o.mortalidade.taxa)} por mil nascidos vivos</span> ({o.mortalidade.obitos} óbitos de
            menores de 1 ano para {o.mortalidade.nascidos?.toLocaleString("pt-BR")} nascimentos; em {anoM! - 1}: {num(o.mortalidade.anterior)},{" "}
            {sinal(o.mortalidade.delta)}) ·{" "}
            {o.mortalidade.taxa != null && `${r.cidades.filter((c) => c.mortalidade.taxa != null && c.mortalidade.taxa < o.mortalidade.taxa!).length + 1}º de ${r.cidades.filter((c) => c.mortalidade.taxa != null).length}`}{" "}
            entre as cidades comparadas ·{" "}
            <a href={r.mortalidade.fonte} className="text-blue-800 underline">
              DataSUS
            </a>
          </Componente>
        )}
      </div>
      {r.mortalidade?.preliminar && (
        <p className="mt-2 text-xs text-slate-500">
          Os dados de {anoM} do DataSUS ainda são preliminares e podem mudar um pouco. Em cidades deste porte, a taxa oscila de um ano para outro, por
          isso a evolução vale só metade do item.
        </p>
      )}
      <div className="mt-4">
        <Tabela
          cabecalho={["Cidade", `IDEB ${r.ideb?.anterior ?? ""}`, `IDEB ${r.ideb?.edicao ?? ""}`, `Mortalidade ${anoM ? anoM - 1 : ""}`, `Mortalidade ${anoM ?? ""}`, "Pilar D"]}
          linhas={ordenadas.map((c) => ({
            chave: c.ibge,
            foco: c.foco,
            celulas: [c.nome, num(c.ideb.anterior), num(c.ideb.valor), num(c.mortalidade.anterior), num(c.mortalidade.taxa), nota(nota10(c.nota))],
          }))}
        />
        <p className="mt-2 text-xs text-slate-500">
          IDEB: 0 a 10, quanto maior melhor. Mortalidade infantil: óbitos de menores de 1 ano por mil nascidos vivos, por município de residência da
          mãe; quanto menor melhor. Melhorar {num(r.evolucao.ideb)} ponto no IDEB ou reduzir {num(r.evolucao.mortalidade)} na mortalidade vale a nota
          máxima na parte de evolução.
        </p>
      </div>
    </Secao>
  );
}

export function PilarE({ t }: { t: Transparencia }) {
  const o = t.cidades.find((c) => c.foco)!;
  const ordenadas = [...t.cidades].sort((a, b) => (a.ranking ?? 99) - (b.ranking ?? 99));
  const pct = (v: number | null | undefined) => (v == null ? "—" : `${num(v * 100)}%`);
  return (
    <Secao titulo="Pilar E · Transparência e entregas" id="pilar-E">
      <p className="-mt-2 mb-4 text-slate-600">
        Se a Prefeitura mostra o que faz com o dinheiro público, e se as obras que contratou estão andando.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-2 divide-y divide-slate-100">
        {t.pntp && (
          <Componente nome={`Transparência · Programa Nacional de Transparência Pública (ciclo ${t.pntp.ciclo})`} pontos={o.componentes.transparencia}>
            <span className="font-semibold text-slate-900">{pct(o.pntp?.indice)}</span> no índice de transparência do portal, nível {o.pntp?.nivel}{" "}
            ({sinal((o.pntp?.variacao ?? 0) * 100)}% em relação ao ciclo anterior) ·{" "}
            <a href={t.pntp.fonte} className="text-blue-800 underline">
              base aberta do PNTP
            </a>
          </Componente>
        )}
        {t.obras && (
          <Componente nome={`Obras · Painel de Obras do TCE-SP (data-base ${t.obras.dataBase})`} pontos={o.componentes.obras}>
            <span className="font-semibold text-slate-900">{pct(o.obras.parteProblema)}</span> do valor das obras do Executivo está paralisado ou
            atrasado ({plural(o.obras.paralisadas, "paralisada", "paralisadas")} e {plural(o.obras.atrasadas, "atrasada", "atrasadas")} de {o.obras.quantidade}, {milhoes(o.obras.valorProblema)} de{" "}
            {milhoes(o.obras.valorTotal)}). Zero ponto a partir de {num(t.limiteObras * 100, 0)}% ·{" "}
            <a href={t.obras.fonte} className="text-blue-800 underline">
              painel do TCE-SP
            </a>
          </Componente>
        )}
      </div>
      <div className="mt-4">
        <Tabela
          cabecalho={["Cidade", "Índice PNTP", "Nível", "Obras", "Paralisadas/atrasadas", "Valor com problema", "Pilar E"]}
          linhas={ordenadas.map((c) => ({
            chave: c.ibge,
            foco: c.foco,
            celulas: [
              <>
                {c.nome}
                {c.pntp && !c.pntp.validada && <span className="ml-1 text-xs font-normal text-slate-400">(PNTP não validado)</span>}
              </>,
              pct(c.pntp?.indice),
              c.pntp?.nivel ?? "—",
              c.obras.quantidade,
              `${c.obras.paralisadas} / ${c.obras.atrasadas}`,
              pct(c.obras.parteProblema),
              nota(nota10(c.nota)),
            ],
          }))}
        />
      </div>
      {o.obras.lista && o.obras.lista.length > 0 && (
        <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium text-slate-800">Obras do Executivo de Osasco no painel ({o.obras.lista.length})</summary>
          <ul className="mt-3 divide-y divide-slate-100">
            {o.obras.lista.map((x, i) => (
              <li key={i} className="py-2">
                <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${/paralisada|atrasada/i.test(x.situacao) ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-600"}`}>
                  {x.situacao}
                </span>
                <b className="text-slate-900">{milhoes(x.valor)}</b> · {x.contratante} · contrato de {x.ano}
                <div className="mt-0.5 text-slate-600">{x.objeto}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-2 text-xs text-slate-500">
        O plano era incluir também o cumprimento das metas do PPA 2026–2029, mas não encontramos um relatório de avaliação dessas metas em formato
        aberto. Quando houver, o item entra aqui.
      </p>
    </Secao>
  );
}
