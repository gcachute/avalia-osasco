// Tipos e rótulos da página "Verbas e receitas" (/verbas) (dados gerados por scripts/lib/dinheiro.mjs em src/data/dinheiro.json).
// O arquivo de dados é importado só pela página: este módulo também vai para o painel do mapa, no navegador.

export type Fonte = { nome: string; url: string; coletadoEm?: string; posicao?: string };

// Conta da Declaração de Contas Anuais que forma uma linha do quadro de entradas.
export type ContaDCA = { conta: string; valor: number };

// Contas de cada linha e a parte retida para formar o FUNDEB (que volta na linha do FUNDEB).
type Retencao = { contas: Record<string, ContaDCA[]>; paraFundeb: Record<string, number>; paraFundebTotal: number };

export type EntradaAno = {
  ano: number;
  uniao: { convenios: number; sus: number; educacao: number; assistencia: number; fpm: number; outras: number; total: number } & Retencao;
  estado: { convenios: number; sus: number; icms: number; ipva: number; outras: number; total: number } & Retencao;
  fundeb: number;
  contasFundeb: ContaDCA[];
  // Receita da própria cidade (impostos, taxas, previdência dos servidores e outras).
  propria: { previdencia: number; iss: number; iptu: number; itbi: number; irrf: number; taxas: number; iluminacao: number; outras: number; total: number } & Retencao;
};

// Cadastro do parlamentar na Câmara dos Deputados ou no Senado.
export type PerfilParlamentar = {
  casa: "camara" | "senado";
  id: string | number;
  nome: string;
  sexo: "M" | "F";
  uf: string | null;
  partido: string;
  partidos: { sigla: string; desde: string | null }[];
  situacao: string;
  legislaturas: number[];
  perfil: string;
  foto: string | null;
  indicacaoDe: string | null;
};

export type TipoEmenda = "pix" | "finalidade" | "bancada" | "comissao" | "relator" | "vereador" | "outra";

// Compra ou serviço pago com o dinheiro de uma emenda, como a Prefeitura informou ao Tribunal de Contas.
export type Pagamento = { data: string; valor: number; fornecedor: string | null; cnpj: string | null; modalidade: string; texto: string | null; pagamentos: number };

export type Emenda = {
  codigo: string | null;
  ano: number;
  numero: string | null;
  tipo: TipoEmenda;
  partido: string | null;
  funcao: string | null;
  subfuncao: string | null;
  programa: string | null;
  acao: string | null;
  planoOrcamentario: string | null;
  localidade: string | null;
  recebido: number;
  paraEntidades: number;
  recebimentos: { mes: string; favorecido: string; cnpj: string; entidade: boolean; valor: number }[];
  convenios: { numero: string; data: string; objeto: string; valor: number; bairros: string[] }[];
  pix: {
    valor: number;
    situacao: string;
    area: string | null;
    planoTrabalho: { situacao: string; inicio?: string; fim?: string } | null;
    objetos: { executor: string; objeto: string; valor: number; bairros: string[] }[];
  } | null;
  bairros: string[];
  // Compras pagas com esta emenda (quando o histórico do pagamento cita o número dela).
  pagamentos: Pagamento[];
  pagoNasNotas: number;
  // Citada nos pagamentos da Prefeitura, mas sem registro de recebimento por Osasco na CGU.
  semRegistro?: boolean;
};

export type TipoAutor = "deputado" | "senador" | "vereador" | "relator" | "comissao" | "bancada" | "semAutor" | "desconhecido";

export type Autor = {
  chave: string;
  nome: string;
  coletiva: boolean;
  tipo: TipoAutor;
  perfil: PerfilParlamentar | null;
  // Vereador de Osasco: página do vereador neste site, quando ele está na legislatura atual.
  vereador: { id: string; partido: string | null; foto: string | null } | null;
  total: number;
  totalEntidades: number;
  porAno: Record<string, number>;
  quantidade: number;
  funcoes: string[];
  partidosNaEpoca: string[];
  emendas: Emenda[];
};

