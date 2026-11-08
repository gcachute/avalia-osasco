// Partidos que mudaram de nome, se fundiram com outro ou foram incorporados a outro: a sigla de hoje, para ler as siglas
// antigas que aparecem nas eleições e nas emendas. Fonte: TSE, partidos registrados e mudanças de nome, fusões e
// incorporações (por exemplo, Res.-TSE 21.350 e 21.374/2003 e a incorporação do PROS ao Solidariedade em 2023).
type Mudanca = { hoje: string; como: "nome" | "fusao" | "incorporacao" };

const MUDANCAS: Record<string, Mudanca> = {
  "PT DO B": { hoje: "AVANTE", como: "nome" },
  PTN: { hoje: "PODE", como: "nome" },
  PMDB: { hoje: "MDB", como: "nome" },
  PPS: { hoje: "CIDADANIA", como: "nome" },
  PR: { hoje: "PL", como: "nome" },
  PRB: { hoje: "REPUBLICANOS", como: "nome" },
  PSDC: { hoje: "DC", como: "nome" },
  PTC: { hoje: "AGIR", como: "nome" },
  PMN: { hoje: "MOBILIZA", como: "nome" },
  SD: { hoje: "SOLIDARIEDADE", como: "nome" },
  PPB: { hoje: "PP", como: "nome" },
  // PFL virou DEM em 2007; DEM e PSL se fundiram no União Brasil em 2022.
  PFL: { hoje: "UNIÃO", como: "fusao" },
  DEM: { hoje: "UNIÃO", como: "fusao" },
  PSL: { hoje: "UNIÃO", como: "fusao" },
  // PL e PRONA formaram o PR em 2006, que voltou a se chamar PL em 2019.
  PRONA: { hoje: "PL", como: "fusao" },
  // PTB e Patriota (antes PEN) se fundiram no PRD em 2023.
  PTB: { hoje: "PRD", como: "fusao" },
  PATRIOTA: { hoje: "PRD", como: "fusao" },
  PEN: { hoje: "PRD", como: "fusao" },
  PHS: { hoje: "PODE", como: "incorporacao" },
  PSC: { hoje: "PODE", como: "incorporacao" },
  PROS: { hoje: "SOLIDARIEDADE", como: "incorporacao" },
  PPL: { hoje: "PCdoB", como: "incorporacao" },
  // Incorporados ao Patriota (PRP, 2019) e ao PTB (PAN, 2007), que hoje estão no PRD.
  PRP: { hoje: "PRD", como: "incorporacao" },
  PAN: { hoje: "PRD", como: "incorporacao" },
  PGT: { hoje: "PL", como: "incorporacao" },
  PST: { hoje: "PL", como: "incorporacao" },
};

const normaliza = (sigla: string) => sigla.toUpperCase().replace(/\s+/g, " ").replace(/^PTDOB$/, "PT DO B").trim();

// O PSD de antes de 2003 é outro partido, incorporado ao PTB (hoje PRD); o PSD de hoje foi criado em 2011.
export function partidoHoje(sigla: string | null | undefined, ano?: number): Mudanca | null {
  if (!sigla) return null;
  const s = normaliza(sigla);
  if (s === "PSD" && ano != null && ano < 2011) return { hoje: "PRD", como: "incorporacao" };
  return MUDANCAS[s] ?? null;
}

// Como o partido aparece escrito no site, sempre do mesmo jeito: a sigla quando o partido é conhecido pela sigla (PT, PL,
// MDB, PSD) e o nome quando é conhecido pelo nome (Podemos, Republicanos, União Brasil). O TSE e a Câmara escrevem o mesmo
// partido de jeitos diferentes ("PODE", "Podemos"; "UNIÃO", "União Brasil"); aqui vira uma forma só.
const ESCRITA: Record<string, string> = {
  PODE: "Podemos",
  PODEMOS: "Podemos",
  REPUBLICANOS: "Republicanos",
  UNIÃO: "União Brasil",
  UNIAO: "União Brasil",
  "UNIÃO BRASIL": "União Brasil",
  AVANTE: "Avante",
  CIDADANIA: "Cidadania",
  SOLIDARIEDADE: "Solidariedade",
  AGIR: "Agir",
  MOBILIZA: "Mobiliza",
  NOVO: "Novo",
  REDE: "Rede",
  PATRIOTA: "Patriota",
  PCDOB: "PCdoB",
  "PC DO B": "PCdoB",
  "PT DO B": "PTdoB",
};
export function nomePartido(sigla: string | null | undefined): string {
  if (!sigla) return "";
  const s = normaliza(sigla);
  return ESCRITA[s] ?? ESCRITA[s.replace(/\s+/g, "")] ?? sigla;
}

// "PTN (atual Podemos)"; para incorporado, "PHS (hoje no Podemos)". Partido que não mudou fica como está.
export function notaPartido(sigla: string | null | undefined, ano?: number): string | null {
  const m = partidoHoje(sigla, ano);
  if (!m) return null;
  const hoje = nomePartido(m.hoje);
  return m.como === "incorporacao" ? `hoje no ${hoje}` : `atual ${hoje}`;
}

// Já dentro de parênteses no texto, a nota vem depois de vírgula: "(PTN, atual Podemos)".
export function rotuloPartido(sigla: string | null | undefined, ano?: number, { dentro = false }: { dentro?: boolean } = {}): string {
  if (!sigla) return "";
  const nome = nomePartido(sigla);
  const n = notaPartido(sigla, ano);
  return n ? (dentro ? `${nome}, ${n}` : `${nome} (${n})`) : nome;
}
