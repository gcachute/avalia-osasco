import type { Metadata } from "next";
import Link from "next/link";
import { AvisoParcial, Avatar, ComoLer, Secao, SeloPartido } from "@/components/ui";
import { COEFICIENTES, dados, type Vereador } from "@/lib/dados";
import { nota10, num } from "@/lib/formato";

export const metadata: Metadata = { title: "Vereadores" };

const porNome = (a: Vereador, b: Vereador) => a.nome.localeCompare(b.nome, "pt-BR");

// Um cartão por vereador: foto, partido e as quatro notas, com a posição de cada uma.
function Cartao({ v, avaliados }: { v: Vereador; avaliados: number }) {
  const temNota = v.coeficientes.producao != null;
  return (
    <li>
      <Link href={`/vereadores/${v.id}`} className="group flex h-full flex-col gap-4 rounded-2xl bg-slate-50 p-4 transition hover:bg-blue-50">
        <div className="flex items-center gap-3">
          <Avatar nome={v.nome} foto={v.foto} tamanho={56} />
          <div className="min-w-0">
            <div className="truncate text-[1.05rem] font-bold text-slate-950 group-hover:text-blue-800">{v.nome}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <SeloPartido sigla={v.partido} logo={v.partidoLogo} />
              {v.perfil?.mesa && <span>{v.perfil.mesa}</span>}
            </div>
          </div>
        </div>
        {temNota ? (
          <dl className="mt-auto grid grid-cols-4 gap-2">
            {COEFICIENTES.map((c) => (
              <div key={c.chave} className="min-w-0">
                <dt className="truncate text-[11px] text-slate-600" title={c.nome}>
                  {c.nome}
                </dt>
                <dd
                  className={`font-serif text-xl leading-tight tabular-nums ${
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
          <p className="mt-auto text-xs text-slate-600">
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
      <div className="grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
        <div>
          <h1 className="text-4xl font-semibold text-slate-950">Vereadores de Osasco</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Quem está na Câmara na legislatura 2025–2028, com as notas de participação, produção e eficiência. Clique em um nome para ver o perfil
            completo e a conta por trás de cada nota. Para ordenar e comparar, use a lista do{" "}
            <Link href="/" className="underline">
              painel
            </Link>
            .
          </p>
        </div>
        <AvisoParcial />
      </div>

      <Secao titulo={`Em exercício (${ativos.length})`}>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ativos.map((v) => (
            <Cartao key={v.id} v={v} avaliados={avaliados} />
          ))}
        </ol>
      </Secao>

      {saiu.length > 0 && (
        <Secao titulo={`Passaram pela Câmara nesta legislatura (${saiu.length})`} subtitulo="Suplentes que assumiram por um tempo e vereadores que saíram.">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {saiu.map((v) => (
              <Cartao key={v.id} v={v} avaliados={avaliados} />
            ))}
          </ol>
        </Secao>
      )}

      <ComoLer>
        <li>Cada cartão mostra a nota de 0 a 10 do vereador em cada coeficiente e, logo abaixo, a posição dele entre os vereadores avaliados.</li>
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
