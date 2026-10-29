// Tipos e rótulos da página "Dinheiro de fora" (dados gerados por scripts/lib/dinheiro.mjs em src/data/dinheiro.json).
// O arquivo de dados é importado só pela página: este módulo também vai para o painel do mapa, no navegador.

export type Fonte = { nome: string; url: string; coletadoEm?: string; posicao?: string };

export type EntradaAno = {
  ano: number;
  uniao: { convenios: number; sus: number; educacao: number; assistencia: number; fpm: number; outras: number; total: number };
  estado: { convenios: number; sus: number; icms: number; ipva: number; outras: number; total: number };
  fundeb: number;
};

export type Autor = { nome: string; coletiva: boolean; total: number; porAno: Record<string, number>; emendas: number; tipos: string[]; funcoes: string[] };

export type PlanoPix = {
  ano: number;
  parlamentar: string;
  valor: number;
  situacao: string;
  area: string | null;
  planoTrabalho: { situacao: string; inicio?: string; fim?: string } | null;
  objetos: { executor: string; objeto: string; valor: number; bairros: string[] }[];
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

export type PaginaDinheiro = {
  fontes: { entradas: Fonte; emendas: Fonte; pix: Fonte | null; pixEstaduais: Fonte | null; gastos: Fonte };
  entradas: EntradaAno[];
  emendas: {
    recebidoPorAno: Record<string, number>;
    autores: Autor[];
    entidades: { nome: string; total: number; autores: string[] }[];
    empresasForaDaConta: { total: number; quantidade: number };
  };
  pix: PlanoPix[];
  pixEstaduais: { data: string; valor: number; tipo: string; programa: string }[];
  convenios: { data: string; objeto: string; valor: number; numero: string; autor: string | null; bairros: string[] }[];
  gastos: GastoAno[];
};

// Item do mapa: o que cita o bairro, com a origem do dinheiro.
export type ItemDinheiroBairro = {
  origem: "pix" | "convenio" | "gastoFederal" | "gastoEstadual" | "gastoVereadores";
  ano: number;
  valor: number;
  texto: string;
  quem: string | null;
  pagamentos?: number;
  outrosBairros: number;
};

export const ROTULO_ORIGEM: Record<ItemDinheiroBairro["origem"], string> = {
  pix: "Emenda federal (transferência especial)",
  convenio: "Convênio de emenda federal",
  gastoFederal: "Pago com dinheiro federal",
  gastoEstadual: "Pago com dinheiro estadual",
  gastoVereadores: "Pago com emenda de vereador",
};

// A CGU grava nomes sem acento e abreviados ("COM. DE PREVI., ASSIS. SOCI, INFAN., ADOL. E FAMIL"); estas trocas
// devolvem as palavras inteiras.
const PALAVRAS: [RegExp, string][] = [
  [/saude/g, "saúde"],
  [/educacao/g, "educação"],
  [/previ\.?/g, "previdência"],
  [/assis\.?/g, "assistência"],
  [/soci\.?/g, "social"],
  [/infan\.?/g, "infância"],
  [/adol\.?/g, "adolescência"],
  [/famil\.?/g, "família"],
  [/sao paulo/g, "São Paulo"],
];
const corrige = (s: string) => PALAVRAS.reduce((t, [re, por]) => t.replace(re, por), s.toLowerCase());

// Nomes como a CGU grava ("PR. MARCO FELICIANO", "COM. DA SAUDE") viram nomes legíveis.
export const nomeAutor = (s: string) =>
  /^RELATOR GERAL/i.test(s)
    ? "Relator-geral do Orçamento"
    : /^COM\./i.test(s)
      ? `Comissão ${corrige(s.replace(/^COM\.\s*/i, ""))} (Câmara dos Deputados ou Senado)`
      : /^BANCADA/i.test(s)
        ? `B${corrige(s).slice(1)}`
        : /^Sem informa/i.test(s)
          ? "Sem autor informado"
          : s
              .toLowerCase()
              .replace(/\b\p{L}/gu, (m) => m.toUpperCase())
              .replace(/ (De|Da|Do|Dos|Das|E) /g, (m) => m.toLowerCase());

// Área da emenda como a CGU grava; "Encargos especiais" é a área das transferências especiais, de uso livre.
export const nomeFuncao = (f: string) => (/^encargos especiais$/i.test(f) ? "Uso livre (emenda Pix)" : f.charAt(0) + f.slice(1).toLowerCase());
