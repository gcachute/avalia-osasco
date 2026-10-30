// Nota dos vereadores em cinco pilares.
//  A. Assiduidade: presença (faltas justificadas não contam contra) e participação nas votações nominais.
//  B. Legislação que importa: projetos ponderados pelo tipo (simbólicos valem pouco) e leis sancionadas.
//  C. Comissões e articulação: comissões, Mesa Diretora, frentes parlamentares e lideranças.
//  D. Custo do mandato: igual para todos os gabinetes; só informativo.
//  E. Compromisso com a pauta: itens próprios adiados porque o autor faltou.
//  F. Integridade: decisões definitivas de órgãos oficiais (contas julgadas irregulares pelo TCE-SP, condenações no
//     cadastro de improbidade do CNJ). Começa em 10 e cada registro desconta; processos em andamento não entram.
// Réguas inspiradas no Ranking dos Políticos (ranking.org.br, Manual 2026): presença em proporção direta, metas
// fixas em vez de comparar com quem mais produz, e bônus que só somam. O mandato tem muitas outras formas de
// atuação que os dados não mostram; por isso as réguas não punem com força quem fica abaixo do esperado.
import { media } from "./fiscal.mjs";

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

// Projetos que não mudam políticas públicas: nomes de ruas, datas comemorativas, títulos e afins.
const SIMBOLICO =
  /denomina|da nome|dar nome|altera(cao)? (a|da) denominacao|institui (o|a) (dia|semana|mes|campanha|festa|marcha|jornada|outubro|novembro|setembro|junho|maio|abril)|dia municipal|semana municipal|mes municipal|calendario oficial|utilidade publica|titulo de cidadao|concessao de (titulo|medalha|diploma)|patrimonio (cultural|historico|imaterial)|reconhece como|capital (municipal|estadual) d/;
export const classificarProjeto = (ementa) => (SIMBOLICO.test(norm(ementa)) ? "simbolico" : "substantivo");

// Temas por palavras-chave da ementa (um projeto pode ter mais de um).
const TEMAS = [
  ["Saúde", /saude|hospital|medic|doenc|vacina|odontolog|ubs\b|tratamento|diagnost|heimlich|primeiros socorros|doacao de sangue|cancer|diabet|obesidade|enfermag|farmac|internac|outubr[a-z]* rosa|novembr[a-z]* azul/],
  ["Pessoas com deficiência e TEA", /autis|\btea\b|deficien|neurodiverg|doenca(s)? rara|pcd/],
  ["Educação", /escola|ensino|educa|aluno|creche|professor|alfabetiz|pedagog|leitura|biblioteca/],
  ["Mulheres", /mulher|feminin|gestante|violencia domestica|maria da penha|menstru|materni/],
  ["Crianças e jovens", /crianca|adolescente|juventude|jovem|infantil|bebe/],
  ["Segurança", /seguranca|guarda civil|gcm|polic|monitoramento|camera|violencia/],
  ["Animais", /animal|animais|\bpet|\bcaes\b|\bcao\b|gato|fauna/],
  ["Meio ambiente", /ambient|arvore|verde|sustentab|sustentav|reciclag|residuo|tampinha|natureza|poluic|clima|enchente/],
  ["Mobilidade", /transito|transporte|onibus|ciclo|motocicl|motoboy|estacionamento|calcada|viario|pedestre|semaforo|lombada/],
  ["Idosos", /idos[ao]|terceira idade|aposentad/],
  ["Esporte, cultura e lazer", /esport|cultur|\barte|musica|turismo|lazer|festival|maratona|corrida|futebol|natal|campeonato|campea|atleta|jogos/],
  ["Economia e emprego", /emprego|empresa|comercio|empreend|renda|trabalhador|economi|consumidor|coworking|escritorio virtual|aposta|feira|ambulante/],
  ["Entidades e utilidade pública", /utilidade publica|entidade|associacao|instituto|organizacao da sociedade civil/],
  ["Datas e calendário", /calendario oficial|semana (municipal )?d[aeo]|dia municipal|mes (municipal )?d[aeo]|data comemorativa|campanha/],
  ["Religião", /igreja|templo|religi|evangel|catolic|gospel|pastor|culto|paroquia|comunidade matriz/],
  ["Orçamento e finanças", /credito adicional|orcament|diretrizes orcamentarias|plano plurianual|receita e fixa a despesa|operacao de credito|emprestimo|financiamento/],
  ["Tributos e dívidas", /iptu|tribut|imposto|taxa de (coleta|lixo|licenc|fiscaliz)|parcelamento|divida ativa|isencao|valor venal/],
  ["Servidores públicos", /servidor|funcionarios publicos|cargo|carreira|padrao de vencimento|reajuste|abono|estrutura organizacional|consignac/],
  ["Imóveis e áreas públicas", /desafet|doar area|doacao de area|permissao de uso|concessao de uso|area de terreno|area de propriedade|imoveis|regularizacao (edilicia|fundiaria)|alienac/],
  ["Nomes e homenagens", /denomina|logradouro|cidades-irmas|titulo de cidad|cartao de prata|placa|honraria|homenag|comenda|medalha|diploma/],
  ["Gestão pública e transparência", /transparen|licitac|contrat|administracao publica|convenio/],
  ["Assistência social e moradia", /vulnerab|assistencia social|fome|alimenta|moradia|habitac|morador de rua|situacao de rua/],
];
// O trecho "de autoria do vereador Gabriel Saúde" não pode virar tema: o nome do autor sai antes.
export const temasDoProjeto = (ementa) => {
  const texto = norm(ementa).replace(/,?\s*de autoria d[oa].*$/, "");
  return TEMAS.filter(([, re]) => re.test(texto)).map(([t]) => t);
};

