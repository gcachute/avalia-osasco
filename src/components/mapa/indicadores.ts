// Indicadores que podem colorir o mapa. Cada um sabe ler o próprio valor de um bairro.
import type { BairroMapa, CampoCenso, GrupoCrime, Historico, Mapa } from "@/lib/dados";
import { dinheiroCurto, num } from "@/lib/formato";

export type Tema = "politica" | "dinheiro" | "eleicao" | "pessoas" | "infra" | "servicos" | "seguranca";

export type Contexto = {
  contagem: Record<string, { total: number; camara: number; prefeitura: number }>;
  votos: { nomeUrna: string; total: number; porBairro: Record<string, number> } | null;
};

export type Formato = "inteiro" | "pct" | "reais" | "dinheiro" | "decimal" | "densidade" | "porMil" | "pp" | "varPct";

// Indicadores com série histórica: o mapa deixa escolher o ano (ou a mudança entre os Censos).
export type Historia = { tipo: "censo"; campo: CampoCenso } | { tipo: "eleicao"; campo: "comparecimento" | "brancosNulos" | "eleito" };

export type Indicador = {
  chave: string;
  tema: Tema;
  nome: string;
  dica: string;
  formato: Formato;
  // "zero": a escala começa em zero (contagens). "faixa": do menor ao maior valor entre os bairros (porcentagens altas).
  escala: "zero" | "faixa";
  valor: (b: BairroMapa, ctx: Contexto) => number | null;
  cidade?: (c: NonNullable<Mapa["cidade"]>) => number | null | undefined;
  historia?: Historia;
};

export const TEMAS: { chave: Tema; nome: string }[] = [
  { chave: "politica", nome: "Política" },
  { chave: "dinheiro", nome: "Verbas de fora" },
  { chave: "eleicao", nome: "Eleições" },
  { chave: "pessoas", nome: "Renda e moradores" },
  { chave: "infra", nome: "Rua e saneamento" },
  { chave: "servicos", nome: "Saúde e escolas" },
  { chave: "seguranca", nome: "Segurança" },
];

const pessoas = (b: BairroMapa) => b.censo?.pessoas ?? b.populacao ?? 0;
// Porcentagens do Censo em bairros quase sem moradores (áreas industriais) viram ruído: ficam sem valor.
const censo = (k: keyof NonNullable<BairroMapa["censo"]>) => (b: BairroMapa) =>
  b.censo && !b.censo.poucosMoradores ? ((b.censo[k] as number | null) ?? null) : null;

