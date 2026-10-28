// A conta por trás das notas dos pilares A e B do prefeito: a regra de cada item aplicada ao número de
// Osasco, a média que dá a nota e a tabela com todas as cidades comparadas.
import type { AnoFiscal, CidadeFiscal, Fiscal } from "@/lib/dados";
import { nota, nota10, num } from "@/lib/formato";

const pts = (x: number | null | undefined) => (x == null ? "—" : nota(nota10(x)));
const pct = (x: number | null | undefined, casas = 1) => (x == null ? "—" : `${num(x, casas)}%`);
const lugar = (cidades: CidadeFiscal[], c: CidadeFiscal, k: "pessoal" | "investimento" | "saude" | "educacao" | "fundeb", maiorMelhor = true) => {
  const vals = cidades.map((x) => x.indicadores[k]).filter((v): v is number => v != null);
  const v = c.indicadores[k];
  if (v == null) return null;
  return 1 + vals.filter((x) => (maiorMelhor ? x > v : x < v)).length;
};
const primarioTexto = (c: CidadeFiscal) => {
  const p = c.indicadores.primario;
  if (!p) return "—";
  return p.diferencaRCL >= 0 ? `meta cumprida (+${num(p.diferencaRCL, 1)}% da RCL)` : `${num(Math.abs(p.diferencaRCL), 1)}% da RCL abaixo da meta`;
};

function Formula({ nomes, valores, total, zerado }: { nomes: string[]; valores: (number | null)[]; total: number | null; zerado?: string }) {
  return (
    <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950 ring-1 ring-inset ring-blue-200">
      {zerado ? (
        <>
          <b>Nota do pilar = 0</b>, porque {zerado}.
        </>
      ) : (
        <>
          <b>Nota do pilar</b> = ({nomes.map((n, k) => `${n} ${pts(valores[k])}`).join(" + ")}) ÷ {valores.filter((v) => v != null).length} ={" "}
          <b className="tabular-nums">{pts(total)}</b>
        </>
      )}
    </div>
  );
}

