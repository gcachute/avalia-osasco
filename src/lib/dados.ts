import bruto from "@/data/dados.json";

export * from "./formato";

export type Sessao = { id: string; numero: number; tipo: "ordinaria" | "extraordinaria"; data: string; url: string };
export type Proposicao = { key: string; tipo: string; numero: number; ano: number; autor: string; ementa: string; sessao: string; temas?: string[] };
export type Lei = { key: string; lei: string; data: string; autor: string; resumo: string; sessao: string; temas?: string[] };
export type Veto = { key: string; tipo: string; numero: string; projeto: string; autor: string; resumo: string; sessao: string; temas?: string[] };

export type RequerimentoNaPauta = {
  key: string;
  numero: number;
  ano: number;
  autor: string;
  ementa: string;
  sessoes: number;
  primeira: string;
  ultima: string;
  status: string | null;
  aindaNaPauta: boolean;
};

export type Camara = {
  custoMandato: {
    fonte: string;
    url: string;
    ano: number;
    subsidio: number;
    gabinete: { cargo: string; quantidade: number; vencimento: number }[];
    assessores: number;
    gabineteMensal: number;
    totalMensal: number;
  } | null;
  despesas: {
    fonte: string;
    url: string;
    coletadoEm: string;
    anos: Record<string, { pago: number; meses: number; maioresFornecedores: { nome: string; pago: number }[] }>;
  } | null;
  requerimentosParados: number;
};

export type ItemMapa = {
  id: string;
  tipo: string;
  origem: "camara" | "prefeitura";
  autor: string;
  autorNome: string | null;
  data: string;
  sessao: string;
  texto: string;
  bairros: string[];
  // Coautorias: todos os autores citados (o primeiro também está em `autor`).
  autores?: string[];
  autoresNomes?: string[];
  // Quando o bairro foi reconhecido pela escola ou unidade de saúde citada, e não pelo nome.
  via?: string[];
};

export type CensoBairro = {
  areaKm2: number | null;
  pessoas: number;
  domicilios: number;
  moradoresPorDomicilio: number | null;
  rendaMedia: number | null;
  rendaMediana: number | null;
  agua: number | null;
  esgoto: number | null;
  lixo: number | null;
  alfabetizados: number | null;
  negros: number | null;
  criancas: number | null;
  idosos: number | null;
  pavimentacao: number | null;
  bueiro: number | null;
  iluminacao: number | null;
  onibus: number | null;
  calcada: number | null;
  rampa: number | null;
  arvores: number | null;
  densidade: number | null;
  poucosMoradores: boolean;
};

export type BairroMapa = {
  id: string;
  codigo: string;
  nome: string;
  populacao: number | null;
  citacoes: number;
  censo?: CensoBairro | null;
  eleicao?: {
    locais: number;
    eleitores: number;
    prefeito: { nome: string; pct: number | null }[] | null;
    vereadores: { nome: string; id: string; votos: number; pct: number }[] | null;
    validosVereador: number;
    comparecimento?: number | null;
    brancosNulos?: number | null;
    partidos?: { numero: string; sigla: string; pct: number }[] | null;
  } | null;
  partidoPrefeito?: number | null;
  favelas?: { moradores: number; pct: number | null; comunidades: { nome: string; moradores: number }[] } | null;
  seguranca?: Record<GrupoCrime, { n: number; por10mil: number | null }> | null;
  obras?: { objeto: string; situacao: string; valor: number; contratante: string; contratado: string; ano: number }[];
  saude?: { cnes: string; nome: string; tipo: string; publica: boolean; turno: string | null }[];
  escolas?: { codigo: string; nome: string; rede: string; idebIniciais: number | null; idebFinais: number | null }[];
};

export type GrupoCrime = "mortes" | "roubos" | "furtos" | "violencia" | "sexual" | "transito" | "drogas";

export type PontoMapa = { tipo: "saude" | "votacao" | "escola"; categoria: string; nome: string; lat: number; lon: number; bairro: string | null; eleitores?: number };

export type Mapa = {
  fonte: string;
  bairros: BairroMapa[];
  itens: ItemMapa[];
  cidade: (Partial<Record<keyof CensoBairro, number | null>> & { pessoas?: number; densidade?: number } & Record<string, number | null | undefined>) | null;
  prefeitoEleicao: { nome: string; votos: number; pct: number }[];
  votosVereador: Record<string, { nomeUrna: string; total: number; porBairro: Record<string, number> }>;
  pontos: PontoMapa[];
  minimoMoradores: number;
  anoSeguranca?: number | null;
  partidoDoPrefeito?: string | null;
  partidosCidade?: { numero: string; sigla: string; votos: number }[];
  fontes: { nome: string; url: string }[];
};

export type PilarVereador = "A" | "B" | "C" | "D" | "E";

export type Comissao = { nome: string; url: string; cargo: string; tipo: "permanente" | "temporaria" | "frente" };