export const PESO_SIMBOLICO = 0.2;
export const CURVA = 0.6; // retornos decrescentes: um pouco de atuação já pontua, e chegar a 10 exige bastante
export const ALVO_LEGISLACAO = 1.5; // pontos de projeto e lei a cada 10 sessões que valem 10 (cerca de um projeto de política pública por mês)
export const ALVO_COMISSOES = 6; // pontos de comissões, Mesa, frentes e lideranças que valem 10
export const PERDA_POR_ADIAMENTO = 1; // pontos perdidos no pilar E por item adiado a cada 10 sessões
export const PESO_PAUTA = 0.2; // peso do pilar E na Participação; o resto é a assiduidade
export const BONUS_COMUNIDADE = { porDez: 0.1, maximo: 0.5 }; // moções e honrarias: +0,1 a cada 10, até 0,5 ponto na Produção
export const MINIMO_COM_REQUERIMENTOS = 5;
export const PONTOS_COMISSAO = { presidente: 1.5, "vice-presidente": 1.25, relator: 1.25, membro: 1, frente: 0.25, presidenteFrente: 0.5 };
export const PONTOS_MESA = { presidente: 4, outros: 3 };
export const PONTOS_LIDERANCA = 1.5; // líder de bancada ou do prefeito vale o mesmo que presidir uma comissão
// Integridade: desconto por registro definitivo. Contas irregulares com decisão de mais de 10 anos pesam metade.
export const DESCONTO_INTEGRIDADE = { tce: 4, tceAntigo: 2, cnj: 5, anosAntigo: 10 };

export function notaIntegridade(registros = [], hoje = new Date()) {
  const desconto = registros.reduce((acc, r) => {
    if (r.fonte === "cnj") return acc + DESCONTO_INTEGRIDADE.cnj;
    const anos = (hoje - new Date(r.decisaoDefinitiva)) / (365.25 * 24 * 3600 * 1000);
    return acc + (anos > DESCONTO_INTEGRIDADE.anosAntigo ? DESCONTO_INTEGRIDADE.tceAntigo : DESCONTO_INTEGRIDADE.tce);
  }, 0);
  return Math.max(0, 10 - desconto) / 10;
}

const curva = (x, alvo) => (x == null ? null : Math.min(1, Math.pow(Math.max(0, x) / alvo, CURVA)));

// Referência robusta para quantidades: o percentil 90 entre os vereadores, em vez do máximo,
// para um único caso extremo não achatar a nota de todos (só para requerimentos, quando houver dados).
function p90(valores) {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return 1;
  return v[Math.min(v.length - 1, Math.floor(0.9 * (v.length - 1)))] || 1;
}

// Lideranças contam uma vez por tipo (bancada, prefeito), mesmo que o ofício seja lido mais de uma vez.
export function pontosComissoes(comissoes = [], mesa = null, liderancas = []) {
  const daMesa = mesa ? (/^presidente$/i.test(mesa.trim()) ? PONTOS_MESA.presidente : PONTOS_MESA.outros) : 0;
  const daLideranca = new Set(liderancas.map((l) => l.tipo)).size * PONTOS_LIDERANCA;
  return daMesa + daLideranca + comissoes.reduce((acc, c) => {
    const cargo = norm(c.cargo);
    if (c.tipo === "frente") return acc + (cargo.includes("presidente") && !cargo.includes("vice") ? PONTOS_COMISSAO.presidenteFrente : PONTOS_COMISSAO.frente);
    const k = cargo.includes("vice") ? "vice-presidente" : cargo.includes("presidente") ? "presidente" : cargo.includes("relator") ? "relator" : "membro";
    return acc + PONTOS_COMISSAO[k];
  }, 0);
}