function Tabela({
  a,
  pilar,
  colunas,
}: {
  a: AnoFiscal;
  pilar: "A" | "B";
  colunas: { nome: string; valor: (c: CidadeFiscal) => string; pontos: (c: CidadeFiscal) => number | null }[];
}) {
  const cidades = a.cidades.filter((c) => c.pilares[pilar].nota != null).sort((x, y) => (x.pilares[pilar].ranking ?? 99) - (y.pilares[pilar].ranking ?? 99));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Cidade</th>
            {colunas.map((c) => (
              <th key={c.nome} className="px-3 py-2 text-right">
                {c.nome}
                <div className="font-normal normal-case">valor · pontos</div>
              </th>
            ))}
            <th className="px-3 py-2 text-right">Nota</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cidades.map((c) => (
            <tr key={c.ibge} className={c.foco ? "bg-blue-50 font-medium text-slate-900" : "text-slate-700"}>
              <td className="px-3 py-2 tabular-nums text-slate-500">{c.pilares[pilar].ranking}º</td>
              <td className="px-3 py-2">{c.nome}</td>
              {colunas.map((col) => (
                <td key={col.nome} className="px-3 py-2 text-right tabular-nums">
                  {col.valor(c)} <span className="text-slate-400">·</span> <b>{pts(col.pontos(c))}</b>
                </td>
              ))}
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{pts(c.pilares[pilar].nota)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContaPilarA({ a, c, f }: { a: AnoFiscal; c: CidadeFiscal; f: Fiscal }) {
  const r = f.referencias.pessoal;
  const k = c.pilares.A.componentes;
  const i = c.indicadores;
  const n = a.cidades.filter((x) => x.indicadores.investimento != null).length;
  return (
    <div className="space-y-3">
      <Formula nomes={["pessoal", "investimento", "primário"]} valores={[k.pessoal, k.investimento, k.primario]} total={c.pilares.A.nota} />
      <ul className="space-y-2 text-sm text-slate-700">
        <li>
          <b>Gasto com pessoal:</b> até {num(r.otimo, 0)}% da receita corrente líquida vale 10; no limite de alerta ({num(r.alerta)}%) vale 5; no máximo da
          Lei de Responsabilidade Fiscal ({num(r.maximo, 0)}%) vale 0, em linha reta entre esses pontos. Osasco gastou <b>{pct(i.pessoal)}</b> →{" "}
          <b>{pts(k.pessoal)}</b>.
        </li>
        <li>
          <b>Investimento:</b> comparado com as outras {n - 1} cidades. A que mais investe vale 10 e a que menos investe vale 0. Osasco investiu{" "}
          <b>{pct(i.investimento)}</b> da despesa, o {lugar(a.cidades, c, "investimento")}º maior entre {n} → <b>{pts(k.investimento)}</b>.
        </li>
        <li>
          <b>Resultado primário:</b> cumprir a meta da Lei de Diretrizes Orçamentárias vale 10; ficar {num(f.referencias.toleranciaPrimario, 0)}% da receita
          corrente líquida abaixo da meta, ou mais, vale 0. Osasco: <b>{primarioTexto(c)}</b> → <b>{pts(k.primario)}</b>.
        </li>
      </ul>
      <p className="text-sm text-slate-700">
        Posição de Osasco no pilar: <b>{c.pilares.A.ranking}º</b> entre {a.cidades.filter((x) => x.pilares.A.nota != null).length} cidades.
      </p>
      <Tabela
        a={a}
        pilar="A"
        colunas={[
          { nome: "Pessoal", valor: (x) => pct(x.indicadores.pessoal), pontos: (x) => x.pilares.A.componentes.pessoal },
          { nome: "Investimento", valor: (x) => pct(x.indicadores.investimento), pontos: (x) => x.pilares.A.componentes.investimento },
          {
            nome: "Primário × meta",
            valor: (x) => {
              const d = x.indicadores.primario?.diferencaRCL;
              if (d == null) return "—";
              return Math.abs(d) < 0.05 ? "0,0%" : `${d > 0 ? "+" : "−"}${num(Math.abs(d), 1)}%`;
            },
            pontos: (x) => x.pilares.A.componentes.primario,
          },
        ]}
      />
      <p className="text-xs text-slate-500">
        Primário × meta: diferença entre o resultado e a meta da LDO, em % da receita corrente líquida (positivo = meta cumprida). Fonte: relatórios
        fiscais enviados ao Tesouro Nacional (SICONFI), ano de {a.ano}.
      </p>
    </div>
  );
}

export function ContaPilarB({ a, c, f }: { a: AnoFiscal; c: CidadeFiscal; f: Fiscal }) {
  const m = f.referencias.minimos;
  const k = c.pilares.B.componentes;
  const i = c.indicadores;
  const n = a.cidades.filter((x) => x.pilares.B.nota != null).length;
  const NOMES = { saude: "saúde", educacao: "educação", fundeb: "FUNDEB" } as const;
  // Cada item compara só as cidades que informaram aquele número (Ribeirão Preto, por exemplo, não informou saúde).
  const linhas = (["saude", "educacao", "fundeb"] as const).map((x) => ({
    k: x,
    nome: NOMES[x],
    min: m[x],
    v: i[x],
    p: k[x],
    lugar: lugar(a.cidades, c, x),
    entre: a.cidades.filter((y) => y.pilares.B.nota != null && y.indicadores[x] != null).length,
  }));
  const zerado = c.pilares.B.descumpridos.length ? `Osasco ficou abaixo do mínimo legal em ${c.pilares.B.descumpridos.map((x) => NOMES[x as keyof typeof NOMES] ?? x).join(" e ")}` : undefined;
  return (
    <div className="space-y-3">
      <Formula nomes={["saúde", "educação", "FUNDEB"]} valores={[k.saude, k.educacao, k.fundeb]} total={c.pilares.B.nota} zerado={zerado} />
      <p className="text-sm text-slate-700">
        <b>Regra:</b> cumprir o mínimo da Constituição vale 5. Os outros 5 pontos dependem da posição entre as {n} cidades: quem aplica mais leva 10, quem
        aplica menos (sem descumprir) leva 5. Ficar abaixo de qualquer mínimo zera o pilar.
      </p>
      <ul className="space-y-1.5 text-sm text-slate-700">
        {linhas.map((l) => (
          <li key={l.k}>
            <b className="capitalize">{l.nome}:</b> Osasco aplicou <b>{pct(l.v)}</b> (mínimo {l.min}%), o {l.lugar}º maior entre {l.entre} → <b>{pts(l.p)}</b>.
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-700">
        Posição de Osasco no pilar: <b>{c.pilares.B.ranking}º</b> entre {n} cidades.
      </p>
      <Tabela
        a={a}
        pilar="B"
        colunas={[
          { nome: `Saúde (mín. ${m.saude}%)`, valor: (x) => pct(x.indicadores.saude), pontos: (x) => x.pilares.B.componentes.saude },
          { nome: `Educação (mín. ${m.educacao}%)`, valor: (x) => pct(x.indicadores.educacao), pontos: (x) => x.pilares.B.componentes.educacao },
          { nome: `FUNDEB (mín. ${m.fundeb}%)`, valor: (x) => pct(x.indicadores.fundeb), pontos: (x) => x.pilares.B.componentes.fundeb },
        ]}
      />
      <p className="text-xs text-slate-500">Fonte: relatórios fiscais enviados ao Tesouro Nacional (SICONFI), ano de {a.ano}.</p>
    </div>
  );
}
