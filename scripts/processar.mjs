// Lê as planilhas de presença e votação da Câmara (data/raw) e gera src/data/dados.json,
// que é tudo o que o site usa. Rode com: npm run dados
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { readWorkbook } from "./lib/xlsx.mjs";
import { calcularFiscal } from "./lib/fiscal.mjs";
import { calcularIegm } from "./lib/iegm.mjs";
import { PESO_SIMBOLICO, calcularNotas, classificarProjeto, pontosComissoes, temasDoProjeto } from "./lib/vereadores.mjs";
import { calcularResultados } from "./lib/resultados.mjs";
import { calcularTransparencia } from "./lib/transparencia.mjs";
import { carregarBairros, reconhecedorDeBairros } from "./lib/bairros.mjs";
import { montarTerritorio } from "./lib/territorio.mjs";

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
  slug(clean(s).replace(/\s*-\s*president[ea].*$/i, "").replace(/\s*\(suplente\)\s*$/i, "").replace(/^(pra\.|vereador[a]?)\s+/i, ""));

const fotos = existsSync("data/fotos.json") ? JSON.parse(readFileSync("data/fotos.json", "utf8")) : {};
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
const REQ_RE = new RegExp(`^(?:\\d+\\s*[.–-]\\s*)?requerimento\\s+n\\S*\\s*(\\d+)\\s*\\/\\s*(\\d{4})\\s*${DASH}\\s*(.+?)\\s*${DASH}\\s*(.*)$`, "is");
const JUSTIFICATIVA_RE = /justificativa de aus[eê]ncia d[oa] vereador[a]?\s+(.+?)\.?$/i;
const SANCAO_RE = /san[cç][aã]o de lei( complementar)? n\S*\s*([\d.]+),?\s*de ([^,]+?\d{4}),.*?de autoria d[oa] (?:vereador[a]?\s+|poder\s+)?([^.,;]+)/is;
const VETO_RE = /veto (total|parcial) n\S*\s*(\d+\/\d{4}) ao projeto de lei( complementar)? n\S*\s*(\d+\/\d{4}).*?de autoria d[oa] (?:vereador[a]?\s+)?([^.,;]+)/is;

const TIPO_NOME = { PL: "Projeto de lei", PLC: "Projeto de lei complementar", PR: "Projeto de resolução", PELO: "Emenda à Lei Orgânica" };
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

// Algumas linhas da planilha não têm o travessão entre o autor e a ementa ("RALFI SILVA Institui ...").
// Se o autor não é reconhecido, procura o nome conhecido mais longo no começo e devolve o resto para a ementa.
function separaAutor(autor, ementa) {
  if (isExecutivo(autor) || aliases.has(nameKey(primaryAuthor(autor)))) return [autor, ementa];
  const palavras = clean(autor).split(" ");
  for (let n = palavras.length - 1; n >= 1; n--) {
    const nome = palavras.slice(0, n).join(" ");
    if (aliases.has(nameKey(nome))) return [nome, `${palavras.slice(n).join(" ")} – ${ementa}`];
  }
  return [autor, ementa];
}

