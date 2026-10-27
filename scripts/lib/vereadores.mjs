// Nota dos vereadores em cinco pilares (pesos em data/metodologia.json → vereador.pesos).
//  A. Assiduidade: presença (faltas justificadas não contam contra) e participação nas votações nominais.
//  B. Legislação que importa: projetos ponderados pelo tipo (simbólicos valem pouco) e leis sancionadas.
//  C. Fiscalização: requerimentos ao Executivo e trabalho em comissões.
//  D. Custo do mandato: ainda sem fonte aberta; fica sem nota.
//  E. Compromisso com a pauta: itens próprios adiados porque o autor faltou.
import { linear, media } from "./fiscal.mjs";

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
  ["Saúde", /saude|hospital|medic|doenc|vacina|odontolog|ubs\b|tratamento|diagnost|heimlich|primeiros socorros|doacao de sangue|cancer|diabet|obesidade|enfermag|farmac|internac|outubro rosa|novembro azul/],
  ["Pessoas com deficiência e TEA", /autis|\btea\b|deficien|neurodiverg|doenca(s)? rara|pcd/],
  ["Educação", /escola|ensino|educa|aluno|creche|professor|alfabetiz|pedagog|leitura|biblioteca/],
  ["Mulheres", /mulher|feminin|gestante|violencia domestica|maria da penha|menstru|materni/],
  ["Crianças e jovens", /crianca|adolescente|juventude|jovem|infantil|bebe/],
  ["Segurança", /seguranca|guarda civil|gcm|polic|monitoramento|camera|violencia/],
  ["Animais", /animal|animais|\bpet|\bcaes\b|\bcao\b|gato|fauna/],
  ["Meio ambiente", /ambient|arvore|verde|sustentab|sustentav|reciclag|residuo|tampinha|natureza|poluic|clima|enchente/],
  ["Mobilidade", /transito|transporte|onibus|ciclo|motocicl|motoboy|estacionamento|calcada|viario|pedestre|semaforo|lombada/],
  ["Idosos", /idos[ao]|terceira idade|aposentad/],
  ["Esporte, cultura e lazer", /esport|cultur|\barte|musica|turismo|lazer|festival|maratona|corrida|futebol|natal/],
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
export const temasDoProjeto = (ementa) => TEMAS.filter(([, re]) => re.test(norm(ementa))).map(([t]) => t);

export const PESO_SIMBOLICO = 0.2;
export const ESCALA_PRESENCA = [0.75, 0.95]; // abaixo de 75% vale 0, a partir de 95% vale 10
export const LIMITE_ADIAMENTOS = 3; // itens adiados por falta do autor a cada 10 sessões que zeram o pilar E
export const MINIMO_COM_REQUERIMENTOS = 5;
export const PONTOS_COMISSAO = { presidente: 1.5, "vice-presidente": 1.25, relator: 1.25, membro: 1, frente: 0.25 };
export const PONTOS_MESA = { presidente: 4, outros: 3 };

// Referência robusta para quantidades: o percentil 90 entre os vereadores, em vez do máximo,
// para um único caso extremo não achatar a nota de todos.
function p90(valores) {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return 1;
  return v[Math.min(v.length - 1, Math.floor(0.9 * (v.length - 1)))] || 1;
}

export function pontosComissoes(comissoes = [], mesa = null) {
  const daMesa = mesa ? (/^presidente$/i.test(mesa.trim()) ? PONTOS_MESA.presidente : PONTOS_MESA.outros) : 0;
  return daMesa + comissoes.reduce((acc, c) => {
    if (c.tipo === "frente") return acc + PONTOS_COMISSAO.frente;
    const cargo = norm(c.cargo);
    const k = cargo.includes("vice") ? "vice-presidente" : cargo.includes("presidente") ? "presidente" : cargo.includes("relator") ? "relator" : "membro";
    return acc + PONTOS_COMISSAO[k];
  }, 0);
}

export function calcularNotas(vereadores, metodologia) {
  const cfg = metodologia.vereador;
  const elegiveis = vereadores.filter((v) => v.indicadores.sessoes >= cfg.minimoSessoes);
  const por10 = (n, v) => (v.indicadores.sessoes ? (n / v.indicadores.sessoes) * 10 : 0);
  const refLeg = p90(elegiveis.map((v) => por10(v.indicadores.pontosLegislacao, v)));
  const refReq = p90(elegiveis.map((v) => por10(v.indicadores.requerimentos, v)));
  const refCom = p90(elegiveis.map((v) => v.indicadores.pontosComissoes));
  // As planilhas de sessão só trazem requerimentos que vão a plenário; se quase ninguém aparece,
  // o dado não representa a fiscalização e o pilar C fica só com as comissões.
  const usaRequerimentos = elegiveis.filter((v) => v.indicadores.requerimentos > 0).length >= MINIMO_COM_REQUERIMENTOS;
  const escala = (x) => (x == null ? null : linear(x, ESCALA_PRESENCA[0], 0, ESCALA_PRESENCA[1], 1));

  for (const v of vereadores) {
    const i = v.indicadores;
    const presenca = escala(i.presencaAjustada);
    const votacoes = escala(i.participacaoVotos);
    const legislacao = Math.min(1, por10(i.pontosLegislacao, v) / refLeg);
    const requerimentos = Math.min(1, por10(i.requerimentos, v) / refReq);
    const comissoes = Math.min(1, i.pontosComissoes / refCom);
    v.pilares = {
      A: { nota: media([presenca, votacoes]), componentes: { presenca, votacoes } },
      B: { nota: legislacao, componentes: { legislacao } },
      // As comissões são a composição atual: para quem já saiu da Câmara, o dado não existe.
      C: v.emExercicio
        ? { nota: usaRequerimentos ? requerimentos * 0.7 + comissoes * 0.3 : comissoes, componentes: { requerimentos: usaRequerimentos ? requerimentos : null, comissoes } }
        : { nota: null, componentes: {} },
      D: { nota: null, componentes: {} },
      E: { nota: linear(por10(i.adiadasPorAusencia, v), 0, 1, LIMITE_ADIAMENTOS, 0), componentes: {} },
    };
    const comNota = Object.entries(v.pilares).filter(([, p]) => p.nota != null);
    const peso = comNota.reduce((a, [k]) => a + cfg.pesos[k], 0);
    const total = Object.values(cfg.pesos).reduce((a, b) => a + b, 0);
    v.cobertura = peso / total;
    v.nota = i.sessoes >= cfg.minimoSessoes && peso ? Math.round((comNota.reduce((a, [k, p]) => a + cfg.pesos[k] * p.nota, 0) / peso) * 100) / 10 : null;
  }

  for (const k of ["A", "B", "C", "E"]) {
    const ordem = vereadores.filter((v) => v.nota != null && v.pilares[k].nota != null).sort((a, b) => b.pilares[k].nota - a.pilares[k].nota);
    ordem.forEach((v, idx) => (v.pilares[k].ranking = idx + 1));
  }
  return { usaRequerimentos, referencias: { legislacao: refLeg, requerimentos: refReq, comissoes: refCom } };
}