export type ResumoGasto = {
  total: number;
  pessoasFisicas: number;
  quantidadeFornecedores: number;
  funcoes: { nome: string; valor: number }[];
  aplicacoes: { nome: string; valor: number }[];
  fornecedores: { cnpj: string; nome: string; valor: number; principal: string | null }[];
};

export type GastoAno = {
  ano: number;
  ultimoMes: number;
  tesouro: number;
  federal: ResumoGasto | null;
  estadual: ResumoGasto | null;
  emendasFederais: { total: number; fornecedores: { cnpj: string; nome: string; valor: number }[] } | null;
  emendasEstaduais: { total: number; fornecedores: { cnpj: string; nome: string; valor: number }[] } | null;
  emendasVereadores: { total: number; fornecedores: { cnpj: string; nome: string; valor: number }[] } | null;
};

// Forma de contratação: valor pago por licitação, dispensa, inexigibilidade e o que não passa por contratação.
export type Modalidades = { licitacao: number; dispensa: number; inexigivel: number; semContratacao: number; total: number };

export type Punicao = {
  lista: "CEIS" | "CNEP" | "CEPIM";
  categoria: string;
  inicio: string | null;
  fim: string | null;
  orgao: string;
  abrangencia: string | null;
  valeParaOsasco: boolean;
  outraUnidade: boolean;
  pagoDurante: number;
};

export type Integridade = {
  conferidos: number;
  listas: Record<string, string>;
  fonteListas: Fonte;
  punidos: { cnpj: string; nome: string; recebeu: number; anos: string[]; deEmenda: number; punicoes: Punicao[] }[];
  modalidades: { ano: number; emendas: Modalidades; todos: Modalidades }[];
  dispensasEmendas: { fornecedor: string; valor: number; anos: number[]; modalidade: string }[];
  relator: { total: number; quantidade: number; anos: number[] };
  pix: { impedidos: { autor: string; ano: number; valor: number }[]; atrasados: { autor: string; ano: number; valor: number; fim: string; situacao: string }[]; semObjeto: number };
  atrasadas: { autor: string; codigo: string; ano: number; anosRecebido: number[]; valor: number }[];
  concentracao: { ano: number; total: number; fornecedor: string; valor: number }[];
  rastreio: { ano: number; total: number; comNumero: number }[];
  entidadesVariasFontes: { nome: string; federal: number; vereadores: number; autores: string[] }[];
};

// Ano em andamento, pelo relatório bimestral, comparado aos mesmos meses do ano anterior.
export type Parcial = {
  ano: number;
  ateMes: number;
  linhas: { grupo: "propria" | "estado" | "uniao" | "fundeb" | "outras" | "retencao"; chave: string; nome: string; atual: number; anterior: number | null; previsao: number | null }[];
  uniao: { chave: string; atual: number; anterior: number | null }[];
  fonte: Fonte;
};

// Um valor da página comparado com outra fonte, ano a ano.
export type Conferencia = {
  chave: string;
  nome: string;
  fonteA: string;
  fonteB: string;
  nota: string | null;
  anos: { ano: number; a: number; b: number; situacao: "igual" | "proximo" | "diferente"; nota: string | null }[];
};

export type PaginaDinheiro = {
  fontes: { entradas: Fonte; emendas: Fonte; pix: Fonte | null; pixEstaduais: Fonte | null; gastos: Fonte; parlamentares: Fonte | null };
  entradas: EntradaAno[];
  emendas: {
    recebidoPorAno: Record<string, number>;
    autores: Autor[];
    porPartido: { sigla: string; valor: number; autores: number }[];
    entidades: { nome: string; total: number; autores: string[] }[];
    empresasForaDaConta: { total: number; quantidade: number };
    entidadesForaDaConta: { entidade: string; autor: string; destino: string | null; ano: number | null; valor: number }[];
  };
  vereadores: Autor[];
  pixEstaduais: { data: string; valor: number; tipo: string; programa: string }[];
  convenios: { data: string; objeto: string; valor: number; numero: string; autor: string | null; bairros: string[] }[];
  gastos: GastoAno[];
  integridade: Integridade | null;
  parcial: Parcial | null;
  conferencias: Conferencia[];
  fontesConferencia: { rreo: Fonte | null; uniao: Fonte | null; estado: Fonte | null };
};