export const INDICADORES: Indicador[] = [
  {
    chave: "dinheiroCitado",
    tema: "dinheiro",
    nome: "Valor que cita o bairro",
    dica: "Emendas, convênios e pagamentos com dinheiro da União, do Estado ou de emendas que citam o bairro, uma escola, unidade de saúde, rua ou córrego dele. Quando cita vários bairros, o valor é dividido igualmente entre eles; emendas sem lugar no texto valem para a cidade toda",
    formato: "dinheiro",
    escala: "zero",
    valor: (b) => b.dinheiro?.valor ?? 0,
  },
  {
    chave: "dinheiroEmendas",
    tema: "dinheiro",
    nome: "Só emendas",
    dica: "Emendas recebidas (Pix e convênios) e compras pagas com dinheiro de emenda. Quando o texto cita uma rua ou córrego, entram todos os bairros por onde ela passa; quando não cita lugar, a emenda vale para a cidade toda. O valor é dividido igualmente entre os bairros",
    formato: "dinheiro",
    escala: "zero",
    valor: (b) => (b.dinheiro?.porGrupo?.emendas ?? 0) + (b.dinheiro?.porGrupo?.vereadores ?? 0),
  },
  {
    chave: "dinheiroItens",
    tema: "dinheiro",
    nome: "Quantos itens citam",
    dica: "Quantas emendas, convênios e pagamentos com verbas de fora citam o bairro",
    formato: "inteiro",
    escala: "zero",
    valor: (b) => b.dinheiro?.quantidade ?? 0,
  },
  { chave: "citacoes", tema: "politica", nome: "Documentos", dica: "Documentos oficiais que citam o bairro", formato: "inteiro", escala: "zero", valor: (b, c) => c.contagem[b.id]?.total ?? 0 },
  {
    chave: "porHab",
    tema: "politica",
    nome: "Documentos por 10 mil moradores",
    dica: "Documentos divididos pela população do bairro",
    formato: "decimal",
    escala: "zero",
    valor: (b, c) => (b.censo?.poucosMoradores || !pessoas(b) ? null : ((c.contagem[b.id]?.total ?? 0) / pessoas(b)) * 1e4),
  },
  {
    chave: "prefeito",
    tema: "eleicao",
    nome: "Votos no prefeito eleito",
    dica: "Porcentagem dos votos válidos no 1º turno para o prefeito que acabou eleito",
    formato: "pct",
    escala: "faixa",
    valor: (b) => b.eleicao?.prefeito?.[0]?.pct ?? null,
    historia: { tipo: "eleicao", campo: "eleito" },
  },
  {
    chave: "votosVereador",
    tema: "eleicao",
    nome: "Votos do vereador",
    dica: "Votos do vereador escolhido em cada bairro (locais de votação do bairro)",
    formato: "inteiro",
    escala: "zero",
    valor: (b, c) => (c.votos ? (c.votos.porBairro[b.id] ?? 0) : null),
  },
  {
    chave: "comparecimento",
    tema: "eleicao",
    nome: "Comparecimento",
    dica: "Eleitores aptos que foram votar no 1º turno",
    formato: "pct",
    escala: "faixa",
    valor: (b) => b.eleicao?.comparecimento ?? null,
    cidade: (c) => c.comparecimento,
    historia: { tipo: "eleicao", campo: "comparecimento" },
  },
  {
    chave: "brancosNulos",
    tema: "eleicao",
    nome: "Brancos e nulos",
    dica: "Votos brancos e nulos para prefeito entre quem compareceu",
    formato: "pct",
    escala: "faixa",
    valor: (b) => b.eleicao?.brancosNulos ?? null,
    cidade: (c) => c.brancosNulos,
    historia: { tipo: "eleicao", campo: "brancosNulos" },
  },
  {
    chave: "partidoPrefeito",
    tema: "eleicao",
    nome: "Partido do prefeito (vereador)",
    dica: "Votos para vereador no partido do prefeito eleito, entre os votos válidos para vereador",
    formato: "pct",
    escala: "faixa",
    valor: (b) => b.partidoPrefeito ?? null,
  },
  { chave: "eleitores", tema: "eleicao", nome: "Eleitores", dica: "Eleitores com seção em locais de votação do bairro", formato: "inteiro", escala: "zero", valor: (b) => b.eleicao?.eleitores ?? null },
  {
    chave: "renda",
    tema: "pessoas",
    nome: "Renda média",
    dica: "Rendimento médio mensal da pessoa responsável pelo domicílio (2000 e 2010 corrigidos pela inflação, em reais de 2022)",
    formato: "reais",
    escala: "faixa",
    valor: censo("rendaMedia"),
    cidade: (c) => c.rendaMedia,
    historia: { tipo: "censo", campo: "rendaMedia" },
  },
  { chave: "populacao", tema: "pessoas", nome: "Moradores", dica: "Moradores no Censo", formato: "inteiro", escala: "zero", valor: (b) => pessoas(b) || null, historia: { tipo: "censo", campo: "pessoas" } },
  { chave: "densidade", tema: "pessoas", nome: "Densidade", dica: "Moradores por km²", formato: "densidade", escala: "zero", valor: censo("densidade"), cidade: (c) => c.densidade },
  { chave: "negros", tema: "pessoas", nome: "Pretos e pardos", dica: "Moradores que se declararam pretos ou pardos", formato: "pct", escala: "faixa", valor: censo("negros"), cidade: (c) => c.negros, historia: { tipo: "censo", campo: "negros" } },
  { chave: "criancas", tema: "pessoas", nome: "Crianças até 14 anos", dica: "Moradores de 0 a 14 anos", formato: "pct", escala: "faixa", valor: censo("criancas"), cidade: (c) => c.criancas, historia: { tipo: "censo", campo: "criancas" } },
  { chave: "idosos", tema: "pessoas", nome: "Idosos 60+", dica: "Moradores com 60 anos ou mais", formato: "pct", escala: "faixa", valor: censo("idosos"), cidade: (c) => c.idosos, historia: { tipo: "censo", campo: "idosos" } },
  {
    chave: "favelas",
    tema: "pessoas",
    nome: "Em favelas e comunidades",
    dica: "Moradores em favelas e comunidades urbanas delimitadas pelo IBGE no Censo 2022",
    formato: "pct",
    escala: "zero",
    valor: (b) => (b.censo?.poucosMoradores ? null : (b.favelas?.pct ?? null)),
    cidade: (c) => c.favelas,
  },
  { chave: "alfabetizados", tema: "pessoas", nome: "Alfabetização", dica: "Moradores de 15 anos ou mais que sabem ler e escrever", formato: "pct", escala: "faixa", valor: censo("alfabetizados"), cidade: (c) => c.alfabetizados, historia: { tipo: "censo", campo: "alfabetizados" } },
  { chave: "esgoto", tema: "infra", nome: "Esgoto na rede", dica: "Domicílios ligados à rede geral de esgoto ou pluvial (ou fossa ligada à rede)", formato: "pct", escala: "faixa", valor: censo("esgoto"), cidade: (c) => c.esgoto, historia: { tipo: "censo", campo: "esgoto" } },
  { chave: "pavimentacao", tema: "infra", nome: "Rua asfaltada", dica: "Domicílios em quadra com via pavimentada", formato: "pct", escala: "faixa", valor: censo("pavimentacao"), cidade: (c) => c.pavimentacao, historia: { tipo: "censo", campo: "pavimentacao" } },
  { chave: "bueiro", tema: "infra", nome: "Bueiro", dica: "Domicílios em quadra com bueiro ou boca de lobo", formato: "pct", escala: "faixa", valor: censo("bueiro"), cidade: (c) => c.bueiro, historia: { tipo: "censo", campo: "bueiro" } },
  { chave: "iluminacao", tema: "infra", nome: "Iluminação pública", dica: "Domicílios em quadra com iluminação pública", formato: "pct", escala: "faixa", valor: censo("iluminacao"), cidade: (c) => c.iluminacao, historia: { tipo: "censo", campo: "iluminacao" } },
  { chave: "calcada", tema: "infra", nome: "Calçada", dica: "Domicílios em quadra com calçada", formato: "pct", escala: "faixa", valor: censo("calcada"), cidade: (c) => c.calcada, historia: { tipo: "censo", campo: "calcada" } },
  { chave: "rampa", tema: "infra", nome: "Rampa para cadeirante", dica: "Domicílios em quadra com rampa de acessibilidade", formato: "pct", escala: "faixa", valor: censo("rampa"), cidade: (c) => c.rampa, historia: { tipo: "censo", campo: "rampa" } },
  { chave: "arvores", tema: "infra", nome: "Árvores na rua", dica: "Domicílios em quadra com pelo menos uma árvore", formato: "pct", escala: "faixa", valor: censo("arvores"), cidade: (c) => c.arvores, historia: { tipo: "censo", campo: "arvores" } },
  { chave: "onibus", tema: "infra", nome: "Ponto de ônibus na quadra", dica: "Domicílios com ponto de ônibus na própria quadra", formato: "pct", escala: "faixa", valor: censo("onibus"), cidade: (c) => c.onibus },
  {
    chave: "saude",
    tema: "servicos",
    nome: "Unidades de saúde SUS",
    dica: "Unidades que atendem pelo SUS no bairro, por 10 mil moradores",
    formato: "decimal",
    escala: "zero",
    valor: (b) => (b.censo?.poucosMoradores || !pessoas(b) ? null : ((b.saude?.length ?? 0) / pessoas(b)) * 1e4),
  },
  {
    chave: "escolas",
    tema: "servicos",
    nome: "Escolas públicas",
    dica: "Escolas municipais, estaduais e federais em funcionamento no bairro",
    formato: "inteiro",
    escala: "zero",
    valor: (b) => b.escolas?.filter((e) => e.rede !== "Privada").length ?? 0,
  },
  {
    chave: "ideb",
    tema: "servicos",
    nome: "IDEB dos anos iniciais",
    dica: "Média do IDEB (1º ao 5º ano) das escolas públicas do bairro",
    formato: "decimal",
    escala: "faixa",
    valor: (b) => {
      const v = (b.escolas ?? []).map((e) => e.idebIniciais).filter((x): x is number => x != null);
      return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
    },
  },
];

