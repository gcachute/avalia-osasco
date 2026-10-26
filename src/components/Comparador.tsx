"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PilarVereador } from "@/lib/dados";
import { nota, nota10, pct } from "@/lib/formato";
import { NotaBadge, Retrato } from "./ui";

export type ItemComparacao = {
  id: string;
  nome: string;
  partido: string | null;
  foto: string | null;
  nota: number | null;
  posicao: number | null;
  emExercicio: boolean;
  mesa: string | null;
  pilares: Record<PilarVereador, number | null>;
  presenca: number | null;
  votacoes: number | null;
  projetos: number;
  simbolicos: number;
  leis: number;
  comissoes: number;
  adiados: number;
  sessoes: number;
  temas: string[];
};

const PILARES: { chave: PilarVereador; nome: string }[] = [
  { chave: "A", nome: "Assiduidade" },
  { chave: "B", nome: "Legislação que importa" },
  { chave: "C", nome: "Fiscalização e comissões" },
  { chave: "E", nome: "Compromisso com a pauta" },
];

const n = (x: number) => x.toLocaleString("pt-BR");
const LINHAS: { nome: string; valor: (v: ItemComparacao) => number | null; mostrar: (v: ItemComparacao) => string; maiorMelhor: boolean }[] = [
  { nome: "Presença nas sessões", valor: (v) => v.presenca, mostrar: (v) => pct(v.presenca), maiorMelhor: true },
  { nome: "Votações nominais", valor: (v) => v.votacoes, mostrar: (v) => pct(v.votacoes), maiorMelhor: true },
  { nome: "Projetos de política pública", valor: (v) => v.projetos, mostrar: (v) => n(v.projetos), maiorMelhor: true },
  { nome: "Projetos simbólicos", valor: () => null, mostrar: (v) => n(v.simbolicos), maiorMelhor: true },
  { nome: "Leis sancionadas", valor: (v) => v.leis, mostrar: (v) => n(v.leis), maiorMelhor: true },
  { nome: "Comissões", valor: (v) => v.comissoes, mostrar: (v) => (v.mesa ? `Mesa (${v.mesa})` : n(v.comissoes)), maiorMelhor: true },
  { nome: "Itens adiados por falta", valor: (v) => v.adiados, mostrar: (v) => n(v.adiados), maiorMelhor: false },
  { nome: "Sessões no período", valor: () => null, mostrar: (v) => n(v.sessoes), maiorMelhor: true },
];

function Seletor({ valor, lista, onChange, rotulo }: { valor: string; lista: ItemComparacao[]; onChange: (id: string) => void; rotulo: string }) {
  return (
    <label className="block text-sm">
      <span className="sr-only">{rotulo}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900">
        {lista.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nome}
            {v.partido ? ` (${v.partido})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Comparador({ lista }: { lista: ItemComparacao[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const valido = (id: string | null) => (id && lista.some((v) => v.id === id) ? id : null);
  const idA = valido(params.get("a")) ?? lista[0].id;
  const idB = valido(params.get("b")) ?? lista.find((v) => v.id !== idA)!.id;
  const a = lista.find((v) => v.id === idA)!;
  const b = lista.find((v) => v.id === idB)!;

  const trocar = (lado: "a" | "b", id: string) => {
    const q = new URLSearchParams(params.toString());
    q.set(lado, id);
    if (!q.get(lado === "a" ? "b" : "a")) q.set(lado === "a" ? "b" : "a", lado === "a" ? idB : idA);
    router.replace(`/comparar?${q.toString()}`, { scroll: false });
  };

  const vencedor = (x: number | null, y: number | null, maiorMelhor: boolean) => {
    if (x == null || y == null || x === y) return 0;
    return (x > y) === maiorMelhor ? 1 : -1;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {[
          { v: a, lado: "a" as const },
          { v: b, lado: "b" as const },
        ].map(({ v, lado }) => (
          <div key={lado} className="space-y-3">
            <Seletor valor={v.id} lista={lista} onChange={(id) => trocar(lado, id)} rotulo={lado === "a" ? "Primeiro vereador" : "Segundo vereador"} />
            <Link
              href={`/vereadores/${v.id}`}
              className={`group flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-3 transition hover:shadow-md sm:flex-row sm:items-center ${lado === "a" ? "border-blue-300" : "border-amber-300"}`}
            >
              <Retrato nome={v.nome} foto={v.foto} className="w-full shrink-0 rounded-xl sm:w-28" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 group-hover:text-blue-800">{v.nome}</div>
                <div className="text-xs text-slate-500">
                  {v.partido ?? "sem partido informado"}
                  {v.posicao ? ` · ${v.posicao}º no ranking` : " · sem nota"}
                </div>
                <div className="mt-2">
                  <NotaBadge valor={v.nota} grande />
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Pilares da nota</h2>
        <div className="space-y-4">
          {PILARES.map((p) => {
            const x = a.pilares[p.chave];
            const y = b.pilares[p.chave];
            return (
              <div key={p.chave}>
                <div className="mb-1 text-sm font-medium text-slate-700">
                  {p.chave} · {p.nome}
                </div>
                <div className="grid grid-cols-[3rem_1fr_1fr_3rem] items-center gap-2 text-sm">
                  <span className="text-right font-semibold tabular-nums text-slate-900">{nota(nota10(x))}</span>
                  {/* barra de A cresce para a esquerda, a de B para a direita */}
                  <div className="flex h-3 justify-end overflow-hidden rounded-l-full bg-slate-100">
                    <div className={`h-full rounded-l-full transition-all duration-700 ${vencedor(x, y, true) >= 0 ? "bg-blue-700" : "bg-blue-400"}`} style={{ width: `${(x ?? 0) * 100}%` }} />
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-r-full bg-slate-100">
                    <div className={`h-full rounded-r-full transition-all duration-700 ${vencedor(y, x, true) >= 0 ? "bg-amber-600" : "bg-amber-400"}`} style={{ width: `${(y ?? 0) * 100}%` }} />
                  </div>
                  <span className="font-semibold tabular-nums text-slate-900">{nota(nota10(y))}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-blue-700" /> {a.nome}
          </span>
          <span className="flex items-center gap-1.5">
            {b.nome} <i className="h-2.5 w-2.5 rounded-sm bg-amber-600" />
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Indicador</th>
              <th className="px-3 py-2 text-right">{a.nome.split(" ")[0]}</th>
              <th className="px-3 py-2 text-right">{b.nome.split(" ")[0]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {LINHAS.map((l) => {
              const r = vencedor(l.valor(a), l.valor(b), l.maiorMelhor);
              return (
                <tr key={l.nome}>
                  <td className="px-3 py-2.5 text-slate-700">{l.nome}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${r > 0 ? "font-semibold text-emerald-700" : "text-slate-700"}`}>
                    {r > 0 && "▲ "}
                    {l.mostrar(a)}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${r < 0 ? "font-semibold text-emerald-700" : "text-slate-700"}`}>
                    {r < 0 && "▲ "}
                    {l.mostrar(b)}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="px-3 py-2.5 text-slate-700">Temas principais</td>
              <td className="px-3 py-2.5 text-right text-xs text-slate-600">{a.temas.join(", ") || "—"}</td>
              <td className="px-3 py-2.5 text-right text-xs text-slate-600">{b.temas.join(", ") || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">▲ marca quem foi melhor em cada indicador. O link desta página guarda a comparação, então dá para compartilhar.</p>
    </div>
  );
}
