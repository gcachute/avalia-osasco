// Trajetória nas urnas: todas as candidaturas de quem já disputou eleição em Osasco, de 1996 a 2024, e as candidaturas
// dessas mesmas pessoas a deputado, senador ou governador em São Paulo (1998 a 2026). Fonte: TSE, dados abertos
// (consulta_cand e votacao_candidato_munzona). Rode com: node scripts/coletar-trajetorias.mjs   (depois: npm run dados)
//
// A mesma pessoa é reconhecida de uma eleição para outra pelo CPF que o TSE publica de 2000 a 2022 e em 2026; em 2024, que esconde
// o CPF, pelo nome completo com a data de nascimento; em 1996, que não tem nenhum dos dois, pelo nome completo dentro de
// Osasco. CPF e data de nascimento só servem para juntar as candidaturas e não são gravados.
// Grava data/tse/trajetorias.json com uma lista de pessoas (nome de urna, candidaturas) e a candidatura de 2024 de cada uma.
import { mkdirSync, writeFileSync } from "node:fs";
import { emCache } from "./lib/baixar.mjs";
import { linhasDoZip } from "./lib/zip-linhas.mjs";

const TSE = "https://cdn.tse.jus.br/estatistica/sead/odsele/";
const MUNICIPAIS = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
const GERAIS = [1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026];
const dobra = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
const limpa = (s) => (!s || /^#|^-\d$/.test(s) ? null : s);
const cpfValido = (s) => (/^\d{11}$/.test(s) && !/^0+$/.test(s) ? s : null);
const cargoBonito = (s) => {
  const c = dobra(s);
  return { VEREADOR: "Vereador", PREFEITO: "Prefeito", "VICE-PREFEITO": "Vice-prefeito", "DEPUTADO ESTADUAL": "Deputado estadual", "DEPUTADO FEDERAL": "Deputado federal", SENADOR: "Senador", GOVERNADOR: "Governador", "VICE-GOVERNADOR": "Vice-governador", "1º SUPLENTE": "1º suplente de senador", "2º SUPLENTE": "2º suplente de senador" }[c] ?? s;
};
// Resultado final do turno, em palavras comuns; "#NULO" e afins viram null.
const resultado = (s) => {
  const r = dobra(s);
  if (/^ELEITO/.test(r)) return "Eleito";
  if (/SUPLENTE/.test(r)) return "Suplente";
  if (/NAO ELEITO/.test(r)) return "Não eleito";
  if (/2º TURNO|2O TURNO/.test(r)) return "Foi ao 2º turno";
  if (/MEDIA/.test(r)) return "Eleito";
  return null;
};

async function* linhas(ano, tipo) {
  const zip = await emCache(`${TSE}${tipo}/${tipo}_${ano}.zip`, `tse/${tipo}_${ano}.zip`);
  let cab = null;
  for await (const l of linhasDoZip(zip, { arquivo: new RegExp(`_${ano}_SP\\.csv$`, "i") })) {
    const c = l.split(";").map((x) => x.replace(/^"|"$/g, ""));
    if (!cab) {
      cab = Object.fromEntries(c.map((k, i) => [k, i]));
      continue;
    }
    yield (k) => c[cab[k]];
  }
}

// 1) Todas as candidaturas em Osasco.
const candidaturas = [];
for (const ano of MUNICIPAIS) {
  const vistos = new Set();
  for await (const v of linhas(ano, "consulta_cand")) {
    if (dobra(v("NM_UE")) !== "OSASCO") continue;
    // Uma linha por turno: fica a do último turno, que traz o resultado final.
    const sq = v("SQ_CANDIDATO");
    const reg = {
      ano,
      sq,
      cpf: cpfValido(v("NR_CPF_CANDIDATO")),
      nasc: /^\d{2}\/\d{2}\/\d{4}$/.test(v("DT_NASCIMENTO") ?? "") ? v("DT_NASCIMENTO") : null,
      nome: v("NM_CANDIDATO"),
      urna: v("NM_URNA_CANDIDATO"),
      cargo: cargoBonito(v("DS_CARGO")),
      local: "Osasco",
      partido: v("SG_PARTIDO"),
      numero: v("NR_CANDIDATO"),
      situacao: limpa(v("DS_SITUACAO_CANDIDATURA")),
      resultado: resultado(v("DS_SIT_TOT_TURNO")),
      turno: Number(v("NR_TURNO")) || 1,
    };
    const ja = candidaturas.findIndex((x) => x.ano === ano && x.sq === sq);
    if (ja >= 0) {
      if (reg.turno >= candidaturas[ja].turno) candidaturas[ja] = reg;
    } else candidaturas.push(reg);
    vistos.add(sq);
  }
  console.log(`${ano}: ${vistos.size} candidaturas em Osasco`);
}

// Vice: o TSE grava o resultado só no titular da chapa; vale o do candidato a prefeito com o mesmo número, no mesmo ano.
for (const c of candidaturas.filter((x) => x.cargo === "Vice-prefeito" && !x.resultado)) {
  const titular = candidaturas.find((x) => x.ano === c.ano && x.cargo === "Prefeito" && x.numero === c.numero);
  if (titular?.resultado) c.resultado = titular.resultado;
}

// 2) Votos nominais em Osasco, somados por candidato e turno.
for (const ano of MUNICIPAIS) {
  const votos = {};
  for await (const v of linhas(ano, "votacao_candidato_munzona")) {
    if (dobra(v("NM_MUNICIPIO")) !== "OSASCO") continue;
    const k = `${v("SQ_CANDIDATO")}|${v("NR_TURNO")}`;
    // Em 2000 o TSE deixou os votos só na coluna de votos válidos.
    votos[k] = (votos[k] ?? 0) + (Number(v("QT_VOTOS_NOMINAIS")) || Number(v("QT_VOTOS_NOMINAIS_VALIDOS")) || 0);
  }
  for (const c of candidaturas.filter((x) => x.ano === ano)) {
    c.votos = votos[`${c.sq}|1`] ?? null;
    if (votos[`${c.sq}|2`] != null) c.votos2turno = votos[`${c.sq}|2`];
  }
}

// 3) Candidaturas estaduais e federais, em São Paulo, de quem tem CPF entre os candidatos de Osasco.
// Quem só disputou em Osasco em 2024 (sem CPF no arquivo) é achado pelo nome com a data de nascimento.
const cpfs = new Set(candidaturas.map((c) => c.cpf).filter(Boolean));
const nomesNasc = new Set(candidaturas.filter((c) => c.nasc).map((c) => `${dobra(c.nome)}|${c.nasc}`));
for (const ano of GERAIS) {
  let n = 0;
  for await (const v of linhas(ano, "consulta_cand")) {
    // Quem só disputou em Osasco em 2024 (sem CPF no arquivo) é achado pelo nome com a data de nascimento.
    const cpf = cpfValido(v("NR_CPF_CANDIDATO"));
    if (!(cpf && cpfs.has(cpf)) && !nomesNasc.has(`${dobra(v("NM_CANDIDATO"))}|${v("DT_NASCIMENTO")}`)) continue;
    const sq = v("SQ_CANDIDATO");
    const reg = {
      ano,
      sq,
      cpf,
      nasc: /^\d{2}\/\d{2}\/\d{4}$/.test(v("DT_NASCIMENTO") ?? "") ? v("DT_NASCIMENTO") : null,
      nome: v("NM_CANDIDATO"),
      urna: v("NM_URNA_CANDIDATO"),
      cargo: cargoBonito(v("DS_CARGO")),
      local: "São Paulo",
      partido: v("SG_PARTIDO"),
      numero: v("NR_CANDIDATO"),
      situacao: limpa(v("DS_SITUACAO_CANDIDATURA")),
      resultado: resultado(v("DS_SIT_TOT_TURNO")),
      turno: Number(v("NR_TURNO")) || 1,
    };
    const ja = candidaturas.findIndex((x) => x.ano === ano && x.sq === sq);
    if (ja >= 0) {
      if (reg.turno >= candidaturas[ja].turno) candidaturas[ja] = { ...candidaturas[ja], ...reg };
    } else {
      candidaturas.push(reg);
      n++;
    }
  }
  console.log(`${ano}: ${n} candidaturas estaduais ou federais de quem já disputou em Osasco`);
}

// 4) Junta por pessoa: CPF; sem CPF, pelo nome com a data de nascimento (2024) ou só pelo nome (1996), desde que o
// nome aponte para uma só pessoa com CPF.
const pessoas = new Map();
const porNome = new Map();
const porNomeNasc = new Map();
const unico = (mapa, k, cpf) => mapa.set(k, mapa.has(k) && mapa.get(k) !== cpf ? null : cpf);
for (const c of candidaturas.filter((x) => x.cpf)) {
  if (!pessoas.has(c.cpf)) pessoas.set(c.cpf, []);
  pessoas.get(c.cpf).push(c);
  unico(porNome, dobra(c.nome), c.cpf);
  if (c.nasc) unico(porNomeNasc, `${dobra(c.nome)}|${c.nasc}`, c.cpf);
}
let semCpf = 0;
for (const c of candidaturas.filter((x) => !x.cpf)) {
  const cpf = (c.nasc ? porNomeNasc.get(`${dobra(c.nome)}|${c.nasc}`) : porNome.get(dobra(c.nome))) ?? null;
  const chave = cpf ?? `nome:${dobra(c.nome)}|${c.nasc ?? ""}`;
  if (!cpf) semCpf++;
  if (!pessoas.has(chave)) pessoas.set(chave, []);
  pessoas.get(chave).push(c);
}

const lista = [...pessoas.values()].map((cs) => {
  cs.sort((a, b) => a.ano - b.ano || a.cargo.localeCompare(b.cargo));
  const ultima = cs.at(-1);
  const em2024 = cs.find((c) => c.ano === 2024 && c.local === "Osasco");
  // Fica só o nome de urna (público na própria urna); o nome civil completo serviu para juntar e não é gravado.
  return {
    urna: ultima.urna,
    sq2024: em2024?.sq ?? null,
    candidaturas: cs.map(({ ano, cargo, local, partido, numero, urna, situacao, resultado: r, votos, votos2turno }) => ({
      ano,
      cargo,
      local,
      partido,
      numero,
      urna,
      situacao,
      resultado: r,
      votos: votos ?? null,
      ...(votos2turno != null ? { votos2turno } : {}),
    })),
  };
});
mkdirSync("data/tse", { recursive: true });
writeFileSync(
  "data/tse/trajetorias.json",
  `${JSON.stringify({ fonte: "Tribunal Superior Eleitoral, dados abertos (candidaturas e votação por município e zona)", url: "https://dadosabertos.tse.jus.br/", coletadoEm: new Date().toISOString().slice(0, 10), pessoas: lista })}\n`,
);
console.log(`${lista.length} pessoas; ${semCpf} candidaturas sem CPF que não acharam par em outro ano`);