export type Vereador = {
  id: string;
  nome: string;
  partido: string | null;
  partidoNome: string | null;
  partidoLogo: string | null;
  foto: string | null;
  fotoFonte: string | null;
  perfilOficial: string | null;
  perfil: {
    nomeCompleto: string | null;
    votos: number | null;
    telefone: string | null;
    email: string | null;
    naturalidade: string | null;
    ocupacao: string | null;
    instrucao: string | null;
    redes: { rede: string; url: string }[];
    bio: string[];
    comissoes: Comissao[];
    mesa: string | null;
  } | null;
  emExercicio: boolean;
  nota: number | null;
  posicao: number | null;
  cobertura: number;
  pilares: Record<PilarVereador, { nota: number | null; ranking?: number; componentes: Record<string, number | null> }>;
  indicadores: {
    sessoes: number;
    presencas: number;
    faltas: number;
    faltasJustificadas: number;
    presenca: number | null;
    presencaAjustada: number | null;
    pontualidade: number | null;
    votos: { sim: number; nao: number; abstencao: number; ausente: number };
    participacaoVotos: number | null;
    projetos: number;
    projetosSubstantivos: number;
    projetosSimbolicos: number;
    pontosLegislacao: number;
    honrarias: number;
    mocoes: number;
    requerimentos: number;
    requerimentosNaPauta: number;
    comissoes: number;
    frentes: number;
    pontosComissoes: number;
    leisSancionadas: number;
    vetosRecebidos: number;
    adiadasPorAusencia: number;
  };
  temas: { tema: string; n: number }[];
  atividadePorMes: { mes: string; proposicoes: number }[];
  presencaPorSessao: { sessao: string; presente: boolean | null; primeiraChamada: boolean | null; presidente: boolean }[];
  proposicoes: (Proposicao & { classe?: "substantivo" | "simbolico"; temas?: string[] })[];
  requerimentos: Proposicao[];
  requerimentosNaPauta: RequerimentoNaPauta[];
  leis: Lei[];
  vetos: Veto[];
  adiadas: { sessao: string; item: string; titulo: string | null; ementa: string; temas: string[] }[];
};

export type IndicadoresFiscais = {
  saude: number | null;
  educacao: number | null;
  fundeb: number | null;
  pessoal: number | null;
  investimento: number | null;
  primario: { meta: number; resultado: number; rcl: number; diferencaRCL: number } | null;
};

export type CidadeFiscal = {
  ibge: number;
  nome: string;
  foco: boolean;
  semDados: boolean;
  fontes: Partial<Record<"rreo14" | "rreo01" | "rgf01", string>>;
  indicadores: IndicadoresFiscais;
  posicao: Partial<Record<"saude" | "educacao" | "fundeb" | "pessoal" | "investimento", number | null>>;
  pilares: {
    A: { nota: number | null; ranking?: number; componentes: { pessoal: number | null; investimento: number | null; primario: number | null } };
    B: { nota: number | null; ranking?: number; componentes: { saude: number | null; educacao: number | null; fundeb: number | null }; descumpridos: string[] };
  };
};

export type AnoFiscal = {
  ano: number;
  completo: boolean;
  mandato: boolean;
  rreoPeriodo: number;
  rgfPeriodo: number | null;
  coletadoEm: string;
  cidades: CidadeFiscal[];
};

export type Fiscal = {
  pilares: Record<"A" | "B", { nota: number | null; anos: number[] }>;
  anos: AnoFiscal[];
  avisos: string[];
  referencias: {
    minimos: { saude: number; educacao: number; fundeb: number };
    pessoal: { otimo: number; alerta: number; prudencial: number; maximo: number };
    toleranciaPrimario: number;
  };
};

export type IndiceIegm = "iegm" | "iplanejamento" | "ifiscal" | "ieduc" | "isaude" | "iamb" | "icidade" | "igov";

export type AnoIegm = {
  anoBase: number;
  descricao: string;
  mandato: boolean;
  totalMunicipios: number;
  publicacoes: { tipo: string; url: string }[];
  cidades: { ibge: number; nome: string; foco: boolean; faixas: Record<IndiceIegm, string | null> | null; nota: number | null; ranking?: number }[];
};

export type Iegm = {
  fonte: string;
  coletadoEm: string;
  valorFaixa: Record<string, number>;
  pilar: { nota: number | null; anos: number[] };
  ultimoAnoBase: number | null;
  anos: AnoIegm[];
};

export type CidadeResultados = {
  ibge: number;
  nome: string;
  foco: boolean;
  ideb: { serie: Record<string, number | null> | null; valor: number | null; anterior: number | null; delta: number | null };
  mortalidade: { obitos?: number; nascidos?: number; taxa: number | null; anterior: number | null; delta: number | null; serie: Record<string, number | null> };
  componentes: { educacao: number | null; saude: number | null };
  nota: number | null;
  ranking?: number;
};

export type Resultados = {
  pilar: { nota: number | null; anos: number[] };
  ideb: { edicao: number; anterior: number; etapa: string; rede: string; fonte: string } | null;
  mortalidade: { ano: number; fonte: string; fonteNascidos: string; preliminar: boolean } | null;
  evolucao: { ideb: number; mortalidade: number };
  cidades: CidadeResultados[];
};

export type AvaliacaoPntp = { entidade: string; indice: number; essenciais: number; nivel: string; variacao: number; validada: boolean; site: string };

