import Link from "next/link";
import { Ranking } from "@/components/Ranking";
import { Avatar, Cartao, NotaBadge } from "@/components/ui";
import { dados, dataBR, pct } from "@/lib/dados";

export default function Home() {
  const { vereadores, prefeito, sessoes, periodo } = dados;
  const ativos = vereadores.filter((v) => v.emExercicio);
  const presencaMedia = ativos.reduce((a, v) => a + (v.indicadores.presenca ?? 0), 0) / (ativos.length || 1);
  const projetos = vereadores.reduce((a, v) => a + v.indicadores.projetos, 0);
  const adiadas = vereadores.reduce((a, v) => a + v.indicadores.adiadasPorAusencia, 0);

  return (
    <>
      <section className="max-w-3xl">
        <p className="text-sm font-medium text-blue-800">Legislatura 2025–2028</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Como estão trabalhando os políticos de Osasco?</h1>
        <p className="mt-3 text-lg text-slate-600">
          Seu imposto paga os salários da Câmara e da Prefeitura. Aqui você vê, com dados oficiais, quem comparece às sessões, quem vota e quem
          apresenta projetos.
        </p>
      </section>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cartao titulo="Sessões analisadas" valor={sessoes.length} detalhe={`${dataBR(periodo.inicio)} a ${dataBR(periodo.fim)}`} />
        <Cartao titulo="Presença média" valor={pct(presencaMedia)} detalhe="vereadores em exercício" />
        <Cartao titulo="Projetos apresentados" valor={projetos} detalhe="por vereadores, no período" />
        <Cartao titulo="Itens adiados" valor={adiadas} detalhe="porque o autor faltou" />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Ranking dos vereadores</h2>
          <Link href="/metodologia" className="text-sm text-blue-800 underline">
            Como a nota é calculada
          </Link>
        </div>
        <Ranking
          vereadores={vereadores.map(({ id, nome, partido, foto, emExercicio, nota, posicao, indicadores, perfil }) => ({
            id, nome, partido, foto, emExercicio, nota, posicao, indicadores, mesa: perfil?.mesa ?? null,
          }))}
        />
        <p className="mt-3 text-xs text-slate-500">
          Nota provisória: o pilar de custo do mandato ainda não tem dados abertos. Só recebe nota quem tem pelo menos {dados.metodologia.vereador.minimoSessoes} sessões no período. Clique em um nome para ver os detalhes e as
          planilhas de origem.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Prefeitura</h2>
        <Link href="/prefeito" className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300">
          <Avatar nome={prefeito.nome} foto={prefeito.foto} tamanho={56} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900">{prefeito.nome}</div>
            <div className="text-sm text-slate-500">
              {prefeito.cargo} · {prefeito.partido} · {prefeito.mandato}
            </div>
          </div>
          <div className="text-center">
            <NotaBadge valor={prefeito.nota} />
            <div className="mt-1 text-xs text-slate-500">{prefeito.nota == null ? "em construção" : prefeito.provisoria ? "nota provisória" : "nota do mandato"}</div>
          </div>
          <div className="flex gap-6 text-sm">
            <span>
              <b className="block text-lg tabular-nums text-slate-900">{prefeito.indicadores.projetosEnviados}</b>projetos enviados
            </span>
            <span>
              <b className="block text-lg tabular-nums text-slate-900">{prefeito.indicadores.vetosTotais + prefeito.indicadores.vetosParciais}</b>
              vetos
            </span>
          </div>
        </Link>
      </section>
    </>
  );
}