export function calcularNotas(vereadores, metodologia) {
  const cfg = metodologia.vereador;
  // As regras vão junto com as notas para o perfil mostrar a conta com os mesmos números.
  cfg.regras = { curva: CURVA, alvoLegislacao: ALVO_LEGISLACAO, alvoComissoes: ALVO_COMISSOES, perdaPorAdiamento: PERDA_POR_ADIAMENTO };
  const elegiveis = vereadores.filter((v) => v.indicadores.sessoes >= cfg.minimoSessoes);
  const por10 = (n, v) => (v.indicadores.sessoes ? (n / v.indicadores.sessoes) * 10 : 0);
  const refReq = p90(elegiveis.map((v) => por10(v.indicadores.requerimentos, v)));
  // As planilhas de sessão só trazem requerimentos que vão a plenário; se quase ninguém aparece,
  // o dado não representa a fiscalização e o pilar C fica só com as comissões.
  const usaRequerimentos = elegiveis.filter((v) => v.indicadores.requerimentos > 0).length >= MINIMO_COM_REQUERIMENTOS;

  for (const v of vereadores) {
    const i = v.indicadores;
    // Proporção direta, como no Ranking dos Políticos: 90% de presença vale 9.
    const presenca = i.presencaAjustada;
    const votacoes = i.participacaoVotos;
    const legislacao = curva(por10(i.pontosLegislacao, v), ALVO_LEGISLACAO);
    const requerimentos = Math.min(1, por10(i.requerimentos, v) / refReq);
    const comissoes = curva(i.pontosComissoes, ALVO_COMISSOES);
    v.pilares = {
      A: { nota: media([presenca, votacoes]), componentes: { presenca, votacoes } },
      B: { nota: legislacao, componentes: { legislacao } },
      // As comissões são a composição atual: para quem já saiu da Câmara, o dado não existe.
      C: v.emExercicio
        ? { nota: usaRequerimentos ? requerimentos * 0.7 + comissoes * 0.3 : comissoes, componentes: { requerimentos: usaRequerimentos ? requerimentos : null, comissoes } }
        : { nota: null, componentes: {} },
      D: { nota: null, componentes: {} },
      E: { nota: Math.max(0, 1 - (por10(i.adiadasPorAusencia, v) * PERDA_POR_ADIAMENTO) / 10), componentes: {} },
      // Só para quem foi consultado nas fontes; sem consulta, fica sem nota (nunca "nada consta" por omissão).
      F: { nota: v.integridade ? notaIntegridade(v.integridade.registros) : null, componentes: {} },
    };
    // Bônus de atuação na comunidade (moções e honrarias): só soma, com teto, como os bônus do Ranking dos Políticos.
    const comunidade = Math.min(BONUS_COMUNIDADE.maximo, ((i.mocoes + i.honrarias) / 10) * BONUS_COMUNIDADE.porDez) / 10;
    v.bonus = { comunidade };
    const elegivel = i.sessoes >= cfg.minimoSessoes;
    const base = media([v.pilares.B.nota, v.pilares.C.nota]);
    v.coeficientes = elegivel
      ? {
          participacao: v.pilares.A.nota == null ? null : (1 - PESO_PAUTA) * v.pilares.A.nota + PESO_PAUTA * v.pilares.E.nota,
          producao: base == null ? null : Math.min(1, base + comunidade),
          eficiencia: null,
          integridade: v.pilares.F.nota,
        }
      : { participacao: null, producao: null, eficiencia: null, integridade: v.pilares.F.nota };
    // O que produziu por sessão em que esteve presente: as faltas não entram na conta.
    v.indicadores.producaoPorPresenca = i.presencas ? (i.pontosLegislacao / i.presencas) * 10 : null;
    if (elegivel) v.coeficientes.eficiencia = curva(v.indicadores.producaoPorPresenca, ALVO_LEGISLACAO);
  }

  const ranquear = (lista, valor, gravar) =>
    lista
      .filter((v) => valor(v) != null)
      .sort((a, b) => valor(b) - valor(a))
      .forEach((v, idx) => gravar(v, idx + 1));
  const elegiveisAgora = vereadores.filter((v) => v.indicadores.sessoes >= cfg.minimoSessoes);
  // Integridade não ganha posição: não é uma disputa, só o registro de cada um.
  for (const k of ["A", "B", "C", "E"]) ranquear(elegiveisAgora, (v) => v.pilares[k].nota, (v, n) => (v.pilares[k].ranking = n));
  for (const v of vereadores) v.rankings = {};
  for (const k of ["participacao", "producao", "eficiencia"]) ranquear(elegiveisAgora, (v) => v.coeficientes[k], (v, n) => (v.rankings[k] = n));
  return { usaRequerimentos, referencias: { legislacao: ALVO_LEGISLACAO, requerimentos: refReq, comissoes: ALVO_COMISSOES } };
}