// ---------- processamento ----------
const files = readdirSync(RAW).filter((f) => f.endsWith(".xlsx"));
const sessoes = new Map();
const pessoas = new Map(); // id -> acumuladores
const proposicoes = new Map(); // "PL-12/2025" -> proposição
const mocoes = new Map();
const requerimentos = new Map();
const pautaRequerimentos = new Map(); // requerimentos de qualquer ano pautados na Ordem do Dia
const sancoes = new Map();
const vetos = new Map();
const decretos = new Set();
const atosExecutivo = new Map(); // texto integral de decretos, ofícios e vetos do prefeito lidos no expediente
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
        let ementa;
        [autor, ementa] = separaAutor(pm[4], pm[5]);
        // Conta na primeira vez que aparece (leitura no expediente ou pauta da Ordem do Dia), só desta legislatura.
        if (Number(pm[3]) >= Number(metodologia.inicioLegislatura.slice(0, 4)) && !proposicoes.has(key))
          proposicoes.set(key, { key, tipo, numero: Number(pm[2]), ano: Number(pm[3]), autor: attribute(autor), autorTexto: clean(autor), ementa: clean(ementa), sessao: s.id });
      } else if (text.match(REQ_RE)) {
        const rm = text.match(REQ_RE);
        const key = `REQ-${rm[1]}/${rm[2]}`;
        autor = rm[3];
        // Requerimentos que voltam à pauta sessão após sessão sem deliberação (o plenário não vota).
        if (/requerimento/i.test(sheet.name)) {
          const r = pautaRequerimentos.get(key) ?? { key, numero: Number(rm[1]), ano: Number(rm[2]), autor: idFor(primaryAuthor(autor)), ementa: clean(rm[4]), sessoes: 0, primeira: s.id };
          r.sessoes++;
          r.ultima = s.id;
          r.status = clean(status[col]) || null;
          pautaRequerimentos.set(key, r);
        }
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
      if (/^(decreto|of[ií]cio|mensagem|veto)/i.test(text) && /prefeit|executivo/i.test(text.slice(0, 160)) && !atosExecutivo.has(text.slice(0, 120)))
        atosExecutivo.set(text.slice(0, 120), { texto: text, sessao: s.id });
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
  const projetos = props.filter((x) => metodologia.tiposProjeto.includes(x.tipo)).map((x) => ({ ...x, classe: classificarProjeto(x.ementa), temas: temasDoProjeto(x.ementa) }));
  const honrarias = props.filter((x) => !metodologia.tiposProjeto.includes(x.tipo));
  const reqs = [...requerimentos.values()].filter((x) => x.autor === p.id);
  const naPauta = [...pautaRequerimentos.values()].filter((x) => x.autor === p.id);
  const leis = [...sancoes.values()].filter((x) => x.autor === p.id);
  const substantivos = projetos.filter((x) => x.classe === "substantivo").length;
  const votosDados = p.votos.sim + p.votos.nao + p.votos.abstencao;
  const ultima = p.sessoes.at(-1)?.sessao;
  return {
    id: p.id,
    nome: cfg.nomeExibicao ?? perfil?.nome ?? cfg.nome ?? p.nomePlanilha,
    partido: cfg.partido ?? perfil?.partido ?? null,
    partidoNome: cfg.partidoNome ?? perfil?.partidoNome ?? null,
    // Foto salva no repositório (npm run coletar:fotos); sem ela, o endereço original.
    foto: fotos[p.id]?.arquivo ?? cfg.foto ?? perfil?.foto ?? null,
    fotoFonte: fotos[p.id]?.fonte ?? (cfg.foto || perfil?.foto ? "Câmara Municipal de Osasco" : null),
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
      requerimentosNaPauta: naPauta.length,
      comissoes: perfil?.comissoes.filter((c) => c.tipo !== "frente").length ?? 0,
      frentes: perfil?.comissoes.filter((c) => c.tipo === "frente").length ?? 0,
      pontosComissoes: pontosComissoes(perfil?.comissoes, perfil?.mesa),
      leisSancionadas: leis.length,
      vetosRecebidos: [...vetos.values()].filter((x) => x.autor === p.id).length,
      adiadasPorAusencia: p.adiadasPorAusencia.length,
    },
    temas: Object.entries(
      projetos.flatMap((x) => x.temas).reduce((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {}),
    )
      .map(([tema, n]) => ({ tema, n }))
      .sort((a, b) => b.n - a.n),
    // Proposições (projetos, honrarias, moções) e presença por mês, pela data da sessão.
    atividadePorMes: Object.values(
      [...props, ...[...mocoes.values()].filter((x) => x.autor === p.id)].reduce((acc, x) => {
        const mes = x.sessao.slice(0, 7);
        acc[mes] ??= { mes, proposicoes: 0 };
        acc[mes].proposicoes++;
        return acc;
      }, Object.fromEntries(sessoesOrdenadas.map((s) => [s.data.slice(0, 7), { mes: s.data.slice(0, 7), proposicoes: 0 }]))),
    ),
    presencaPorSessao: p.sessoes,
    proposicoes: [...projetos, ...honrarias].sort((a, b) => b.ano - a.ano || b.numero - a.numero),
    requerimentos: reqs.sort((a, b) => b.ano - a.ano || b.numero - a.numero),
    requerimentosNaPauta: naPauta
      .map((x) => ({ ...x, aindaNaPauta: x.ultima === sessoesOrdenadas.at(-1)?.id }))
      .sort((a, b) => a.ano - b.ano || a.numero - b.numero),
    leis,
    vetos: [...vetos.values()].filter((x) => x.autor === p.id),
    adiadas: p.adiadasPorAusencia,
  };
});

const notasVereadores = calcularNotas(vereadores, metodologia);
vereadores.sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || a.nome.localeCompare(b.nome));
vereadores.forEach((v, i) => (v.posicao = v.nota === null ? null : i + 1));

const pf = { ...config.prefeito, ...(fotos.prefeito && { foto: fotos.prefeito.arquivo, creditoFoto: fotos.prefeito.fonte, creditoFotoUrl: "https://divulgacandcontas.tse.jus.br/" }) };
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

// ---------- custo da Câmara ----------
// Estrutura de cada gabinete e despesas da Câmara. Como a lei dá o mesmo gabinete a todos, o custo
// não diferencia vereadores: é mostrado, mas não entra na nota (pilar D).
const lerJson = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
const custo = lerJson("data/custo-mandato.json");
const despesas = lerJson("data/camara-despesas.json");
const gabineteMensal = custo && Math.round(custo.gabinete.reduce((a, c) => a + c.quantidade * c.vencimento, 0) * 100) / 100;
const camara = {
  custoMandato: custo && {
    fonte: custo.fonte,
    url: custo.url,
    ano: custo.ano,
    subsidio: custo.subsidio,
    gabinete: custo.gabinete.map(({ cargo, quantidade, vencimento }) => ({ cargo, quantidade, vencimento })),
    assessores: custo.gabinete.reduce((a, c) => a + c.quantidade, 0),
    gabineteMensal,
    totalMensal: Math.round((gabineteMensal + custo.subsidio) * 100) / 100,
  },
  despesas: despesas && {
    fonte: despesas.fonte,
    url: despesas.url,
    coletadoEm: despesas.coletadoEm,
    anos: Object.fromEntries(
      Object.entries(despesas.anos).map(([ano, a]) => [ano, { pago: a.pago, meses: a.meses.length, maioresFornecedores: a.maioresFornecedores.slice(0, 8) }]),
    ),
  },
  requerimentosParados: [...pautaRequerimentos.values()].filter((x) => x.ultima === sessoesOrdenadas.at(-1)?.id).length,
};

