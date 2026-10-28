import type { Integridade } from "@/lib/dados";
import { dataBR } from "@/lib/dados";
import { PedidoCorrecao } from "./PedidoCorrecao";
import { NotaBadge } from "./ui";

// Seção de integridade do perfil (vereador ou prefeito). Mostra só o que a fonte oficial publica, com processo e data,
// e os avisos de que processos em andamento não entram e de que conta irregular não é condenação criminal.
const ROTULO_FONTE = { tce: "Tribunal de Contas do Estado (TCE-SP)", cnj: "Conselho Nacional de Justiça (CNJ)" } as const;

export function SecaoIntegridade({ integridade, nota, quem }: { integridade: Integridade; nota: number | null; quem: string }) {
  const { registros, fontes } = integridade;
  const consulta = [fontes.tce.consultadoEm, fontes.cnj.consultadoEm].sort().at(-1)!;
  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border p-4 ${registros.length ? "border-rose-300 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">
            {registros.length
              ? `${registros.length === 1 ? "1 registro" : `${registros.length} registros`} em fonte oficial`
              : "Nada consta nas fontes consultadas"}
          </p>
          <NotaBadge valor={nota == null ? null : nota * 10} />
        </div>
        {registros.length > 0 && (
          <ul className="mt-3 space-y-3">
            {registros.map((r) => (
              <li key={r.processo} className="rounded-xl bg-white/70 p-3 text-sm">
                <div className="font-medium">
                  {r.fonte === "tce" ? "Contas julgadas irregulares" : "Condenação por improbidade administrativa"}: {r.tipo.toLowerCase()} · {r.orgao} ·
                  exercício de {r.exercicio}
                </div>
                <div className="mt-0.5 text-xs opacity-80">
                  {ROTULO_FONTE[r.fonte]} · processo {r.processo} · decisão definitiva em {dataBR(r.decisaoDefinitiva)} ·{" "}
                  <a className="underline" href={fontes[r.fonte].url}>
                    ver na fonte oficial
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs">
          Fontes consultadas em {dataBR(consulta)}:{" "}
          <a className="underline" href={fontes.tce.url}>
            {fontes.tce.nome}
          </a>{" "}
          (posição de {dataBR(fontes.tce.posicao ?? fontes.tce.consultadoEm)}) e{" "}
          <a className="underline" href={fontes.cnj.url}>
            {fontes.cnj.nome}
          </a>
          .
        </p>
      </div>

      <aside role="note" className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Como ler esta parte</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Entram só <b>decisões definitivas</b> publicadas por órgãos oficiais. Investigações, denúncias, processos em andamento e notícias não
            entram: todos têm direito à presunção de inocência.
          </li>
          <li>
            Contas julgadas irregulares são uma decisão administrativa do Tribunal de Contas sobre a gestão de dinheiro público. Não são condenação
            criminal e não tornam ninguém inelegível automaticamente; isso depende da Justiça Eleitoral.
          </li>
          <li>
            O site reproduz o que a fonte publica, com o número do processo e a data, sem juízo de valor sobre {quem}. A identificação foi conferida
            pelo nome completo e pelos números do documento que a própria fonte mostra.
          </li>
          <li>
            Se uma decisão foi revista, anulada ou não é desta pessoa, ou se faltar algum registro, o site corrige assim que a fonte oficial confirmar.{" "}
            <PedidoCorrecao className="font-semibold underline">Pedir uma correção</PedidoCorrecao>
          </li>
        </ul>
      </aside>
    </div>
  );
}
