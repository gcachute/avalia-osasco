import type { Metadata } from "next";
import { Barra, Cartao, ComoLer, Secao } from "@/components/ui";
import bruto from "@/data/cidade.json";
import { dinheiroCurto, reaisExato } from "@/lib/formato";

export const metadata: Metadata = {
  title: "A cidade",
  description: "Trânsito, dengue, empregos, empresas, Bolsa Família e obras federais em Osasco, ano a ano, com o link de cada fonte.",
};

type Fonte = { fonte: string; url: string; coletadoEm?: string };
type Cidade = {
  transito:
    | (Fonte & {
        porAno: { ano: number; sinistros: number; mortos: number; graves: number; leves: number }[];
        mortesPorModo: { ano: number; modos: Record<string, number> }[];
        ruas: { rua: string; sinistros: number; mortos: number }[];
        ruasDesde: number;
        semLocal: number;
      })
    | null;
  dengue: (Fonte & { doencas: Record<string, Record<string, { notificados: number; estimados: number; semanas: number }>> }) | null;
  empresas: (Fonte & { porAno: Record<string, { empresas?: number; pessoal?: number; assalariados?: number }>; ultimo: string; setores: Record<string, { empresas?: number; pessoal?: number }> }) | null;
  empregos:
    | (Fonte & {
        ultimoMes: string;
        porAno: { ano: number; admissoes: number; desligamentos: number; saldo: number; meses: number }[];
        saldo12: number;
        setores12: { nome: string; saldo: number }[];
      })
    | null;
  bolsa: (Fonte & { meses: Record<string, { familias: number; valor: number }> }) | null;
  obras:
    | (Fonte & {
        obras: { id: string; nome: string; descricao: string | null; situacao: string | null; tipo: string | null; inicioPrevisto: string | null; fimPrevisto: string | null; executor: string | null; fontes: { origem: string; valor: number | null }[] }[];
      })
    | null;
  riscos: (Fonte & { publicadoEm: string; areas: number; setores: Record<string, number> }) | null;
};
const cidade = bruto as unknown as Cidade;

