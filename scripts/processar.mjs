// Lê as planilhas de presença e votação da Câmara (data/raw) e gera src/data/dados.json,
// que é tudo o que o site usa. Rode com: npm run dados
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { readWorkbook } from "./lib/xlsx.mjs";
import { calcularFiscal } from "./lib/fiscal.mjs";
import { calcularIegm } from "./lib/iegm.mjs";
import { PESO_SIMBOLICO, calcularNotas, classificarProjeto, pontosComissoes } from "./lib/vereadores.mjs";
import { calcularResultados } from "./lib/resultados.mjs";
import { calcularTransparencia } from "./lib/transparencia.mjs";

const RAW = "data/raw";
const BASE_URL = "https://www.osasco.sp.leg.br/assets/file/";
const config = JSON.parse(readFileSync("data/politicos.json", "utf8"));
const metodologia = JSON.parse(readFileSync("data/metodologia.json", "utf8"));

const clean = (s) => String(s ?? "").replace(/[ \s]+/g, " ").trim();
const norm = (s) =>
  clean(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
// Nome como aparece na planilha → chave estável ("Carmônio Bastos - Presidente" → "carmonio-bastos").
const nameKey = (s) =>
  slug(clean(s).replace(/\s*-\s*president[ea].*$/i, "").replace(/^(pra\.|vereador[a]?)\s+/i, ""));

const aliases = new Map();
for (const v of config.vereadores) for (const a of [v.nome, ...(v.apelidos ?? [])]) aliases.set(nameKey(a), v.id);
// O nome completo do perfil oficial também vale como apelido (alguns ofícios usam o nome de registro).
if (existsSync("data/perfis.json"))
  for (const pf of Object.values(JSON.parse(readFileSync("data/perfis.json", "utf8")).perfis)) {
    const id = aliases.get(nameKey(pf.nome)) ?? pf.slug;
    for (const a of [pf.nome, pf.nomeCompleto].filter(Boolean)) if (!aliases.has(nameKey(a))) aliases.set(nameKey(a), id);
  }
const idFor = (name) => aliases.get(nameKey(name)) ?? nameKey(name);

// ---------- sessões ----------
const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function sessionInfo(file, sheets) {
  const decoded = decodeURIComponent(file);
  const head = sheets[0].rows.slice(0, 3).map((r) => clean(r.join(" "))).join(" | ");
  const m = norm(head).match(/(\d+)\s*[ªaº°]?\s*sessao\s+(ordinaria|extraordinaria)/);
  const fileDate = decoded.match(/(20\d{2})(\d{2})(\d{2})/);
  const tipo = m?.[2] ?? (/extraordin/i.test(decoded) ? "extraordinaria" : "ordinaria");
  const numero = m ? Number(m[1]) : Number(decoded.match(/^(\d+)/)?.[1] ?? 0);
  let data = fileDate ? `${fileDate[1]}-${fileDate[2]}-${fileDate[3]}` : null;
  if (!data) {
    const d = norm(head).match(/dia (\d+)\S* de (\w+) de (\d{4})/);
    if (d) data = `${d[3]}-${String(MESES.indexOf(d[2]) + 1).padStart(2, "0")}-${d[1].padStart(2, "0")}`;
  }
  return { id: `${data}-${tipo === "ordinaria" ? "o" : "e"}${numero}`, numero, tipo, data, url: BASE_URL + file };
}

// Algumas planilhas (sessões extraordinárias) têm uma coluna de numeração antes do nome.
function nomeDaLinha(row) {
  const col = /^\d+$/.test(clean(row[0])) ? 1 : 0;
  return { nome: clean(row[col]), resto: row.slice(col + 1) };
}

// ---------- presença (1ª aba) ----------
const STATUS = { presente: "P", ausente: "A", "na presidencia": "N", na_presidencia: "N" };

function parsePresenca(sheet) {
  const out = [];
  for (const row of sheet.rows.slice(4)) {
    const { nome: name, resto } = nomeDaLinha(row);
    if (!name || /^vereadores$/i.test(name)) continue;
    if (/^total/i.test(name)) break;
    const chamadas = resto
      .map((c) => STATUS[norm(c)])
      .filter(Boolean);
    out.push({ nome: name.replace(/\s*-\s*president[ea].*$/i, ""), presidente: /president/i.test(name), chamadas });
  }
  return out;
}

// ---------- proposições, moções, ofícios ----------
const DASH = "[–—-]";
const PROP_RE = new RegExp(
  `^(?:\\d+\\.\\s*)?(projeto de lei complementar|projeto de lei|projeto de decreto legislativo|projeto de resolu[cç][aã]o|proposta de emenda [aà] lei org[aâ]nica|projeto de emenda [aà] lei org[aâ]nica)\\s+n\\S*\\s*(\\d+)\\s*\\/\\s*(\\d{4})\\s*${DASH}\\s*(.+?)\\s*${DASH}\\s*(.*)$`,
  "is",
);
const MOCAO_RE = new RegExp(`^(?:\\d+\\.\\s*)?mo[cç][aã]o de ([\\p{L} ]+?)\\s+n\\S*\\s*(\\d+)\\s*\\/\\s*(\\d{4})\\s*${DASH}\\s*(?:\\d+\\/\\d{4}\\s*${DASH}\\s*)?(.+?)\\s*${DASH}\\s*(.*)$`, "isu");
const REQ_RE = new RegExp(`^(?:\\d+\\.\\s*)?requerimento\\s+n\\S*\\s*(\\d+)\\s*\\/\\s*(\\d{4})\\s*${DASH}\\s*(.+?)\\s*${DASH}\\s*(.*)$`, "is");
const JUSTIFICATIVA_RE = /justificativa de aus[eê]ncia d[oa] vereador[a]?\s+(.+?)\.?$/i;
const SANCAO_RE = /san[cç][aã]o de lei( complementar)? n\S*\s*([\d.]+),?\s*de ([^,]+?\d{4}),.*?de autoria d[oa] (?:vereador[a]?\s+|poder\s+)?([^.,;]+)/is;
const VETO_RE = /veto (total|parcial) n\S*\s*(\d+\/\d{4}) ao projeto de lei( complementar)? n\S*\s*(\d+\/\d{4}).*?de autoria d[oa] (?:vereador[a]?\s+)?([^.,;]+)/is;

const TIPOS = {
  "projeto de lei": "PL",
  "projeto de lei complementar": "PLC",
  "projeto de decreto legislativo": "PDL",
  "projeto de resolucao": "PR",
  "proposta de emenda a lei organica": "PELO",
  "projeto de emenda a lei organica": "PELO",
};

const isExecutivo = (autor) => /prefeit|executivo/i.test(autor);
const primaryAuthor = (autor) =>
  clean(
    autor
      .replace(/^(d[oa]|vereador[a]?)\s+/i, "")
      .replace(/\s+e\s+outr[oa]s.*$/i, "")
      .split(/,|\s+e\s+/i)[0],
  );

// ---------- processamento ----------
const files = readdirSync(RAW).filter((f) => f.endsWith(".xlsx"));
const sessoes = new Map();
const pessoas = new Map(); // id -> acumuladores
const proposicoes = new Map(); // "PL-12/2025" -> proposição
const mocoes = new Map();
const requerimentos = new Map();
const sancoes = new Map();
const vetos = new Map();
const decretos = new Set();
const naoAtribuidos = new Set();

const pessoa = (nome) => {
  const id = idFor(nome);
  if (!pessoas.has(id))
    pessoas.set(id, {
      id,
      nomePlanilha: clean(nome),
      sessoes: [],
      votos: { sim: 0, nao: 0, abstencao: 0, ausente: 0 },
      adiadasPorAusencia: [],
      justificativas: [],
    });
  return pessoas.get(id);
};

const VOTO = { sim: "sim", nao: "nao", abstencao: "abstencao", ausente: "ausente" };
const rosterIds = (roster) => new Set(roster.map((r) => idFor(r.nome)));

function attribute(autor) {
  if (isExecutivo(autor)) return "prefeito";
  if (/mesa (de )?diretora/i.test(autor)) return "mesa-diretora";
  if (/^comiss[aã]o /i.test(clean(autor))) return "comissao";
  const id = idFor(primaryAuthor(autor));
  if (!config.vereadores.some((v) => v.id === id) && !pessoas.has(id)) naoAtribuidos.add(clean(autor));
  return id;
}

// Em ordem cronológica, para que "primeira vez vista" e a linha do tempo de presença façam sentido.
const lidas = files
  .map((file) => {
    const sheets = readWorkbook(readFileSync(`${RAW}/${file}`));
    if (!/presen/i.test(norm(sheets[0]?.rows.slice(0, 2).flat().join(" ")))) {
      console.warn("ignorado (sem aba de presença):", file);
      return null;
    }
    return { sheets, s: sessionInfo(file, sheets) };
  })
  .filter((x) => x && x.s.data && x.s.data >= metodologia.inicioLegislatura)
  .sort((a, b) => a.s.data.localeCompare(b.s.data) || a.s.numero - b.s.numero);

for (const { sheets, s } of lidas) {
  if (sessoes.has(s.id)) continue;
  sessoes.set(s.id, s);

  const roster = parsePresenca(sheets[0]);
  const ids = rosterIds(roster);
  for (const r of roster) {
    const p = pessoa(r.nome);
    const presente = r.chamadas.some((c) => c !== "A");
    p.sessoes.push({
      sessao: s.id,
      presente: r.chamadas.length ? presente : null,
      primeiraChamada: r.chamadas.length ? r.chamadas[0] !== "A" : null,
      presidente: r.presidente,
    });
  }

  for (const sheet of sheets.slice(1)) {
    const header = sheet.rows[3] ?? [];
    const status = sheet.rows[4] ?? [];

    // Itens lidos/pautados: uma célula por item na linha 4.
    header.forEach((cell, col) => {
      const text = clean(cell);
      const pm = text.match(PROP_RE);
      const mm = !pm && text.match(MOCAO_RE);
      let autor = null;
      if (pm) {
        const tipo = TIPOS[norm(pm[1])] ?? pm[1];
        const key = `${tipo}-${pm[2]}/${pm[3]}`;
        autor = pm[4];
        // Conta na primeira vez que aparece (leitura no expediente ou pauta da Ordem do Dia), só desta legislatura.
        if (Number(pm[3]) >= Number(metodologia.inicioLegislatura.slice(0, 4)) && !proposicoes.has(key))
          proposicoes.set(key, { key, tipo, numero: Number(pm[2]), ano: Number(pm[3]), autor: attribute(autor), autorTexto: clean(autor), ementa: clean(pm[5]), sessao: s.id });
      } else if (text.match(REQ_RE)) {
        const rm = text.match(REQ_RE);
        const key = `REQ-${rm[1]}/${rm[2]}`;
        autor = rm[3];
        if (Number(rm[2]) >= Number(metodologia.inicioLegislatura.slice(0, 4)) && !requerimentos.has(key))
          requerimentos.set(key, { key, tipo: "REQ", numero: Number(rm[1]), ano: Number(rm[2]), autor: attribute(autor), ementa: clean(rm[4]), informacao: /informa[cç]/i.test(rm[4]), sessao: s.id });
      } else if (mm) {
        const key = `MOC-${mm[2]}/${mm[3]}`;
        autor = mm[4];
        if (!mocoes.has(key)) mocoes.set(key, { key, tipo: `Moção de ${clean(mm[1]).toLowerCase()}`, numero: Number(mm[2]), ano: Number(mm[3]), autor: attribute(autor), ementa: clean(mm[5]), sessao: s.id });
      }
      const st = norm(status[col]);
      if (autor && /ausencia d[oa] autor/.test(st) && !isExecutivo(autor)) {
        const p = pessoas.get(attribute(autor));
        p?.adiadasPorAusencia.push({ sessao: s.id, item: text.slice(0, 160) });
      }

      const jm = text.match(JUSTIFICATIVA_RE);
      if (jm) pessoas.get(attribute(jm[1]))?.justificativas.push(s.id);

      const sm = text.match(SANCAO_RE);
      if (sm) {
        const key = `${sm[1] ? "LC" : "L"}-${sm[2]}`;
        if (!sancoes.has(key)) sancoes.set(key, { key, lei: `Lei${sm[1] ? " Complementar" : ""} nº ${sm[2]}`, data: clean(sm[3]), autor: attribute(sm[4]), resumo: text.replace(/^.*?que\s+/i, "").slice(0, 220), sessao: s.id });
      }
      const vm = text.match(VETO_RE);
      if (vm) {
        const key = `${vm[1]}-${vm[2]}`;
        if (!vetos.has(key)) vetos.set(key, { key, tipo: vm[1].toLowerCase(), numero: vm[2], projeto: `${vm[3] ? "PLC" : "PL"} ${vm[4]}`, autor: attribute(vm[5]), resumo: text.replace(/^.*?que\s+/i, "").slice(0, 220), sessao: s.id });
      }
      if (/^decretos? n/i.test(text) && /prefeit/i.test(text)) for (const n of text.matchAll(/\b1\d\.\d{3}\b/g)) decretos.add(n[0]);
    });

    // Votos nominais: linhas com o nome de quem está no plenário.
    for (const row of sheet.rows.slice(5)) {
      const { nome: name, resto } = nomeDaLinha(row);
      if (!name || !ids.has(idFor(name))) continue;
      const p = pessoa(name);
      for (const c of resto) {
        const v = VOTO[norm(c)];
        if (v) p.votos[v]++;
      }
    }
  }
}

// ---------- indicadores e nota ----------
const sessoesOrdenadas = [...sessoes.values()].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
const pct = (a, b) => (b ? a / b : null);
const perfis = existsSync("data/perfis.json") ? JSON.parse(readFileSync("data/perfis.json", "utf8")).perfis : {};
const perfilDe = (id) => Object.values(perfis).find((x) => x.slug === id || idFor(x.nome) === id) ?? null;

const vereadores = [...pessoas.values()].map((p) => {
  const cfg = config.vereadores.find((v) => v.id === p.id) ?? {};
  const perfil = perfilDe(p.id);
  const registradas = p.sessoes.filter((x) => x.presente !== null);
  const presencas = registradas.filter((x) => x.presente).length;
  const faltas = registradas.length - presencas;
  const justificadas = Math.min(faltas, p.justificativas.length);
  const props = [...proposicoes.values()].filter((x) => x.autor === p.id);
  const projetos = props.filter((x) => metodologia.tiposProjeto.includes(x.tipo)).map((x) => ({ ...x, classe: classificarProjeto(x.ementa) }));
  const honrarias = props.filter((x) => !metodologia.tiposProjeto.includes(x.tipo));
  const reqs = [...requerimentos.values()].filter((x) => x.autor === p.id);
  const leis = [...sancoes.values()].filter((x) => x.autor === p.id);
  const substantivos = projetos.filter((x) => x.classe === "substantivo").length;
  const votosDados = p.votos.sim + p.votos.nao + p.votos.abstencao;
  const ultima = p.sessoes.at(-1)?.sessao;
  return {
    id: p.id,
    nome: cfg.nomeExibicao ?? perfil?.nome ?? cfg.nome ?? p.nomePlanilha,
    partido: cfg.partido ?? perfil?.partido ?? null,
    partidoNome: cfg.partidoNome ?? perfil?.partidoNome ?? null,
    foto: cfg.foto ?? perfil?.foto ?? null,
    perfilOficial: cfg.perfilOficial ?? perfil?.url ?? null,
    perfil: perfil && {
      nomeCompleto: perfil.nomeCompleto,
      votos: perfil.votos,
      telefone: perfil.telefone,
      email: perfil.email,
      naturalidade: perfil.naturalidade,
      ocupacao: perfil.ocupacao,
      instrucao: perfil.instrucao,
      redes: perfil.redes,
      bio: perfil.bio.slice(0, 2),
      comissoes: perfil.comissoes,
      mesa: perfil.mesa ?? null,
    },
    emExercicio: ultima === sessoesOrdenadas.at(-1)?.id,
    indicadores: {
      sessoes: registradas.length,
      presencas,
      faltas,
      faltasJustificadas: justificadas,
      presenca: pct(presencas, registradas.length),
      presencaAjustada: pct(presencas, registradas.length - justificadas),
      pontualidade: pct(registradas.filter((x) => x.primeiraChamada).length, registradas.length),
      votos: p.votos,
      participacaoVotos: pct(votosDados, votosDados + p.votos.ausente),
      projetos: projetos.length,
      projetosSubstantivos: substantivos,
      projetosSimbolicos: projetos.length - substantivos,
      pontosLegislacao: substantivos + PESO_SIMBOLICO * (projetos.length - substantivos) + leis.length,
      honrarias: honrarias.length,
      mocoes: [...mocoes.values()].filter((x) => x.autor === p.id).length,
      requerimentos: reqs.length,
      comissoes: perfil?.comissoes.filter((c) => c.tipo !== "frente").length ?? 0,
      frentes: perfil?.comissoes.filter((c) => c.tipo === "frente").length ?? 0,
      pontosComissoes: pontosComissoes(perfil?.comissoes, perfil?.mesa),
      leisSancionadas: leis.length,
      vetosRecebidos: [...vetos.values()].filter((x) => x.autor === p.id).length,
      adiadasPorAusencia: p.adiadasPorAusencia.length,
    },
    presencaPorSessao: p.sessoes,
    proposicoes: [...projetos, ...honrarias].sort((a, b) => b.ano - a.ano || b.numero - a.numero),
    requerimentos: reqs.sort((a, b) => b.ano - a.ano || b.numero - a.numero),
    leis,
    vetos: [...vetos.values()].filter((x) => x.autor === p.id),
    adiadas: p.adiadasPorAusencia,
  };
});

const notasVereadores = calcularNotas(vereadores, metodologia);
vereadores.sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || a.nome.localeCompare(b.nome));
vereadores.forEach((v, i) => (v.posicao = v.nota === null ? null : i + 1));

