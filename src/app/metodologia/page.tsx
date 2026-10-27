import type { Metadata } from "next";
import { AvisoParcial, Secao } from "@/components/ui";
import { COEFICIENTES, PILARES_VEREADOR, TIPO_NOME, dados, dataBR, num } from "@/lib/dados";

export const metadata: Metadata = { title: "Metodologia" };

export default function Metodologia() {
  const m = dados.metodologia;
  const ordinarias = dados.sessoes.filter((s) => s.tipo === "ordinaria").length;
  const ref = dados.prefeito.fiscal?.referencias;
  const pares = (dados.prefeito.fiscal?.anos.at(-1)?.cidades ?? []).filter((c) => !c.foco).map((c) => c.nome);

  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Metodologia</h1>
      <p className="mt-3 text-lg text-slate-600">
        Não há nota geral. Cada avaliação vai de 0 a 10 e é calculada só com dados públicos e oficiais, com a conta à mostra. Cada número leva ao
        documento oficial de onde saiu.
      </p>

      <AvisoParcial className="mt-5" />

      <Secao titulo="De onde vêm os dados">
        <p className="text-slate-700">
          A Câmara Municipal de Osasco publica, para cada sessão, uma planilha com a presença dos vereadores em cada chamada, as proposituras lidas no
          expediente, as matérias da Ordem do Dia e os votos nominais. Lemos essas planilhas automaticamente.
        </p>
        <p className="mt-3 text-slate-700">
          Período atual: <b>{dataBR(dados.periodo.inicio)}</b> a <b>{dataBR(dados.periodo.fim)}</b>, {dados.sessoes.length} sessões ({ordinarias}{" "}
          ordinárias). Sessões cuja planilha ainda não foi baixada ficam de fora até a próxima atualização.
        </p>
        <p className="mt-3 text-slate-700">
          Fotos: site da Câmara ou, na falta dela, a foto de candidatura de 2024 do TSE. Logos dos partidos: Wikimedia Commons, a partir do
          Wikidata, ou o site oficial do partido quando o Commons não tem o logo atual (Podemos e Republicanos).
        </p>
      </Secao>

      <Secao titulo="Vereadores: participação, produção e eficiência" id="vereadores">
        <p className="mb-4 text-slate-700">
          Cada vereador tem cinco avaliações individuais (os pilares abaixo), cada uma de 0 a 10. Elas formam três coeficientes, sem nota geral:
        </p>
        <ul className="mb-4 space-y-2 text-slate-700">
          {COEFICIENTES.map((c) => (
            <li key={c.chave} className="rounded-xl border border-slate-200 bg-white p-3">
              <b>{c.nome}.</b> {c.descricao}
            </li>
          ))}
        </ul>
        <p className="mb-4 text-slate-700">
          Na página inicial dá para ordenar a lista por qualquer coeficiente ou montar um critério próprio, dando peso de 0 a 3 a presença,
          votações, projetos e leis, comissões, pauta e eficiência. O custo do mandato (D) aparece em cada perfil e não entra em nenhum coeficiente:
          o Quadro de Pessoal da Câmara dá a mesma estrutura a todos os gabinetes.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Pilar</th>
                <th className="px-4 py-2 text-right">Coeficiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PILARES_VEREADOR.map((c) => (
                <tr key={c.chave}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {c.chave} · {c.nome}
                    </div>
                    <div className="text-slate-500">{c.descricao}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{COEFICIENTES.find((x) => x.pilares.includes(c.chave))?.nome ?? "informativo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
          <li>
            Quantidades (projetos, comissões) são comparadas com o percentil 90 entre os vereadores, não com o maior valor, para que um único caso
            extremo não achate a nota de todos. Presença e votações usam escala fixa.
          </li>
          <li>
            Projetos simbólicos são identificados pela ementa: nomes de ruas e praças, datas e semanas comemorativas, títulos e utilidade pública. A
            classificação aparece em cada projeto no perfil do vereador.
          </li>
          <li>
            Comissões: presidente vale 1,5; vice-presidente e relator, 1,25; membro, 1; frente parlamentar, 0,25. Cargo na Mesa Diretora vale 3, e a
            presidência da Câmara, 4, porque os membros da Mesa costumam ficar fora das comissões. Como a composição publicada é a atual, quem já saiu
            da Câmara fica sem nota neste pilar.
          </li>
          <li>
            Requerimentos ao Executivo: as planilhas de sessão só mostram os que vão a plenário, quase todos de legislaturas anteriores, e a busca de
            proposições da Câmara exige captcha. Por isso eles {dados.notasVereadores.usaRequerimentos ? "entram" : "ainda não entram"} no pilar C.
          </li>
          <li>Faltas justificadas, lidas no expediente da sessão, não contam como falta no pilar de assiduidade.</li>
          <li>
            Tudo é medido em relação às sessões em que a pessoa estava <b>em exercício</b>. Suplentes que assumiram no meio do mandato não são
            prejudicados.
          </li>
          <li>Só tem coeficientes quem tem pelo menos {m.vereador.minimoSessoes} sessões no período. Suplentes que ficaram poucas semanas aparecem sem eles.</li>
          <li>
            Contam como projeto: {m.tiposProjeto.map((t) => TIPO_NOME[t] ?? t).join(", ")}. Projetos, moções, requerimentos e leis com mais de um autor
            contam para todos os autores citados pelo nome. Quando o texto diz só “e outros vereadores”, não há como saber quem são.
          </li>
          <li>
            Moções, títulos de cidadão, cartões de prata e outras honrarias aparecem no perfil, mas não entram na produção, porque não mudam leis nem
            políticas públicas.
          </li>
          <li>Quem está na presidência da sessão conta como presente e não é cobrado pelos votos (o presidente só vota em empate).</li>
        </ul>
      </Secao>

      <Secao titulo="Prefeito: uma nota por pilar" id="prefeito">
        <p className="text-slate-700">
          O prefeito é avaliado em cinco pilares, cada um com a sua nota e sem nota geral: gestão fiscal, mínimos constitucionais, qualidade da
          gestão pelo IEG-M do TCE-SP, resultados em educação e saúde, e transparência e entregas. Pilar sem dados do mandato fica sem nota até a
          fonte publicar.
        </p>
        <p className="mt-3 text-slate-700">
          Os dois pilares usam os relatórios fiscais que a própria Prefeitura entrega ao Tesouro Nacional (RREO e RGF, pelo sistema SICONFI). Osasco é
          comparada com {pares.length} cidades paulistas grandes ({pares.join(", ")}) no mesmo período. Conta só o mandato atual: a nota é a média dos
          anos fechados desde 2025, e 2024 aparece como referência da gestão anterior.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Como pontua (0 a 10)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">A · Gasto com pessoal</td>
                <td className="px-4 py-3 text-slate-600">
                  Pela Lei de Responsabilidade Fiscal: até {ref?.pessoal.otimo}% da RCL vale 10, no limite de alerta ({num(ref?.pessoal.alerta)}%) vale 5 e
                  no limite máximo ({ref?.pessoal.maximo}%) vale 0.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">A · Investimento</td>
                <td className="px-4 py-3 text-slate-600">Posição entre as cidades comparadas: a que mais investe (em % da despesa) vale 10, a que menos investe vale 0.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">A · Resultado primário</td>
                <td className="px-4 py-3 text-slate-600">
                  Cumprir a meta da Lei de Diretrizes Orçamentárias vale 10. Ficar {ref?.toleranciaPrimario}% da RCL ou mais abaixo da meta vale 0. Só
                  conta em ano fechado.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">B · Saúde, educação e FUNDEB</td>
                <td className="px-4 py-3 text-slate-600">
                  Cumprir o mínimo legal (15%, 25% e 70%) vale 5. Os outros 5 pontos dependem da posição entre as cidades comparadas. Descumprir
                  qualquer mínimo zera o pilar.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">C · IEG-M (TCE-SP)</td>
                <td className="px-4 py-3 text-slate-600">
                  Valor oficial da faixa geral do IEG-M: A = 9,5, B+ = 8,25, B = 6,75, C+ = 5,5 e C = 2,5. Conta a média dos anos-base do mandato.
                  As sete áreas (planejamento, fiscal, educação, saúde, meio ambiente, cidades e governança de TI) aparecem no detalhe, mas a nota usa
                  só o índice geral, que já é a composição oficial delas.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">D · Educação (IDEB)</td>
                <td className="px-4 py-3 text-slate-600">
                  IDEB dos anos iniciais da rede municipal (INEP). Metade pela posição entre as cidades comparadas, metade pela evolução em relação à
                  edição anterior: subir 0,3 ponto vale 10, ficar igual vale 5, cair 0,3 vale 0.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">D · Saúde (mortalidade infantil)</td>
                <td className="px-4 py-3 text-slate-600">
                  Óbitos de menores de 1 ano por mil nascidos vivos (DataSUS: SIM e SINASC). Metade pela posição entre as cidades (menor é melhor),
                  metade pela evolução em relação ao ano anterior: cair 1,5 por mil vale 10, ficar igual vale 5, subir 1,5 vale 0.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">E · Transparência (PNTP)</td>
                <td className="px-4 py-3 text-slate-600">
                  Índice de transparência do portal da Prefeitura no Programa Nacional de Transparência Pública (Atricon e tribunais de contas), usado
                  diretamente: 82% vira 8,2.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">E · Obras</td>
                <td className="px-4 py-3 text-slate-600">
                  Parte do valor das obras do Executivo que está paralisada ou atrasada no Painel de Obras do TCE-SP. Nenhuma vale 10; 30% ou mais
                  vale 0. Obras da Câmara não contam.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Valores impossíveis (por exemplo, uma cidade declarando 0,2% de gasto em saúde) são tratados como erro de preenchimento, descartados e
          listados na página do prefeito.
        </p>
      </Secao>

      <Secao titulo="Limitações">
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>A maioria das matérias é votada de forma simbólica, sem registro individual. Só as votações nominais mostram o voto de cada vereador.</li>
          <li>Uma falta só conta como justificada se a justificativa foi lida no expediente de alguma sessão; licenças comunicadas de outra forma não aparecem.</li>
          <li>Separar projetos simbólicos dos de política pública não mede a qualidade de cada um. A classificação é automática e pode errar em casos de fronteira.</li>
          <li>Requerimentos e indicações apresentados desde 2025, presença nas reuniões das comissões e atendimento aos moradores ainda não têm dados abertos sem captcha e ficam de fora.</li>
          <li>
            Custo do mandato: usamos os vencimentos do Quadro de Pessoal oficial (sem encargos e benefícios) e as despesas que a Câmara envia ao TCE-SP.
            A folha por gabinete, com quem está lotado em cada um, não é publicada em formato aberto.
          </li>
          <li>As planilhas são preenchidas à mão pela Câmara e podem ter erros de digitação. Copiamos os dados como estão.</li>
        </ul>
      </Secao>

      <Secao titulo="Correções" id="correcoes">
        <p className="text-slate-700">
          Se algum número estiver errado, compare com a planilha oficial (link em cada item) e entre em contato informando a sessão e o dado. Toda
          correção é feita na origem dos dados e vale para todos os vereadores.
        </p>
      </Secao>
    </article>
  );
}