// ---------- mapa por bairro ----------
// Itens oficiais (projetos, moções, pedidos de informação, leis e vetos) que citam um bairro pelo nome.
const malha = carregarBairros();
let mapa = null;
if (malha) {
  const acha = reconhecedorDeBairros(malha.bairros);
  const nomes = new Map(vereadores.map((v) => [v.id, v.nome]));
  nomes.set("prefeito", `${pf.nome} (prefeito)`).set("mesa-diretora", "Mesa Diretora").set("comissao", "Comissão da Câmara");
  const itens = [];
  const adiciona = (chave, tipo, autor, texto, sessaoId, prefeitura = autor === "prefeito") => {
    const bairros = acha(texto);
    if (!bairros.length) return;
    itens.push({ id: chave, tipo, origem: prefeitura ? "prefeitura" : "camara", autor, autorNome: nomes.get(autor) ?? null, data: sessaoId.slice(0, 10), sessao: sessaoId, texto: clean(texto).slice(0, 260), bairros });
  };
  for (const x of proposicoes.values()) adiciona(x.key, x.tipo === "PDL" ? "Honraria" : (TIPO_NOME[x.tipo] ?? x.tipo), x.autor, x.ementa, x.sessao);
  for (const x of mocoes.values()) adiciona(x.key, x.tipo, x.autor, x.ementa, x.sessao);
  for (const x of [...requerimentos.values(), ...pautaRequerimentos.values()])
    if (!itens.some((i) => i.id === x.key)) adiciona(x.key, "Pedido de informação", x.autor, x.ementa, x.sessao ?? x.primeira);
  [...atosExecutivo.values()].forEach((x, i) => {
    const t = x.texto;
    const tipo = /veto/i.test(t.slice(0, 80))
      ? "Veto do prefeito"
      : /^decreto/i.test(t)
        ? "Decreto"
        : /san[cç][aã]o/i.test(t)
          ? "Lei sancionada"
          : /resposta ao requerimento/i.test(t)
            ? "Resposta a pedido de informação"
            : "Ofício do prefeito";
    // O texto do ofício traz cabeçalho e número de protocolo: mostramos a partir do assunto.
    adiciona(`EXE-${i}`, tipo, "prefeito", t.replace(/^.*?prefeit[oa][^–—-]*[–—-]\s*/i, ""), x.sessao, true);
  });
  itens.sort((a, b) => a.data.localeCompare(b.data));
  const territorio = montarTerritorio(malha, idFor);
  mapa = {
    fonte: malha.fonte,
    bairros: malha.bairros.map((b) => ({ ...b, citacoes: itens.filter((i) => i.bairros.includes(b.id)).length, ...(territorio?.bairros[b.id] ?? {}) })),
    itens,
    cidade: territorio?.cidade ?? null,
    prefeitoEleicao: territorio?.prefeito ?? [],
    votosVereador: Object.fromEntries(Object.entries(territorio?.votosVereador ?? {}).filter(([id]) => vereadores.some((v) => v.id === id))),
    pontos: territorio?.pontos ?? [],
    minimoMoradores: territorio?.minimoMoradores ?? 0,
    anoSeguranca: territorio?.anoSeguranca ?? null,
    partidoDoPrefeito: territorio?.partidoDoPrefeito ?? null,
    partidosCidade: territorio?.partidosCidade ?? [],
    fontes: territorio?.fontes ?? [],
  };
}

mkdirSync("src/data", { recursive: true });
// Contornos das favelas e comunidades urbanas, com nome e moradores, para a camada do mapa.
if (existsSync("data/territorio/favelas-contornos.json") && existsSync("data/territorio/favelas.json")) {
  const info = new Map(JSON.parse(readFileSync("data/territorio/favelas.json", "utf8")).comunidades.map((c) => [c.codigo, c]));
  const geo = JSON.parse(readFileSync("data/territorio/favelas-contornos.json", "utf8"));
  const arred = (anel) => anel.filter((_, i) => i % 2 === 0 || i === anel.length - 1).map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);
  for (const f of geo.features) {
    const c = info.get(f.properties.codigo);
    f.properties = { codigo: f.properties.codigo, nome: c?.nome ?? "", moradores: c?.moradores ?? 0 };
    f.geometry.coordinates = f.geometry.type === "Polygon" ? f.geometry.coordinates.map(arred) : f.geometry.coordinates.map((p) => p.map(arred));
  }
  writeFileSync("src/data/favelas-geo.json", JSON.stringify(geo));
}
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
      camara,
      mapa,
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