// Segurança: ocorrências registradas pela polícia com local do fato no bairro. Por morador, áreas de
// comércio com poucos moradores (como o Centro) ficam com taxas altas: as pessoas circulam, mas não moram lá.
const crime = (g: GrupoCrime, nome: string, dica: string): Indicador => ({
  chave: `crime_${g}`,
  tema: "seguranca",
  nome,
  dica: `${dica}, por 10 mil moradores`,
  formato: "decimal",
  escala: "faixa",
  valor: (b) => b.seguranca?.[g]?.por10mil ?? null,
  cidade: (c) => c[`crime_${g}`],
});
INDICADORES.push(
  crime("roubos", "Roubos", "Roubos (com violência ou ameaça), inclusive de veículos e cargas"),
  crime("furtos", "Furtos", "Furtos, inclusive de veículos e cargas"),
  crime("violencia", "Agressões", "Lesão corporal dolosa e tentativas de homicídio"),
  crime("sexual", "Estupros", "Estupros e estupros de vulnerável"),
  crime("transito", "Acidentes de trânsito", "Feridos e mortos em acidentes de trânsito"),
  crime("drogas", "Drogas", "Ocorrências de tráfico, porte e apreensão de entorpecentes"),
  {
    chave: "crime_mortes",
    tema: "seguranca",
    nome: "Mortes violentas",
    dica: "Homicídios dolosos, latrocínios e lesões corporais seguidas de morte, em números absolutos",
    formato: "inteiro",
    escala: "zero",
    valor: (b) => b.seguranca?.mortes?.n ?? null,
  },
);

