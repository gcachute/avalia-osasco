import type { Camara } from "@/lib/dados";
import { milReais, num, reais } from "@/lib/formato";

const mi = (v: number) => `R$ ${num(v / 1e6, 1)} mi`;

// Quanto custa um mandato: subsídio do vereador mais os cargos do gabinete, pelo Quadro de Pessoal da Câmara.
export function CustoMandato({ custo, compacto = false }: { custo: NonNullable<Camara["custoMandato"]>; compacto?: boolean }) {
  const linhas = [{ cargo: "Vereador (subsídio)", quantidade: 1, vencimento: custo.subsidio }, ...custo.gabinete];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-sm text-slate-500">Por mês, em salários</div>
          <div className="text-3xl font-semibold tabular-nums text-slate-900">{milReais(custo.totalMensal)}</div>
        </div>
        <div className="text-right text-sm text-slate-500">
          ≈ {mi(custo.totalMensal * 12)} por ano
          <div className="text-xs">vereador + {custo.assessores} assessores</div>
        </div>
      </div>
      {!compacto && (
        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {linhas.map((l) => (
              <tr key={l.cargo}>
                <td className="py-1.5 text-slate-700">
                  {l.quantidade > 1 && <span className="tabular-nums text-slate-400">{l.quantidade} × </span>}
                  {l.cargo}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">{reais(l.vencimento * l.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-slate-500">
        A lei dá a mesma estrutura a todos os {num(21, 0)} gabinetes, por isso o custo não entra na nota. São vencimentos, sem encargos, 13º e
        benefícios. Fonte:{" "}
        <a href={custo.url} className="underline">
          {custo.fonte}
        </a>
        .
      </p>
    </div>
  );
}

// Despesa paga pela Câmara no ano, segundo os dados enviados ao TCE-SP.
export function DespesasCamara({ despesas }: { despesas: NonNullable<Camara["despesas"]> }) {
  const anos = Object.entries(despesas.anos).sort(([a], [b]) => Number(a) - Number(b));
  const [ano, d] = anos.find(([, x]) => x.meses === 12) ?? anos.at(-1)!;
  const max = d.maioresFornecedores[0]?.pago || 1;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-sm text-slate-500">Despesa paga pela Câmara em {ano}</div>
          <div className="text-3xl font-semibold tabular-nums text-slate-900">{mi(d.pago)}</div>
        </div>
        <div className="text-right text-sm text-slate-500">≈ {mi(d.pago / 21)} por vereador</div>
      </div>
      <div className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Para quem foi o dinheiro</div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {d.maioresFornecedores.map((f) => (
          <li key={f.nome} className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-3">
            <div className="min-w-0">
              <div className="truncate text-slate-700" title={f.nome}>
                {/c[aâ]mara municipal/i.test(f.nome) ? "Folha de pessoal (repasse à conta da própria Câmara)" : f.nome.toLowerCase()}
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="barra-anim h-full rounded-full bg-blue-600" style={{ width: `${(f.pago / max) * 100}%` }} />
              </div>
            </div>
            <span className="text-right tabular-nums text-slate-600">{mi(f.pago)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Valores efetivamente pagos no ano. Não aparecem diárias ou ressarcimentos pagos diretamente a vereadores nesses
        dados. Fonte:{" "}
        <a href={despesas.url} className="underline">
          {despesas.fonte}
        </a>
        , consultado em {despesas.coletadoEm.split("-").reverse().join("/")}.
      </p>
    </div>
  );
}