const n = (v: number) => v.toLocaleString("pt-BR");
const comSinal = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${n(Math.abs(v))}`;
const mesTexto = (m: string) => `${m.slice(4, 6)}/${m.slice(0, 4)}`;

function Fonte({ f, nota }: { f: Fonte; nota?: string }) {
  return (
    <p className="mt-3 text-xs text-slate-500">
      Fonte:{" "}
      <a href={f.url} className="underline">
        {f.fonte}
      </a>
      .{nota ? ` ${nota}` : ""}
    </p>
  );
}

function Linhas({ titulo, linhas }: { titulo: string; linhas: { rotulo: string; valor: number; texto: string; nota?: string }[] }) {
  const maior = Math.max(...linhas.map((l) => Math.abs(l.valor)), 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-900">{titulo}</div>
      <ul className="mt-3 space-y-2.5">
        {linhas.map((l) => (
          <li key={l.rotulo}>
            <div className="flex justify-between gap-3 text-sm text-slate-700">
              <span className="min-w-0 break-words tabular-nums">{l.rotulo}</span>
              <span className="shrink-0 tabular-nums">{l.texto}</span>
            </div>
            <Barra valor={Math.abs(l.valor) / maior} altura="h-1.5" />
            {l.nota && <div className="text-xs text-slate-500">{l.nota}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PaginaCidade() {
  const { transito, dengue, empresas, empregos, bolsa, obras, riscos } = cidade;
  const anoCompleto = transito ? transito.ruasDesde + 1 : new Date().getFullYear() - 1;
  const transitoAno = transito?.porAno.find((a) => a.ano === anoCompleto);
  const modos = transito?.mortesPorModo.find((a) => a.ano === anoCompleto)?.modos ?? {};
  const dengueAnos = Object.entries(dengue?.doencas.dengue ?? {}).sort(([a], [b]) => Number(a) - Number(b));
  const bolsaMeses = Object.entries(bolsa?.meses ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const bolsaUltimo = bolsaMeses.at(-1);
  const empresasAnos = Object.entries(empresas?.porAno ?? {}).sort(([a], [b]) => Number(a) - Number(b)).slice(-10);
  const empresasUltimo = empresas?.porAno[empresas.ultimo];
  const setores = Object.entries(empresas?.setores ?? {})
    .sort((a, b) => (b[1].pessoal ?? 0) - (a[1].pessoal ?? 0))
    .slice(0, 8);
  const valorObra = (o: NonNullable<Cidade["obras"]>["obras"][number]) => o.fontes.reduce((s, f) => s + (f.valor ?? 0), 0);

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-7">
        <p className="text-sm font-medium text-blue-800">Osasco em números</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">A cidade</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Trânsito, saúde, trabalho, assistência social e obras, ano a ano, a partir dos registros oficiais e com o link de cada fonte.</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {transitoAno && <Cartao titulo={`Mortes no trânsito em ${anoCompleto}`} valor={n(transitoAno.mortos)} detalhe={`${n(transitoAno.sinistros)} ocorrências registradas`} />}
          {empregos && <Cartao titulo="Saldo de empregos em 12 meses" valor={comSinal(empregos.saldo12)} detalhe={`com carteira, até ${mesTexto(empregos.ultimoMes)}`} />}
          {bolsaUltimo && <Cartao titulo={`Bolsa Família em ${mesTexto(bolsaUltimo[0])}`} valor={n(bolsaUltimo[1].familias)} detalhe={`famílias, ${dinheiroCurto(bolsaUltimo[1].valor)} no mês`} />}
          {empresasUltimo?.empresas && <Cartao titulo={`Empresas em ${empresas!.ultimo}`} valor={n(empresasUltimo.empresas)} detalhe={`${n(empresasUltimo.pessoal ?? 0)} pessoas ocupadas`} />}
        </dl>
      </section>

      {transito && (
        <Secao titulo="Trânsito" subtitulo="Ocorrências com vítima ou notificadas às autoridades. Até 2018 só entram as que tiveram morte.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Linhas titulo="Mortes por ano" linhas={[...transito.porAno].reverse().map((a) => ({ rotulo: String(a.ano), valor: a.mortos, texto: n(a.mortos), nota: `${n(a.sinistros)} ocorrências, ${n(a.graves)} feridos graves, ${n(a.leves)} leves` }))} />
            <div className="space-y-4">
              {Object.keys(modos).length > 0 && (
                <Linhas
                  titulo={`Como estavam as vítimas fatais em ${anoCompleto}`}
                  linhas={Object.entries(modos)
                    .sort((a, b) => b[1] - a[1])
                    .map(([rotulo, v]) => ({ rotulo, valor: v, texto: n(v) }))}
                />
              )}
              <Linhas titulo={`Ruas com mais ocorrências desde ${transito.ruasDesde}`} linhas={transito.ruas.slice(0, 8).map((r) => ({ rotulo: r.rua, valor: r.sinistros, texto: n(r.sinistros), nota: r.mortos ? `${n(r.mortos)} mortes` : undefined }))} />
            </div>
          </div>
          <Fonte f={transito} nota="O número de ocorrências por bairro está no mapa." />
        </Secao>
      )}

      {dengue && (
        <Secao titulo="Dengue" subtitulo="Casos notificados por ano. O ano em andamento vai até a última semana publicada.">
          <Linhas titulo="Casos de dengue" linhas={[...dengueAnos].reverse().map(([ano, v]) => ({ rotulo: ano, valor: v.notificados, texto: n(v.notificados) }))} />
          <Fonte f={dengue} />
        </Secao>
      )}

      {empregos && (
        <Secao titulo="Empregos com carteira assinada" subtitulo="Saldo é o número de admissões menos o de desligamentos.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Linhas titulo="Saldo por ano" linhas={[...empregos.porAno].reverse().map((a) => ({ rotulo: a.meses < 12 ? `${a.ano} (${a.meses} meses)` : String(a.ano), valor: a.saldo, texto: comSinal(a.saldo), nota: `${n(a.admissoes)} admissões, ${n(a.desligamentos)} desligamentos` }))} />
            <Linhas titulo={`Saldo por setor em 12 meses, até ${mesTexto(empregos.ultimoMes)}`} linhas={empregos.setores12.slice(0, 10).map((s) => ({ rotulo: s.nome, valor: s.saldo, texto: comSinal(s.saldo) }))} />
          </div>
          <Fonte f={empregos} />
        </Secao>
      )}

      {empresas && (
        <Secao titulo="Empresas" subtitulo={`Cadastro do IBGE. O último ano publicado é ${empresas.ultimo}.`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Linhas titulo="Empresas por ano" linhas={[...empresasAnos].reverse().map(([ano, v]) => ({ rotulo: ano, valor: v.empresas ?? 0, texto: n(v.empresas ?? 0), nota: `${n(v.pessoal ?? 0)} pessoas ocupadas` }))} />
            <Linhas titulo={`Pessoas ocupadas por setor em ${empresas.ultimo}`} linhas={setores.map(([nome, v]) => ({ rotulo: nome, valor: v.pessoal ?? 0, texto: n(v.pessoal ?? 0) }))} />
          </div>
          <Fonte f={empresas} />
        </Secao>
      )}

      {bolsa && bolsaMeses.length > 0 && (
        <Secao titulo="Bolsa Família" subtitulo="Famílias com pagamento no mês e valor pago na cidade. Só a soma: nenhuma pessoa aparece aqui.">
          <Linhas titulo="Famílias por mês" linhas={[...bolsaMeses].reverse().map(([m, v]) => ({ rotulo: mesTexto(m), valor: v.familias, texto: n(v.familias), nota: reaisExato(v.valor) }))} />
          <Fonte f={bolsa} />
        </Secao>
      )}

      {riscos && (
        <Secao titulo="Áreas de risco" subtitulo={`Mapeamento do plano publicado pela Prefeitura em ${riscos.publicadoEm.split("-").reverse().join("/")}, com ${riscos.areas} áreas de risco na cidade.`}>
          <Linhas titulo="Setores de risco por tipo" linhas={Object.entries(riscos.setores).map(([rotulo, v]) => ({ rotulo, valor: v, texto: n(v) }))} />
          <Fonte f={riscos} />
        </Secao>
      )}

      {obras && obras.obras.length > 0 && (
        <Secao titulo={`Obras com dinheiro federal (${obras.obras.length})`} subtitulo="Obras cadastradas no sistema do governo federal que citam Osasco ou têm a Prefeitura como responsável.">
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4">
            {[...obras.obras]
              .sort((a, b) => valorObra(b) - valorObra(a))
              .map((o) => (
                <li key={o.id} className="py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 font-medium break-words text-slate-900">{o.nome}</span>
                    {valorObra(o) > 0 && (
                      <span className="shrink-0 tabular-nums text-slate-900" title={reaisExato(valorObra(o))}>
                        {dinheiroCurto(valorObra(o))}
                      </span>
                    )}
                  </div>
                  {o.descricao && <p className="mt-0.5 line-clamp-3 break-words text-slate-600">{o.descricao}</p>}
                  <p className="mt-0.5 text-xs text-slate-500">
                    {o.situacao ?? "Situação não informada"}
                    {o.executor ? ` · ${o.executor}` : ""}
                  </p>
                </li>
              ))}
          </ul>
          <Fonte f={obras} />
        </Secao>
      )}

      <ComoLer>
        <li>Cada bloco mostra uma fonte oficial diferente, com o período que ela publica. Os anos não são os mesmos em todos os blocos.</li>
        <li>O ano em andamento fica incompleto até a fonte publicar os meses que faltam.</li>
        <li>Nos números de trânsito, as ocorrências sem ponto no mapa entram no total da cidade, mas não na conta por bairro.</li>
        <li>O saldo de empregos conta só vagas com carteira assinada. A conta de empresas vem de outra fonte e termina em outro ano.</li>
      </ComoLer>
    </>
  );
}