// ---- Séries históricas ----
export const rotuloPeriodo = (p: string) => (p === "mudanca" ? "Mudança" : p);
// Anos do Censo que têm o campo (o Censo 2000 não tem cor ou raça nem o entorno das casas).
const anosCenso = (h: Historico, campo: CampoCenso) => (h.censo?.anos ?? []).filter((a) => h.censo!.cidade[String(a)]?.[campo] != null);
export function periodosDe(ind: Indicador, h: Historico | null | undefined): string[] | null {
  if (!ind.historia || !h) return null;
  if (ind.historia.tipo === "censo") {
    const anos = anosCenso(h, ind.historia.campo);
    return anos.length > 1 ? [...anos.map(String), "mudanca"] : null;
  }
  return h.eleicoes ? h.eleicoes.anos.map(String) : null;
}
export const formatoNoPeriodo = (ind: Indicador, periodo: string): Formato =>
  periodo === "mudanca" ? (ind.formato === "pct" ? "pp" : "varPct") : ind.formato;
// Mudança entre os Censos: pontos percentuais para porcentagens; variação percentual para contagens e renda.
const mudanca = (ind: Indicador, antes: number | null | undefined, depois: number | null | undefined) =>
  antes == null || depois == null ? null : ind.formato === "pct" ? depois - antes : antes ? (depois / antes - 1) * 100 : null;

export function valorNoPeriodo(ind: Indicador, b: BairroMapa, periodo: string, h: Historico | null | undefined): number | null {
  const hist = ind.historia;
  if (!hist || !h) return null;
  if (hist.tipo === "censo") {
    if (ind.formato === "pct" && b.censo?.poucosMoradores) return null;
    const serie = h.censo?.bairros[b.id];
    // Mesma regra do mapa para o ano mais antigo: porcentagens de bairros com menos de 500 moradores viram ruído.
    const em = (ano: number | string) => {
      const x = serie?.[String(ano)];
      return !x || (ind.formato === "pct" && (x.pessoas ?? 0) < 500) ? null : (x[hist.campo] ?? null);
    };
    const anos = anosCenso(h, hist.campo);
    if (periodo === "mudanca") return anos.length > 1 ? mudanca(ind, em(anos[0]), em(anos.at(-1)!)) : null;
    return em(periodo);
  }
  return h.eleicoes?.bairros[b.id]?.[periodo]?.[hist.campo] ?? null;
}
export function cidadeNoPeriodo(ind: Indicador, periodo: string, h: Historico | null | undefined): number | null {
  const hist = ind.historia;
  if (!hist || !h) return null;
  if (hist.tipo === "censo") {
    const em = (ano: number | string) => h.censo?.cidade[String(ano)]?.[hist.campo] ?? null;
    const anos = anosCenso(h, hist.campo);
    if (periodo === "mudanca") return anos.length > 1 ? mudanca(ind, em(anos[0]), em(anos.at(-1)!)) : null;
    return em(periodo);
  }
  const c = h.eleicoes?.cidade[periodo];
  if (!c) return null;
  if (hist.campo === "eleito") return c.turnos[0]?.candidatos.find((x) => x.nome === c.eleito.nome)?.pct ?? null;
  return c[hist.campo];
}

const sinal = (v: number) => (v > 0.05 ? "+" : v < -0.05 ? "−" : "");
export function formatar(v: number | null | undefined, f: Formato) {
  if (v == null || !Number.isFinite(v)) return "—";
  switch (f) {
    case "pp":
      return `${sinal(v)}${num(Math.abs(v), 1)} p.p.`;
    case "varPct":
      return `${sinal(v)}${num(Math.abs(v), 1)}%`;
    case "pct":
      return `${num(v, v >= 99.5 || v < 10 ? 1 : 0)}%`;
    case "reais":
      return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
    case "dinheiro":
      return dinheiroCurto(v);
    case "decimal":
      return num(v, 1);
    case "densidade":
      return `${Math.round(v).toLocaleString("pt-BR")}/km²`;
    case "porMil":
      return num(v, 1);
    default:
      return Math.round(v).toLocaleString("pt-BR");
  }
}
