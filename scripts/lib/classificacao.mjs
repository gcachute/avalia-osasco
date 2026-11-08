// Classificação dos projetos de lei pela ementa (o resumo oficial do projeto).
//
// Simbólico: o projeto só nomeia, comemora, homenageia, reconhece ou divulga; não cria serviço, direito, obrigação ou regra
// para a população ou para a administração. Política pública: todo o resto.
//
// O critério, item a item (o mesmo da página de metodologia):
//  1. Nome: denominar ou mudar o nome de rua, praça, prédio, equipamento ou programa.
//  2. Data e evento: instituir dia, semana, mês, data, festa, festival, celebração, caminhada ou corrida, incluir no
//     calendário oficial ou tirar de lá.
//  3. Campanha de conscientização ou divulgação, qualquer que seja o verbo ("institui", "dispõe sobre", "promoção da").
//  4. Reconhecimento: título de cidadão, utilidade pública, honraria, homenagem, medalha, comenda, diploma, prêmio,
//     cidades-irmãs, reconhecimento como patrimônio ou como "capital" de algo.
//  5. Selo ou certificado de reconhecimento a empresas, escolas ou servidores ("Selo Empresa Amiga de…").
//  6. Ato cerimonial: conteúdo de placas de inauguração, iluminação especial em alusão a uma data, sinal em Libras dos
//     vereadores na posse.
// Exceções, que fazem o projeto voltar a ser política pública mesmo com uma das marcas acima: instituir um programa
// (a "Medalha QR Code" de um programa de identificação animal é a plaqueta do animal, não honraria), criar também um
// programa ou política no mesmo projeto ("Institui o Dia… e cria o Programa…"), instituir um inventário ou cadastro,
// mudar o lugar de uma praça além do nome, e usar o nome só como lugar do serviço (QR Code nas placas de ruas).
const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[“”"'‘’«»]/g, "")
    .replace(/\s+/g, " ");

// Começo da ementa até o objeto: "institui", "institui, no âmbito do Município de Osasco,", "dispõe sobre a instituição
// do", "institui no calendário oficial…".
const VERBO = String.raw`(institui|instituem|cria|dispoe sobre|dispoe do|fica instituid[oa])`;

const REGRAS = [
  ["nome", /\bdenomina|\bda nome\b|\bdar nome\b|\bdenominacao\b/],
  ["data", /calendario oficial|\b(dia|semana|mes) municipal\b|\bdata comemorativa\b/],
  ["data", new RegExp(String.raw`^${VERBO}\b[^.]{0,80}?\b(o|a|os|as)? ?(dia|semana|mes|festa|festival|marcha|jornada|celebracao|caminhada|corrida|meia maratona|maratona|kids day)\b`)],
  ["data", /^institui o (mes|dia) [a-z]+ (rosa|azul|laranja|violeta|roxo|lilas|amarelo|verde|caramelo|branco|vermelho|dourado|prata)\b|^institui o dia roxo/],
  ["campanha", /\bcampanha\b/],
  ["reconhecimento", /titulo de (cidadao|cidada|utilidade publica)|utilidade publica|\bhonraria\b|\bhomenage(m|ns)\b|\bmedalha\b|\bcomenda\b|\bdiploma\b|\bpremiacao\b|\bpremio\b|cidades-irmas|reconhece como (patrimonio|capital)|reconhecimento .{0,40}como (patrimonio|expressao cultural)|patrimonio (cultural|historico|imaterial)|capital (municipal|estadual) d/],
  ["selo", /\bselo (empresa|escola|servidor|entidade|amig)|\bselo [^.]{0,40}\bamig[oa]s?\b|certificacao municipal/],
  ["cerimonial", /placas? de inauguracao|iluminacao especial[^.]{0,80}alusao|sinal de identificacao em lingua brasileira de sinais[^.]{0,40}vereadores/],
];
const EXCECOES = [
  /\be (cria|institui) (o|a) (programa|politica)\b/,
  /^(institui|cria|dispoe sobre a criacao d[oa]) (o )?programa\b/,
  /alteracao da localizacao/,
  /\binventario\b|\bcadastro\b/,
  /placas? de denominacao/,
];

export function classificar(ementa) {
  const t = norm(ementa).replace(/,?\s*de autoria d[oa].*$/, "");
  const regra = REGRAS.find(([, re]) => re.test(t));
  if (!regra || EXCECOES.some((re) => re.test(t))) return { classe: "substantivo", motivo: null };
  return { classe: "simbolico", motivo: regra[0] };
}

// Projetos do Executivo: o tipo do projeto, para ler a lista (não entra em nota).
const TIPOS_EXECUTIVO = [
  ["orcamento", /credito adicional|orcament|diretrizes orcamentarias|plano plurianual|estima a receita|operacao de credito/],
  ["pessoal", /\bcargo|vencimento|reajuste|\babono\b|plano de carreira|estrutura organizacional|consignac|fundos de previdencia|arquitetura organizacional|redistribuicao dos cargos/],
  ["tributos", /\biptu\b|tribut|parcelamento|valor venal|transacao/],
  ["imoveis", /doar area|doacao de area|desafetacao|area de propriedade|area de terreno|localizacao da praca/],
];
export function tipoExecutivo(ementa) {
  const t = norm(ementa);
  if (classificar(ementa).classe === "simbolico") return "simbolico";
  return TIPOS_EXECUTIVO.find(([, re]) => re.test(t))?.[0] ?? "politica";
}