// Item do mapa: o que cita o bairro, com a origem do dinheiro.
export type ItemDinheiroBairro = {
  origem: "pix" | "convenio" | "gastoEmenda" | "gastoFederal" | "gastoEstadual" | "gastoVereadores";
  ano: number;
  valor: number;
  texto: string;
  quem: string | null;
  // Autor da emenda (chave usada em /verbas?autor=...), quando o item vem de uma emenda conhecida.
  autor?: string | null;
  pagamentos?: number;
  outrosBairros: number;
  // Todos os bairros citados pelo item (o valor é dividido igualmente entre eles).
  bairros?: string[];
  // Rua, córrego ou lugar que ligou o item aos bairros.
  via?: string[];
  // Várias emendas ou compras com o mesmo propósito, ano e bairros, juntas: cada parte com quem e quanto.
  partes?: { quem: string | null; autor: string | null; valor: number; pagamentos: number | null }[];
};

export const ROTULO_ORIGEM: Record<ItemDinheiroBairro["origem"], string> = {
  pix: "Emenda Pix federal",
  convenio: "Convênio de emenda federal",
  gastoEmenda: "Compra paga com emenda",
  gastoFederal: "Gasto com verba federal",
  gastoEstadual: "Gasto com verba estadual",
  gastoVereadores: "Gasto com emenda individual",
};

// Grupos do painel do mapa: o que é promessa de dinheiro (emendas e convênios) e o que já virou pagamento.
export const GRUPO_ORIGEM: Record<ItemDinheiroBairro["origem"], "emendas" | "federal" | "estadual" | "vereadores"> = {
  pix: "emendas",
  convenio: "emendas",
  gastoEmenda: "emendas",
  gastoFederal: "federal",
  gastoEstadual: "estadual",
  gastoVereadores: "vereadores",
};

export const ROTULO_TIPO_EMENDA: Record<TipoEmenda, string> = {
  pix: "Emenda Pix",
  finalidade: "Emenda com destino definido",
  bancada: "Emenda de bancada",
  comissao: "Emenda de comissão",
  relator: "Emenda de relator",
  vereador: "Emenda de vereador",
  outra: "Emenda",
};

export const EXPLICA_TIPO_EMENDA: Record<TipoEmenda, string> = {
  pix: "O dinheiro cai direto no caixa da Prefeitura, que decide o uso e informa depois o que vai fazer.",
  finalidade: "O dinheiro vem amarrado a um programa do ministério (saúde, assistência social...) e só pode ser usado nele.",
  bancada: "Indicada em conjunto pelos deputados e senadores de um estado.",
  comissao: "Indicada por uma comissão da Câmara dos Deputados ou do Senado; o registro não diz qual parlamentar pediu.",
  relator: "Indicada pelo relator-geral do Orçamento. O registro não diz qual parlamentar pediu. O Supremo Tribunal Federal julgou esse tipo de emenda inconstitucional em dezembro de 2022.",
  vereador: "Parte do orçamento da Prefeitura que cada vereador indica onde gastar (emenda impositiva).",
  outra: "",
};

// A CGU grava nomes sem acento e abreviados ("COM. DE PREVI., ASSIS. SOCI, INFAN., ADOL. E FAMIL"); estas trocas
// devolvem as palavras inteiras.
const PALAVRAS: [RegExp, string][] = [
  [/saude/g, "saúde"],
  [/educacao/g, "educação"],
  [/previ\.?/g, "previdência"],
  [/assis\.?/g, "assistência"],
  [/soci\.?/g, "social"],
  [/infan\.?/g, "infância"],
  [/adol\.?/g, "adolescência"],
  [/famil\.?/g, "família"],
  [/sao paulo/g, "São Paulo"],
  [/rio de janeiro/g, "Rio de Janeiro"],
];
const corrige = (s: string) => PALAVRAS.reduce((t, [re, por]) => t.replace(re, por), s.toLowerCase());
const capitaliza = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s(-])(\p{L})/gu, (m) => m.toUpperCase())
    .replace(/ (De|Da|Do|Dos|Das|E) /g, (m) => m.toLowerCase())
    .replace(/\b(Ii|Iii|Iv|Vi|Vii)\b/g, (m) => m.toUpperCase());

