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
  // O último ano fechado (com os 12 meses); os anteriores aparecem na página Evolução.
  const [ano, d] = [...anos].reverse().find(([, x]) => x.meses === 12) ?? anos.at(-1)!;
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
                {/c[aâ]mara municipal/i.test(f.nome) ? "Folha de pessoal (repasse à conta da própria Câmara)" : razaoSocial(f.nome)}
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
        dados; a Ouvidoria Legislativa confirmou, em resposta a pedido de acesso à informação (27/10/2026), que a Câmara não paga diárias,
        auxílios ou verbas de gabinete aos vereadores. Fonte:{" "}
        <a href={despesas.url} className="underline">
          {despesas.fonte}
        </a>
        , consultado em {despesas.coletadoEm.split("-").reverse().join("/")}.
      </p>
    </div>
  );
}

// Razão social como o AUDESP grava (maiúsculas, sem acento) escrita como nome: "TETO CONSTRUTORA S A" -> "Teto Construtora S.A.".
const SIGLAS = new Set(["RDM", "MXA", "FT", "IPMO", "FAPETEC", "ME", "EPP", "EIRELI", "KA"]);
const MINUSCULAS = new Set(["a", "ao", "de", "da", "do", "das", "dos", "e", "em", "para"]);
const ACENTOS: Record<string, string> = {
  construcoes: "construções", servicos: "serviços", comercio: "comércio", fundacao: "fundação", previdencia: "previdência",
  municipio: "município", mun: "mun.", tecnol: "tecnol.", comunicacao: "comunicação", informatica: "informática", seguranca: "segurança",
  vigilancia: "vigilância", solucoes: "soluções", tecnologicas: "tecnológicas", producoes: "produções", agencia: "agência",
  negocios: "negócios", jornalistica: "jornalística", beneficios: "benefícios", gestao: "gestão", camara: "câmara",
};
const razaoSocial = (nome: string) =>
  nome
    .replace(/ S ?A$/, " S.A.")
    .split(/\s+/)
    .map((p, i) => {
      const w = p.toLowerCase();
      if (p === "S.A.") return p;
      if (w === "ltda") return "Ltda.";
      if (SIGLAS.has(p)) return p;
      if (i > 0 && MINUSCULAS.has(w)) return w;
      const c = ACENTOS[w] ?? w;
      return c.charAt(0).toUpperCase() + c.slice(1);
    })
    .join(" ");

const MESES_NOME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const rotuloMesFolha = (m: string) => `${MESES_NOME[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;
const titulo = (s: string) =>
  s
    .toLowerCase()
    .replace(/^\p{L}/u, (c) => c.toUpperCase())
    .replace(/coordenacao/, "coordenação")
    .replace(/ (i{1,3})$/, (m) => m.toUpperCase());

// Folha real do último mês publicado no Portal do Cidadão: o que foi pago, em valores brutos.
export function FolhaCamara({ folha }: { folha: NonNullable<Camara["folha"]> }) {
  const mes = Object.keys(folha.meses).sort().at(-1)!;
  const m = folha.meses[mes];
  // Um chefe de gabinete por vereador: é o melhor número de gabinetes que o relatório permite contar.
  const gabinetes = Math.max(m.vereadores.pessoas, m.gabinetes.porCargo.find((c) => c.cargo === "CHEFE DE GABINETE")?.pessoas ?? 0) || 21;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-sm text-slate-500">Folha paga em {rotuloMesFolha(mes)} (bruto)</div>
          <div className="text-3xl font-semibold tabular-nums text-slate-900">{m.todos ? mi(m.todos.bruto) : mi(m.gabinetes.bruto + m.vereadores.bruto)}</div>
        </div>
        <div className="text-right text-sm text-slate-500">{m.todos ? `${num(m.todos.pessoas, 0)} pessoas na Câmara` : ""}</div>
      </div>
      <table className="mt-4 w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-1.5 text-slate-700">
              <span className="tabular-nums text-slate-400">{m.vereadores.pessoas} × </span>Vereadores
            </td>
            <td className="py-1.5 text-right tabular-nums text-slate-600">{reais(m.vereadores.bruto)}</td>
          </tr>
          {m.gabinetes.porCargo.map((c) => (
            <tr key={c.cargo}>
              <td className="py-1.5 text-slate-700">
                <span className="tabular-nums text-slate-400">{c.pessoas} × </span>
                {titulo(c.cargo)}
              </td>
              <td className="py-1.5 text-right tabular-nums text-slate-600">{reais(c.bruto)}</td>
            </tr>
          ))}
          <tr className="font-medium">
            <td className="py-1.5 text-slate-900">Média por gabinete ({gabinetes} gabinetes, só assessores)</td>
            <td className="py-1.5 text-right tabular-nums text-slate-900">{reais(m.gabinetes.bruto / gabinetes)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500">
        Valores brutos da folha normal, servidores ativos. O relatório oficial não informa o gabinete de cada assessor, por isso a conta por gabinete é uma
        média. Nomes de assessores não são publicados aqui. Fonte:{" "}
        <a href={folha.url} className="underline">
          Portal do Cidadão da Câmara (Folha de pagamento sintético)
        </a>
        .
      </p>
    </div>
  );
}