export type Obra = { situacao: string; contratante: string; contratado: string; valor: number; ano: number; objeto: string };

export type CidadeTransparencia = {
  ibge: number;
  nome: string;
  foco: boolean;
  pntp: AvaliacaoPntp | null;
  pntpCamara: AvaliacaoPntp | null;
  obras: { quantidade: number; paralisadas: number; atrasadas: number; valorTotal: number; valorProblema: number; parteProblema: number | null; lista?: Obra[] };
  componentes: { transparencia: number | null; obras: number | null };
  nota: number | null;
  ranking?: number;
};

export type Transparencia = {
  pilar: { nota: number | null; anos: number[] };
  pntp: { ciclo: number; fonte: string; arquivo: string } | null;
  obras: { fonte: string; dataBase: string } | null;
  limiteObras: number;
  cidades: CidadeTransparencia[];
};

export type PilarPrefeito = "A" | "B" | "C" | "D" | "E";

export type Dados = {
  geradoEm: string;
  periodo: { inicio: string; fim: string };
  metodologia: {
    inicioLegislatura: string;
    tiposProjeto: string[];
    vereador: { pesos: Record<PilarVereador, number>; minimoSessoes: number };
    prefeito: { pesos: Record<PilarPrefeito, number>; coberturaMinima: number };
  };
  notasVereadores: { usaRequerimentos: boolean; referencias: { legislacao: number; requerimentos: number; comissoes: number } };
  sessoes: Sessao[];
  vereadores: Vereador[];
  prefeito: {
    nome: string;
    cargo: string;
    partido: string;
    partidoLogo?: string | null;
    mandato: string;
    foto: string | null;
    creditoFoto?: string;
    creditoFotoUrl?: string;
    perfilOficial: string | null;
    nota: number | null;
    cobertura: number;
    pilares: Partial<Record<PilarPrefeito, { nota: number | null; anos: number[] }>>;
    fiscal: Fiscal | null;
    iegm: Iegm | null;
    resultados: Resultados | null;
    transparencia: Transparencia | null;
    provisoria: boolean;
    indicadores: {
      projetosEnviados: number;
      vetosTotais: number;
      vetosParciais: number;
      leisSancionadas: number;
      leisDoExecutivo: number;
      decretosLidos: number;
    };
    projetos: Proposicao[];
    vetos: Veto[];
  };
  camara: Camara;
  mapa: Mapa | null;
};

export const dados = bruto as unknown as Dados;

const sessoesPorId = new Map(dados.sessoes.map((s) => [s.id, s]));
export const sessao = (id: string) => sessoesPorId.get(id);

export const PILARES_VEREADOR: { chave: PilarVereador; nome: string; descricao: string }[] = [
  { chave: "A", nome: "Assiduidade", descricao: "Presença nas sessões (faltas justificadas não contam contra) e participação nas votações nominais. 95% ou mais vale 10; 75% ou menos vale 0." },
  { chave: "B", nome: "Legislação que importa", descricao: "Projetos de lei por sessão em exercício. Projeto de política pública vale 1, simbólico (nome de rua, data comemorativa, título) vale 0,2, e cada lei sancionada soma 1." },
  { chave: "C", nome: "Fiscalização e comissões", descricao: "Trabalho nas comissões da Câmara (presidência e relatoria valem mais) e cargos na Mesa Diretora. Requerimentos ao Executivo entram quando houver dados abertos." },
  { chave: "D", nome: "Custo do mandato", descricao: "Salário do vereador e dos assessores do gabinete. A lei dá a mesma estrutura a todos os gabinetes, então esse custo não separa um vereador do outro e fica fora da nota. Diárias e ressarcimentos por vereador não aparecem nas despesas abertas." },
  { chave: "E", nome: "Compromisso com a pauta", descricao: "Itens do próprio vereador adiados porque ele faltou. Nenhum vale 10; 3 ou mais a cada 10 sessões vale 0." },
];

export const TIPO_NOME: Record<string, string> = {
  PL: "Projeto de Lei",
  PLC: "Projeto de Lei Complementar",
  PDL: "Projeto de Decreto Legislativo",
  PR: "Projeto de Resolução",
  PELO: "Emenda à Lei Orgânica",
};

export const PILARES_PREFEITO: { chave: PilarPrefeito; nome: string; fonte: string; pronto: boolean }[] = [
  { chave: "A", nome: "Gestão fiscal", fonte: "Tesouro Nacional (SICONFI)", pronto: true },
  { chave: "B", nome: "Mínimos constitucionais", fonte: "Tesouro Nacional (SICONFI)", pronto: true },
  { chave: "C", nome: "Qualidade da gestão (IEG-M)", fonte: "TCE-SP", pronto: true },
  { chave: "D", nome: "Resultados para o cidadão", fonte: "INEP e DataSUS", pronto: true },
  { chave: "E", nome: "Transparência e entregas", fonte: "Atricon (PNTP) e TCE-SP", pronto: true },
];

export const nomeSessao = (s: Sessao) => `${s.numero}ª Sessão ${s.tipo === "ordinaria" ? "Ordinária" : "Extraordinária"}`;