const pf = config.prefeito;
const projetosExecutivo = [...proposicoes.values()].filter((x) => x.autor === "prefeito");
const fiscal = calcularFiscal();
// A nota final do prefeito só sai quando os pilares com dado somarem a cobertura mínima do peso total.
const pesosPrefeito = metodologia.prefeito.pesos;
const pesoTotal = Object.values(pesosPrefeito).reduce((a, b) => a + b, 0);
const iegm = calcularIegm();
const resultados = calcularResultados();
const transparencia = calcularTransparencia();
const pilares = {
  ...(fiscal?.pilares ?? {}),
  ...(iegm && { C: iegm.pilar }),
  ...(resultados && { D: resultados.pilar }),
  ...(transparencia && { E: transparencia.pilar }),
};
const pilaresComNota = Object.entries(pilares).filter(([, v]) => v.nota != null);
const cobertura = pilaresComNota.reduce((a, [k]) => a + pesosPrefeito[k], 0) / pesoTotal;
const prefeito = {
  ...pf,
  nota:
    cobertura >= metodologia.prefeito.coberturaMinima
      ? Math.round((pilaresComNota.reduce((a, [k, v]) => a + pesosPrefeito[k] * v.nota, 0) / (cobertura * pesoTotal)) * 100) / 10
      : null,
  cobertura,
  // Enquanto faltar algum pilar, a nota é provisória.
  provisoria: cobertura < 1,
  pilares,
  fiscal,
  iegm,
  resultados,
  transparencia,
  indicadores: {
    projetosEnviados: projetosExecutivo.length,
    vetosTotais: [...vetos.values()].filter((x) => x.tipo === "total").length,
    vetosParciais: [...vetos.values()].filter((x) => x.tipo === "parcial").length,
    leisSancionadas: sancoes.size,
    leisDoExecutivo: [...sancoes.values()].filter((x) => x.autor === "prefeito").length,
    decretosLidos: decretos.size,
  },
  projetos: projetosExecutivo.sort((a, b) => b.ano - a.ano || b.numero - a.numero),
  vetos: [...vetos.values()],
};