// Nomes como a CGU grava ("PR. MARCO FELICIANO", "COM. DA SAUDE") viram nomes legíveis.
export const nomeAutor = (s: string) =>
  /^RELATOR GERAL/i.test(s)
    ? "Relator-geral do Orçamento"
    : /^COM\./i.test(s)
      ? `Comissão ${corrige(s.replace(/^COM\.\s*/i, ""))}`
      : /^BANCADA/i.test(s)
        ? `B${corrige(s).slice(1)}`
        : /^Sem informa/i.test(s)
          ? "Sem autor informado"
          : capitaliza(s);

// Nome para mostrar: o do cadastro da Câmara ou do Senado (com acentos), em maiúsculas e minúsculas.
export const nomeDe = (a: Pick<Autor, "nome" | "perfil">) => {
  const n = a.perfil?.nome ?? a.nome;
  return n === n.toUpperCase() || /^Sem informa/i.test(n) ? nomeAutor(n) : n;
};

// "Deputada federal", "Senador", "Comissão do Congresso"...
export function cargoDe(a: Pick<Autor, "tipo" | "perfil">) {
  const f = a.perfil?.sexo === "F";
  switch (a.tipo) {
    case "deputado":
      return f ? "Deputada" : "Deputado";
    case "senador":
      return f ? "Senadora" : "Senador";
    case "vereador":
      return "Vereador";
    case "relator":
      return "Relator do Orçamento";
    case "comissao":
      return "Comissão";
    case "bancada":
      return "Bancada";
    default:
      return null;
  }
}

export const esferaDe = (a: Pick<Autor, "tipo">): "Federal" | "Estadual" | "Municipal" | null =>
  a.tipo === "vereador" ? "Municipal" : a.tipo === "desconhecido" || a.tipo === "semAutor" ? null : "Federal";

// Situação do mandato hoje, como a Câmara e o Senado registram.
export function situacaoDe(p: PerfilParlamentar) {
  const f = p.sexo === "F";
  if (p.situacao === "Exercício") return "no cargo";
  if (p.situacao === "Licença") return f ? "licenciada" : "licenciado";
  if (p.situacao === "Suplência") return "suplente";
  if (p.situacao === "Vacância") return "deixou o cargo";
  return p.casa === "senado" ? (f ? "ex-senadora" : "ex-senador") : f ? "ex-deputada" : "ex-deputado";
}

// Área da emenda como a CGU grava; "Encargos especiais" é a área das transferências especiais, de uso livre.
export const nomeFuncao = (f: string) => (/^encargos especiais$/i.test(f) ? "Uso livre (emenda Pix)" : f.charAt(0) + f.slice(1).toLowerCase());

// Nome de órgão ou entidade em maiúsculas ("FUNDO MUNICIPAL DE SAUDE DE OSASCO") vira "Fundo Municipal de Saude de Osasco".
export const nomeProprio = (s: string) => (s === s.toUpperCase() ? capitaliza(s) : s);

// Texto oficial em maiúsculas vira frase ("AQUISICAO DE BALANCA" -> "Aquisicao de balanca").
export const frase = (s: string) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesAno = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`;

// Situação do plano de trabalho das emendas Pix, como o Transferegov grava.
export const situacaoPlano = (s: string) =>
  /CONCLUIDO/i.test(s) ? "prestação de contas concluída" : /APROVADO/i.test(s) ? "plano aprovado" : /Ajuste/i.test(s) ? "plano em ajuste" : /Elabora/i.test(s) ? "plano em elaboração" : /Complementa/i.test(s) ? "plano em complementação" : s.toLowerCase();
