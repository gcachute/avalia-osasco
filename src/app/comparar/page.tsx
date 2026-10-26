import type { Metadata } from "next";
import { Suspense } from "react";
import { Comparador, type ItemComparacao } from "@/components/Comparador";
import { dados } from "@/lib/dados";

export const metadata: Metadata = { title: "Comparar vereadores" };

export default function Comparar() {
  // Ordem do ranking: os dois primeiros abrem como comparação padrão.
  const lista: ItemComparacao[] = [...dados.vereadores]
    .sort((a, b) => (a.posicao ?? 999) - (b.posicao ?? 999) || a.nome.localeCompare(b.nome))
    .map((v) => ({
      id: v.id,
      nome: v.nome,
      partido: v.partido,
      foto: v.foto,
      nota: v.nota,
      posicao: v.posicao,
      emExercicio: v.emExercicio,
      mesa: v.perfil?.mesa ?? null,
      pilares: { A: v.pilares.A.nota, B: v.pilares.B.nota, C: v.pilares.C.nota, D: v.pilares.D.nota, E: v.pilares.E.nota },
      presenca: v.indicadores.presencaAjustada,
      votacoes: v.indicadores.participacaoVotos,
      projetos: v.indicadores.projetosSubstantivos,
      simbolicos: v.indicadores.projetosSimbolicos,
      leis: v.indicadores.leisSancionadas,
      comissoes: v.indicadores.comissoes,
      adiados: v.indicadores.adiadasPorAusencia,
      sessoes: v.indicadores.sessoes,
      temas: v.temas.slice(0, 3).map((t) => t.tema),
    }));

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Comparar vereadores</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Escolha dois vereadores e veja, lado a lado, os pilares da nota e os principais números do mandato.</p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-slate-500">Carregando…</p>}>
          <Comparador lista={lista} />
        </Suspense>
      </div>
    </>
  );
}
