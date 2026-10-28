import type { Metadata } from "next";
import Link from "next/link";
import { AvisoParcial, Avatar, Secao, SeloPartido } from "@/components/ui";
import { COEFICIENTES, dados, type Vereador } from "@/lib/dados";
import { nota10, num } from "@/lib/formato";

export const metadata: Metadata = { title: "Vereadores" };

const porNome = (a: Vereador, b: Vereador) => a.nome.localeCompare(b.nome, "pt-BR");

function Cartao({ v, avaliados }: { v: Vereador; avaliados: number }) {
  const temNota = v.coeficientes.producao != null;
  return (
    <Link
      href={`/vereadores/${v.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <Avatar nome={v.nome} foto={v.foto} tamanho={56} />
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900 group-hover:text-blue-800">{v.nome}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <SeloPartido sigla={v.partido} logo={v.partidoLogo} />
            {v.perfil?.mesa && <span>{v.perfil.mesa}</span>}
          </div>
        </div>
      </div>
      {temNota ? (
        <dl className="grid grid-cols-4 gap-1 text-center">
          {COEFICIENTES.map((c) => (
            <div key={c.chave} className="rounded-lg bg-slate-50 px-1 py-1.5">
              <dt className="truncate text-[9.5px] uppercase tracking-wide text-slate-500" title={c.nome}>{c.nome}</dt>
              <dd
                className={`text-base font-semibold tabular-nums ${
                  c.chave === "integridade" && (v.coeficientes.integridade ?? 1) < 0.7
                    ? (v.coeficientes.integridade ?? 1) < 0.5
                      ? "text-rose-700"
                      : "text-amber-700"
                    : "text-slate-900"
                }`}
              >
                {num(nota10(v.coeficientes[c.chave]), 1)}
              </dd>
              {v.rankings[c.chave] && (
                <dd className="text-[10px] tabular-nums text-slate-500">
                  {v.rankings[c.chave]}º de {avaliados}
                </dd>
              )}
            </div>
          ))}
        </dl>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {v.indicadores.sessoes} sessões no período: poucas para calcular as notas (mínimo {dados.metodologia.vereador.minimoSessoes}).
        </p>
      )}
    </Link>
  );
}

export default function Vereadores() {
  const ativos = dados.vereadores.filter((v) => v.emExercicio).sort(porNome);
  const saiu = dados.vereadores.filter((v) => !v.emExercicio).sort(porNome);
  const avaliados = dados.vereadores.filter((v) => v.coeficientes.producao != null).length;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vereadores de Osasco</h1>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ativos.map((v) => (
            <Cartao key={v.id} v={v} avaliados={avaliados} />
          ))}
        </div>
      </Secao>

      {saiu.length > 0 && (
        <Secao titulo={`Passaram pela Câmara nesta legislatura (${saiu.length})`} subtitulo="Suplentes que assumiram por um tempo e vereadores que saíram.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saiu.map((v) => (
              <Cartao key={v.id} v={v} avaliados={avaliados} />
            ))}
          </div>
        </Secao>
      )}
    </>
  );
}
