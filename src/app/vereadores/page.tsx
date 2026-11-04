import type { Metadata } from "next";
import Link from "next/link";
import { AvisoParcial, Avatar, ComoLer, Secao, SeloPartido } from "@/components/ui";
import { COEFICIENTES, dados, type Vereador } from "@/lib/dados";
import { nota10, num } from "@/lib/formato";

export const metadata: Metadata = { title: "Vereadores" };

const porNome = (a: Vereador, b: Vereador) => a.nome.localeCompare(b.nome, "pt-BR");

// Uma linha por vereador, como numa tabela de jornal: nome e partido à esquerda, as quatro notas em colunas alinhadas.
// No celular as notas descem para uma segunda linha, na mesma ordem do cabeçalho.
const COLUNAS = "md:grid md:grid-cols-[minmax(0,1fr)_repeat(4,5.5rem)] md:items-center md:gap-x-4";

function Cabecalho() {
  return (
    <div className={`hidden border-b border-slate-300 pb-2 text-xs text-slate-500 ${COLUNAS}`} aria-hidden>
      <span>Vereador</span>
      {COEFICIENTES.map((c) => (
        <span key={c.chave} className="text-right">
          {c.nome}
        </span>
      ))}
    </div>
  );
}

function Linha({ v, avaliados }: { v: Vereador; avaliados: number }) {
  const temNota = v.coeficientes.producao != null;
  return (
    <li className="border-b border-slate-200">
      <Link href={`/vereadores/${v.id}`} className={`group block py-3 ${COLUNAS}`}>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar nome={v.nome} foto={v.foto} tamanho={40} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-950 group-hover:underline group-hover:underline-offset-4">{v.nome}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <SeloPartido sigla={v.partido} logo={v.partidoLogo} />
              {v.perfil?.mesa && <span>{v.perfil.mesa}</span>}
            </div>
          </div>
        </div>
        {temNota ? (
          <dl className="mt-2 grid grid-cols-4 gap-x-2 md:contents">
            {COEFICIENTES.map((c) => (
              <div key={c.chave} className="md:text-right">
                <dt className="text-[11px] text-slate-500 md:sr-only">{c.nome}</dt>
                <dd
                  className={`font-serif text-lg leading-tight font-semibold tabular-nums ${
                    c.chave === "integridade" && (v.coeficientes.integridade ?? 1) < 0.7
                      ? (v.coeficientes.integridade ?? 1) < 0.5
                        ? "text-rose-700"
                        : "text-amber-700"
                      : "text-slate-950"
                  }`}
                >
                  {num(nota10(v.coeficientes[c.chave]), 1)}
                </dd>
                {v.rankings[c.chave] && (
                  <dd className="text-[11px] tabular-nums text-slate-500">
                    {v.rankings[c.chave]}º de {avaliados}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-xs text-slate-500 md:col-span-4 md:mt-0 md:text-right">
            {v.indicadores.sessoes} sessões no período: poucas para calcular as notas (mínimo {dados.metodologia.vereador.minimoSessoes}).
          </p>
        )}
      </Link>
    </li>
  );
}

export default function Vereadores() {
  const ativos = dados.vereadores.filter((v) => v.emExercicio).sort(porNome);
  const saiu = dados.vereadores.filter((v) => !v.emExercicio).sort(porNome);
  const avaliados = dados.vereadores.filter((v) => v.coeficientes.producao != null).length;

  return (
    <>
      <h1 className="text-4xl font-semibold text-slate-950">Vereadores de Osasco</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Quem está na Câmara na legislatura 2025–2028, com as notas de participação, produção e eficiência. Clique em um nome para ver o perfil
        completo e a conta por trás de cada nota. Para ordenar e comparar, use a lista do{" "}
        <Link href="/" className="underline">
          painel
        </Link>
        .
      </p>
      <AvisoParcial className="mt-5" />

      <Secao titulo={`Em exercício (${ativos.length})`}>
        <Cabecalho />
        <ol>
          {ativos.map((v) => (
            <Linha key={v.id} v={v} avaliados={avaliados} />
          ))}
        </ol>
      </Secao>

      {saiu.length > 0 && (
        <Secao titulo={`Passaram pela Câmara nesta legislatura (${saiu.length})`} subtitulo="Suplentes que assumiram por um tempo e vereadores que saíram.">
          <Cabecalho />
          <ol>
            {saiu.map((v) => (
              <Linha key={v.id} v={v} avaliados={avaliados} />
            ))}
          </ol>
        </Secao>
      )}

      <ComoLer>
        <li>Cada linha mostra a nota de 0 a 10 do vereador em cada coeficiente e, logo abaixo, a posição dele entre os vereadores avaliados.</li>
        <li>Quem tem menos de {dados.metodologia.vereador.minimoSessoes} sessões no período aparece sem nota.</li>
        <li>Em exercício lista quem está no cargo. Passaram pela Câmara lista suplentes que assumiram por um tempo e vereadores que saíram.</li>
        <li>
          Clique em um nome para abrir o perfil, com a conta de cada nota. Para ordenar e comparar, use a lista do{" "}
          <Link href="/" className="underline">
            painel
          </Link>
          .
        </li>
      </ComoLer>
    </>
  );
}
