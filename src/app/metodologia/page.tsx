import type { Metadata } from "next";
import Link from "next/link";
import { PedidoCorrecao } from "@/components/PedidoCorrecao";
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
        Cada avaliação vai de 0 a 10 e é calculada só com dados públicos e oficiais, com a conta à mostra. Cada número leva ao
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
          Cada vereador tem cinco avaliações individuais (os pilares abaixo), cada uma de 0 a 10. Elas formam três coeficientes:
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
            <b>Réguas realistas.</b> Presença e votações contam em proporção direta (90% vale 9), como no{" "}
            <a className="underline" href="https://ranking.org.br/criterios-e-metodologia">
              Ranking dos Políticos
            </a>
            . Projetos e comissões são medidos contra uma meta fixa, e não contra quem mais produz: um pouco de atuação já pontua, e chegar a 10
            exige bastante. Os dados mostram só uma parte do mandato, então as réguas não punem com força quem fica abaixo do esperado.
          </li>
          <li>
            <b>Bônus por atuação na comunidade.</b> Moções (de reconhecimento, apoio, apelo, pesar) e honrarias somam até 0,5 ponto na Produção: 0,1 a
            cada 10. O bônus só soma, nunca tira.
          </li>
          <li>
            Projetos simbólicos são identificados pela ementa: nomes de ruas e praças, datas e semanas comemorativas, títulos e utilidade pública. A
            classificação aparece em cada projeto no perfil do vereador.
          </li>
          <li>
            Comissões e articulação: presidente de comissão vale 1,5; vice-presidente e relator, 1,25; membro, 1. Frente parlamentar vale 0,25, e
            presidir uma frente, 0,5. Líder de bancada e líder do prefeito valem 1,5 cada, como presidir uma comissão; as lideranças saem dos ofícios
            lidos nas sessões. Cargo na Mesa Diretora vale 3, e a presidência da Câmara, 4, porque os membros da Mesa costumam ficar fora das
            comissões. Como a composição publicada é a atual, quem já saiu da Câmara fica sem nota neste pilar.
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

      <Secao titulo="Integridade" id="integridade">
        <p className="text-slate-700">
          Inspirado no critério de processos do{" "}
          <a className="underline" href="https://ranking.org.br/criterios-e-metodologia">
            Ranking dos Políticos
          </a>
          , o pilar de integridade começa em 10 e desconta por decisão definitiva publicada por órgão oficial:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
          <li>
            <b>Contas julgadas irregulares pelo Tribunal de Contas do Estado (TCE-SP)</b>, pela lista oficial de responsáveis, que só traz decisões das
            quais não cabe mais recurso: cada uma tira 4 pontos, ou 2 se a decisão tem mais de 10 anos.
          </li>
          <li>
            <b>Condenações no Cadastro Nacional de Condenações por Improbidade Administrativa e Inelegibilidade</b>, do Conselho Nacional de Justiça
            (CNJ): cada uma tira 5 pontos.
          </li>
          <li>A nota mínima é 0. A integridade não entra na média por partido e não vira ranking: é o registro de cada pessoa.</li>
        </ul>
        <p className="mt-4 font-semibold text-slate-900">O que não entra, e por quê</p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-700">
          <li>
            Investigações, inquéritos, denúncias, processos em andamento e notícias. Todos têm direito à presunção de inocência, e o site não antecipa
            julgamento.
          </li>
          <li>
            Condenações criminais fora desses cadastros: não há fonte oficial aberta que permita conferir todas. Quando houver, elas entram com a mesma
            regra.
          </li>
        </ul>
        <p className="mt-4 font-semibold text-slate-900">Cuidados</p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-700">
          <li>
            Contas julgadas irregulares são decisão administrativa sobre a gestão de dinheiro público. Não são condenação criminal e não tornam ninguém
            inelegível automaticamente.
          </li>
          <li>
            Cada registro foi conferido pelo nome completo e pelos números do documento que a própria fonte mostra. O documento de identificação não é
            guardado nem publicado aqui.
          </li>
          <li>
            O site reproduz a fonte oficial, com número do processo e data, sem opinião sobre as pessoas. Se uma decisão foi revista, anulada ou não é
            da pessoa, ou se faltar um registro, peça correção: o site corrige assim que a fonte confirmar.
          </li>
        </ul>
      </Secao>

      <Secao titulo="Prefeito: uma nota por pilar" id="prefeito">
        <p className="text-slate-700">
          O prefeito é avaliado em cinco pilares, cada um com a sua nota: gestão fiscal, mínimos constitucionais, qualidade da
          gestão pelo IEG-M do TCE-SP, resultados em educação e saúde, e transparência e entregas. Pilar sem dados do mandato fica sem nota até a
          fonte publicar.
        </p>
        <p className="mt-3 text-slate-700">
          O pilar A usa os relatórios fiscais que a própria Prefeitura entrega ao Tesouro Nacional (RREO e RGF, pelo sistema SICONFI). O pilar B usa o
          que cada prefeitura declara nos sistemas oficiais de cada área, o SIOPS (saúde) e o SIOPE (educação e FUNDEB); o resumo do RREO só entra
          quando falta dado neles. Em 2025 Osasco informou números diferentes nos dois lugares, e as outras cidades batem. Osasco é
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
                  Cumprir o mínimo legal (15%, 25% e 70% do FUNDEB; 60% até 2020) vale 5. Os outros 5 pontos dependem da posição entre as cidades comparadas. Descumprir
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

      <Secao titulo="Verbas de fora" id="verbas">
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>
            <b>Quanto chega:</b> receitas que a Prefeitura declarou ao Tesouro Nacional nas contas anuais (SICONFI, Anexo I-C), separadas pelo nome de
            cada conta: FPM, ICMS, IPVA, FUNDEB, saúde, educação, assistência social e convênios. O plano de contas mudou em 2022; a separação pelo nome
            vale para os dois formatos. Os valores são brutos (coluna &quot;Receitas Brutas Realizadas&quot;); a parte retida para o FUNDEB (coluna
            &quot;Deduções – FUNDEB&quot;) aparece no detalhe de cada linha e é descontada do total do ano, para não contar duas vezes o que volta pelo FUNDEB.
          </li>
          <li>
            <b>Emendas federais:</b> arquivo de emendas do Portal da Transparência (CGU), pelo valor que chegou. Conta só o que foi para a Prefeitura e os
            fundos municipais; entidades sem fins lucrativos de Osasco aparecem à parte, e empresas com sede na cidade que forneceram para programas
            nacionais ficam de fora. As &quot;emendas Pix&quot; trazem, do Transferegov, o que a Prefeitura informou que vai fazer com o dinheiro.
          </li>
          <li>
            <b>Quem é cada autor:</b> o nome curto que a CGU grava (&quot;GIORDANO&quot;, &quot;PR. MARCO FELICIANO&quot;) é procurado nas listas oficiais de
            deputados federais e senadores desde 2011. De lá vêm o cargo, o estado, a foto e os partidos ao longo do tempo. O partido mostrado em cada
            emenda é o do autor em novembro do ano anterior, quando as emendas ao Orçamento são apresentadas.
          </li>
          <li>
            <b>Até a nota:</b> quando o histórico de um pagamento da Prefeitura cita o número da emenda (&quot;EMENDA PARLAMENTAR N 37730001&quot; é a emenda 1
            do autor 3773) ou o nome do deputado, o pagamento entra na própria emenda. Emendas de vereadores entram quando o histórico traz o nome do vereador.
          </li>
          <li>
            <b>Emendas estaduais:</b> a planilha do TCE-SP com as transferências especiais do Estado (posição de 31/08/2024). O governo estadual não
            publica em arquivo aberto o deputado que indicou cada uma.
          </li>
          <li>
            <b>Com quem a Prefeitura gastou:</b> despesas que a Prefeitura informa ao TCE-SP, pagamento a pagamento, com a fonte do dinheiro (federal, estadual ou do
            próprio caixa) e o código do programa. Os códigos 0800 e 0801 marcam o que foi pago com emendas federais e estaduais. Pagamentos a pessoas
            físicas entram só nos totais.
          </li>
          <li>
            <b>Conferências de integridade:</b> todas as empresas e entidades que receberam verbas de fora são procuradas pelo CNPJ nas listas de punidos
            da CGU (CEIS, CNEP e CEPIM), e o mês de cada pagamento é comparado com o período da punição. Uma punição conta como válida para Osasco quando
            abrange todos os governos, quando é declaração de inidoneidade ou quando foi aplicada pela própria Prefeitura. Também são contadas a forma de
            contratação (licitação, dispensa, inexigibilidade), a parte dos pagamentos com a emenda identificada, a concentração em um fornecedor, as
            emendas de relator e a situação das emendas Pix. São fatos para olhar de perto, não conclusões.
          </li>
          <li>
            <b>Bairros:</b> entram emendas, convênios e pagamentos cujo texto cita o bairro, uma escola ou uma unidade de saúde, com o mesmo reconhecimento
            de nomes dos documentos da Câmara. Quando um item cita vários bairros, o valor é dividido entre eles.
          </li>
          <li>
            <b>Limites:</b> FPM, ICMS e IPVA entram no caixa geral e não podem ser seguidos até a nota. Repasses direto aos fundos de saúde e educação e as
            &quot;emendas Pix&quot; mostram com quem a área gastou, não qual nota cada emenda pagou. A entrega da obra ou do serviço não aparece nesses
            registros.
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-600">
          Veja em <Link href="/verbas" className="underline">Verbas</Link>.
        </p>
      </Secao>

      <Secao titulo="Séries históricas" id="historico">
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>
            <b>Censo 2010 × 2022:</b> o Censo 2010 do IBGE é publicado por setor censitário, com o nome do bairro; somamos os setores de cada bairro. Setores
            pequenos têm dados em sigilo e ficam fora das contas. A renda de 2010 é corrigida pelo IPCA até julho de 2022 (data de referência do Censo).
            O IBGE mudou a forma de levantar o entorno das casas (asfalto, calçada, árvores...) entre os dois Censos, e alguns bairros mudaram de limite.
          </li>
          <li>
            <b>Eleições de 2016, 2020 e 2024:</b> votos por seção do TSE, somados pelo bairro do local de votação. Em 2016 o TSE não publica coordenadas: o
            local é reconhecido pelo mesmo número ou nome em 2020 e 2024. &quot;Voto no eleito&quot; é a porcentagem do prefeito que acabou eleito no 1º
            turno, para comparar os três anos do mesmo jeito.
          </li>
          <li>
            <b>Prefeitura e Câmara:</b> as contas desde 2017 (SICONFI), a mortalidade infantil desde 2015 (DataSUS), o IDEB desde 2005 (INEP) e as despesas
            da Câmara desde 2017 (TCE-SP), em valores da época. As notas do prefeito continuam usando só os anos do mandato atual.
          </li>
          <li>
            <b>População:</b> Censos desde 1970 e estimativas anuais do IBGE.
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-600">
          Veja em <Link href="/historico" className="underline">Histórico</Link> e, para cada bairro, na aba Histórico do mapa.
        </p>
      </Secao>

      <Secao titulo="Limitações">
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>A maioria das matérias é votada de forma simbólica, sem registro individual. Só as votações nominais mostram o voto de cada vereador.</li>
          <li>Uma falta só conta como justificada se a justificativa foi lida no expediente de alguma sessão; licenças comunicadas de outra forma não aparecem.</li>
          <li>Separar projetos simbólicos dos de política pública não mede a qualidade de cada um. A classificação é automática e pode errar em casos de fronteira.</li>
          <li>Requerimentos e indicações apresentados desde 2025, presença nas reuniões das comissões e atendimento aos moradores ainda não têm dados abertos sem captcha e ficam de fora.</li>
          <li>
            Custo do mandato: usamos os vencimentos do Quadro de Pessoal oficial (sem encargos e benefícios), as despesas que a Câmara envia ao TCE-SP
            e a folha mensal do Portal do Cidadão. A folha não informa o gabinete de cada assessor, por isso não há custo por gabinete.
          </li>
          <li>As planilhas são preenchidas à mão pela Câmara e podem ter erros de digitação. Copiamos os dados como estão.</li>
        </ul>
      </Secao>

      <Secao titulo="Correções" id="correcoes">
        <p className="text-slate-700">
          Se algum número estiver errado, peça uma correção dizendo qual é o dado e, se souber, onde conferir a informação certa. Os pedidos ficam
          numa{" "}
          <a className="underline" href="https://github.com/gcachute/avalia-osasco/issues" target="_blank" rel="noreferrer">
            lista pública
          </a>
          , onde dá para acompanhar a resposta. Toda correção é feita na origem dos dados e vale para o site inteiro.
        </p>
        <PedidoCorrecao className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Pedir uma correção
        </PedidoCorrecao>
      </Secao>

      <Secao titulo="Privacidade" id="privacidade">
        <ul className="list-disc space-y-1.5 pl-5 text-slate-700">
          <li>O site não usa cookies e não tem propaganda. As visitas são contadas de forma anônima, só o total por página, sem identificar ninguém.</li>
          <li>A escolha de tema (claro ou escuro) e os pesos do &quot;Meu critério&quot; ficam guardados só no seu aparelho.</li>
          <li>Os pedidos de correção ficam públicos, com o título e a descrição escritos por quem enviou. Não coloque dados pessoais neles.</li>
          <li>
            Os dados de vereadores e do prefeito são os que a Câmara, a Prefeitura e os órgãos oficiais já publicam sobre quem exerce cargo
            público. Nomes de servidores e assessores não aparecem no site.
          </li>
        </ul>
      </Secao>
    </article>
  );
}
