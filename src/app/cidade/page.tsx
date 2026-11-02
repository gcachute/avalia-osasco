import type { Metadata } from "next";
import { Colunas } from "@/components/cidade/Colunas";
import { Barra, Cartao, ComoLer, Secao } from "@/components/ui";
import bruto from "@/data/cidade.json";
import { dinheiroCurto, reaisExato } from "@/lib/formato";

export const metadata: Metadata = {
  title: "A cidade",
  description: "Trânsito, dengue, empregos, empresas, Bolsa Família e obras do cadastro federal em Osasco, ano a ano, com o link de cada fonte.",
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
        completo: boolean;
        obras: { id: string; nome: string; descricao: string | null; situacao: string | null; tipo: string | null; inicioPrevisto: string | null; fimPrevisto: string | null; executor: string | null; fontes: { origem: string; valor: number | null }[] }[];
      })
    | null;
  riscos: (Fonte & { publicadoEm: string; areas: number; setores: Record<string, number> }) | null;
};
const cidade = bruto as unknown as Cidade;

const n = (v: number) => v.toLocaleString("pt-BR");
const comSinal = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${n(Math.abs(v))}`;
const mesTexto = (m: string) => `${m.slice(4, 6)}/${m.slice(0, 4)}`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesCurto = (m: string) => `${MESES[Number(m.slice(4, 6)) - 1]}/${m.slice(2, 4)}`;
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e"]);
const nomeRua = (r: string) =>
  /^[A-Z]{2} \d/.test(r)
    ? r
    : r
        .toLowerCase()
        .split(" ")
        .map((p, i) => (i && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
        .join(" ");

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

type Linha = { rotulo: string; valor: number; texto: string; nota?: string };

function Linhas({ titulo, linhas, limite = linhas.length }: { titulo: string; linhas: Linha[]; limite?: number }) {
  const maior = Math.max(...linhas.map((l) => Math.abs(l.valor)), 1);
  const item = (l: Linha) => (
    <li key={l.rotulo}>
      <div className="flex justify-between gap-3 text-sm text-slate-700">
        <span className="min-w-0 break-words">
          {l.rotulo}
          {l.nota && <span className="block text-xs text-slate-500">{l.nota}</span>}
        </span>
        <span className="shrink-0 tabular-nums">{l.texto}</span>
      </div>
      <Barra valor={Math.abs(l.valor) / maior} altura="h-1.5" classe={l.valor < 0 ? "bg-slate-400" : undefined} />
    </li>
  );
  const resto = linhas.slice(limite);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-900">{titulo}</div>
      <ul className="mt-3 space-y-2.5">{linhas.slice(0, limite).map(item)}</ul>
      {resto.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer py-1.5 font-medium text-blue-800">Ver mais {resto.length}</summary>
          <ul className="mt-1.5 space-y-2.5">{resto.map(item)}</ul>
        </details>
      )}
    </div>
  );
}

type Obra = NonNullable<Cidade["obras"]>["obras"][number];
const valorObra = (o: Obra) => o.fontes.reduce((s, f) => s + (f.valor ?? 0), 0);
// Algumas descrições vêm no formato "programa | código | nome da obra": fica só o que acrescenta ao título.
const descricaoObra = (o: Obra) => {
  const comeco = o.nome.slice(0, 30).toLowerCase();
  return (o.descricao ?? "")
    .split(" | ")
    .filter((p) => p.trim() && !/^cod_/i.test(p.trim()) && !p.trim().toLowerCase().startsWith(comeco))
    .join(" · ");
};

function CartaoObra({ o }: { o: Obra }) {
  const origens = [...new Set(o.fontes.map((f) => f.origem.toLowerCase()))];
  const descricao = descricaoObra(o);
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <div className="font-medium break-words text-slate-900">{o.nome}</div>
      {descricao && <p className="mt-0.5 line-clamp-2 break-words text-slate-600">{descricao}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        {valorObra(o) > 0 && (
          <span className="text-sm font-semibold tabular-nums text-slate-900" title={reaisExato(valorObra(o))}>
            {dinheiroCurto(valorObra(o))}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{o.situacao ?? "Situação não informada"}</span>
        {origens.length > 0 && <span>Recurso {origens.join(", ")}</span>}
      </div>
      {o.executor && <div className="mt-1 text-xs break-words text-slate-500">{o.executor}</div>}
    </li>
  );
}

export default function PaginaCidade() {
  const { transito, dengue, empresas, empregos, bolsa, obras, riscos } = cidade;
  const anoCompleto = transito ? transito.ruasDesde + 1 : new Date().getFullYear() - 1;
  const transitoAno = transito?.porAno.find((a) => a.ano === anoCompleto);
  const modos = transito?.mortesPorModo.find((a) => a.ano === anoCompleto)?.modos ?? {};
  const colunasDoenca = (nome: string) => {
    const anos = Object.entries(dengue?.doencas[nome] ?? {}).sort(([a], [b]) => Number(a) - Number(b));
    return anos.map(([ano, v], i) => {
      const parcial = i === anos.length - 1 && v.semanas < 52;
      return { rotulo: ano, valor: v.notificados, texto: n(v.notificados), parcial, detalhe: parcial ? `até a semana ${v.semanas}` : undefined };
    });
  };
  const bolsaMeses = Object.entries(bolsa?.meses ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const bolsaUltimo = bolsaMeses.at(-1);
  const empresasAnos = Object.entries(empresas?.porAno ?? {}).sort(([a], [b]) => Number(a) - Number(b)).slice(-10);
  const empresasUltimo = empresas?.porAno[empresas.ultimo];
  const setores = Object.entries(empresas?.setores ?? {}).sort((a, b) => (b[1].pessoal ?? 0) - (a[1].pessoal ?? 0));
  const obrasOrdem = [...(obras?.obras ?? [])].sort((a, b) => valorObra(b) - valorObra(a));

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
          <div className="grid gap-4 lg:grid-cols-3">
            <Colunas
              titulo="Mortes por ano"
              unidade="mortes"
              pontos={transito.porAno.map((a) => ({
                rotulo: String(a.ano),
                valor: a.mortos,
                texto: n(a.mortos),
                parcial: a.ano > anoCompleto,
                detalhe: `${n(a.sinistros)} ocorrências, ${n(a.graves)} feridos graves, ${n(a.leves)} leves`,
              }))}
            />
            {Object.keys(modos).length > 0 && (
              <Linhas
                titulo={`Como estavam as vítimas fatais em ${anoCompleto}`}
                linhas={Object.entries(modos)
                  .sort((a, b) => b[1] - a[1])
                  .map(([rotulo, v]) => ({ rotulo, valor: v, texto: n(v) }))}
              />
            )}
            <Linhas
              titulo={`Ruas com mais ocorrências desde ${transito.ruasDesde}`}
              limite={5}
              linhas={transito.ruas.slice(0, 10).map((r) => ({ rotulo: nomeRua(r.rua), valor: r.sinistros, texto: n(r.sinistros), nota: r.mortos ? `${n(r.mortos)} ${r.mortos === 1 ? "morte" : "mortes"}` : undefined }))}
            />
          </div>
          <Fonte f={transito} nota="O número de ocorrências por bairro está no mapa." />
        </Secao>
      )}

      {dengue && (
        <Secao titulo="Dengue e chikungunya" subtitulo="Casos notificados por ano. O ano em andamento vai até a última semana publicada.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Colunas titulo="Casos de dengue" unidade="casos" pontos={colunasDoenca("dengue")} />
            <Colunas titulo="Casos de chikungunya" unidade="casos" pontos={colunasDoenca("chikungunya")} />
          </div>
          <Fonte f={dengue} />
        </Secao>
      )}

      {empregos && (
        <Secao titulo="Empregos" subtitulo="Vagas com carteira assinada. Saldo é o número de admissões menos o de desligamentos.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Colunas
              titulo="Saldo por ano"
              unidade="de saldo"
              pontos={empregos.porAno.map((a) => ({
                rotulo: a.meses < 12 ? `${a.ano} (${a.meses} meses)` : String(a.ano),
                curto: String(a.ano),
                valor: a.saldo,
                texto: comSinal(a.saldo),
                parcial: a.meses < 12,
                detalhe: `${n(a.admissoes)} admissões, ${n(a.desligamentos)} desligamentos`,
              }))}
            />
            <Linhas
              titulo={`Saldo por setor em 12 meses, até ${mesTexto(empregos.ultimoMes)}`}
              limite={6}
              linhas={[...empregos.setores12].sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo)).map((s) => ({ rotulo: s.nome, valor: s.saldo, texto: comSinal(s.saldo) }))}
            />
          </div>
          <Fonte f={empregos} />
        </Secao>
      )}

      {empresas && (
        <Secao titulo="Empresas" subtitulo={`Cadastro do IBGE. O último ano publicado é ${empresas.ultimo}.`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Colunas titulo="Empresas por ano" unidade="empresas" pontos={empresasAnos.map(([ano, v]) => ({ rotulo: ano, valor: v.empresas ?? 0, texto: n(v.empresas ?? 0), detalhe: `${n(v.pessoal ?? 0)} pessoas ocupadas` }))} />
            <Linhas titulo={`Pessoas ocupadas por setor em ${empresas.ultimo}`} limite={6} linhas={setores.map(([nome, v]) => ({ rotulo: nome, valor: v.pessoal ?? 0, texto: n(v.pessoal ?? 0) }))} />
          </div>
          <Fonte f={empresas} />
        </Secao>
      )}

      {bolsa && bolsaMeses.length > 0 && (
        <Secao titulo="Bolsa Família" subtitulo="Famílias com pagamento no mês e valor pago na cidade. Só a soma: nenhuma pessoa aparece aqui. Os meses mostrados não são seguidos.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Colunas titulo="Famílias por mês" unidade="famílias" pontos={bolsaMeses.map(([m, v]) => ({ rotulo: mesTexto(m), curto: mesCurto(m), valor: v.familias, texto: n(v.familias) }))} />
            <Colunas titulo="Valor pago por mês" unidade="pagos" pontos={bolsaMeses.map(([m, v]) => ({ rotulo: mesTexto(m), curto: mesCurto(m), valor: v.valor, texto: dinheiroCurto(v.valor), detalhe: reaisExato(v.valor) }))} />
          </div>
          <Fonte f={bolsa} />
        </Secao>
      )}

      {riscos && (
        <Secao titulo="Áreas de risco" subtitulo={`Mapeamento do plano publicado pela Prefeitura em ${riscos.publicadoEm.split("-").reverse().join("/")}.`}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cartao titulo="Áreas de risco" valor={n(riscos.areas)} detalhe="na cidade" />
            {Object.entries(riscos.setores).map(([rotulo, v]) => (
              <Cartao key={rotulo} titulo={rotulo} valor={n(v)} detalhe="setores de risco" />
            ))}
          </div>
          <Fonte f={riscos} />
        </Secao>
      )}

      {obras && obras.obras.length > 0 && (
        <Secao titulo={`Obras no cadastro federal (${obras.obras.length})`} subtitulo="Obras registradas no sistema do governo federal que citam Osasco ou têm a Prefeitura como responsável, da maior para a menor.">
          {!obras.completo && <p className="mb-3 text-sm text-slate-600">A fonte parou de responder antes do fim da consulta, então esta lista está incompleta.</p>}
          <ul className="grid gap-3 lg:grid-cols-2">
            {obrasOrdem.slice(0, 6).map((o) => (
              <CartaoObra key={o.id} o={o} />
            ))}
          </ul>
          {obrasOrdem.length > 6 && (
            <details className="mt-3">
              <summary className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-blue-800">Ver mais {obrasOrdem.length - 6} obras</summary>
              <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                {obrasOrdem.slice(6).map((o) => (
                  <CartaoObra key={o.id} o={o} />
                ))}
              </ul>
            </details>
          )}
          <Fonte f={obras} />
        </Secao>
      )}

      <ComoLer>
        <li>Cada bloco mostra uma fonte oficial diferente, com o período que ela publica. Os anos não são os mesmos em todos os blocos.</li>
        <li>Nos gráficos de colunas, toque em uma coluna para ver o número dela. Coluna tracejada é um ano ainda incompleto, que fica assim até a fonte publicar os meses que faltam.</li>
        <li>Nos números de trânsito, as ocorrências sem ponto no mapa entram no total da cidade, mas não na conta por bairro.</li>
        <li>O saldo de empregos conta só vagas com carteira assinada. A conta de empresas vem de outra fonte e termina em outro ano.</li>
        <li>Nas obras, o valor é o investimento previsto e a situação é a que consta no cadastro. Cada registro aparece como foi cadastrado, mesmo com nome igual ao de outro.</li>
      </ComoLer>
    </>
  );
}