mkdirSync("src/data", { recursive: true });
writeFileSync(
  "src/data/dados.json",
  JSON.stringify(
    {
      geradoEm: new Date().toISOString(),
      periodo: { inicio: sessoesOrdenadas[0]?.data, fim: sessoesOrdenadas.at(-1)?.data },
      metodologia,
      notasVereadores,
      sessoes: sessoesOrdenadas,
      vereadores,
      prefeito,
    },
    null,
    1,
  ),
);

if (fiscal) {
  const f = fiscal.pilares;
  console.log(`Prefeito: pilar A ${f.A.nota?.toFixed(2) ?? "—"}, pilar B ${f.B.nota?.toFixed(2) ?? "—"} (anos ${f.A.anos.join(", ") || "nenhum fechado"}), cobertura ${Math.round(cobertura * 100)}%`);
  for (const a of fiscal.avisos) console.log("  aviso:", a);
} else console.log("Sem dados fiscais: rode npm run coletar:fiscal.");
if (iegm) console.log(`Prefeito: pilar C ${iegm.pilar.nota?.toFixed(2) ?? "— (IEG-M do mandato ainda não publicado)"}; último IEG-M: ano-base ${iegm.ultimoAnoBase}`);
else console.log("Sem IEG-M: rode npm run coletar:iegm.");
console.log(`Prefeito: pilar D ${resultados?.pilar.nota?.toFixed(2) ?? "—"}, pilar E ${transparencia?.pilar.nota?.toFixed(2) ?? "—"} → nota ${prefeito.nota ?? "—"} (cobertura ${Math.round(cobertura * 100)}%)`);
console.log(`${sessoes.size} sessões, ${vereadores.length} vereadores, ${proposicoes.size} proposições, ${mocoes.size} moções, ${sancoes.size} sanções, ${vetos.size} vetos`);
if (naoAtribuidos.size) console.log("Autores não reconhecidos (adicione em data/politicos.json → apelidos):", [...naoAtribuidos]);
const semConfig = vereadores.filter((v) => !config.vereadores.some((c) => c.id === v.id)).map((v) => v.id);
if (semConfig.length) console.log("Vereadores sem cadastro em data/politicos.json:", semConfig);
