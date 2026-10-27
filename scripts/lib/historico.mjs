// Séries históricas por bairro e da cidade: Censo 2010 × 2022 e eleições municipais de 2016, 2020 e 2024.
// Lê data/historico (npm run coletar:historico) e data/territorio/censo.json (Censo 2022).
import { existsSync, readFileSync } from "node:fs";
import { BASE, MINIMO_MORADORES, SIGLAS } from "./territorio.mjs";

const ler = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
const dobra = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
const um = (x) => Math.round(x * 10) / 10;

// Medidas que existem nos dois Censos com a mesma definição.
export const CAMPOS_CENSO = ["pessoas", "domicilios", "rendaMedia", "agua", "esgoto", "lixo", "alfabetizados", "negros", "criancas", "idosos", "pavimentacao", "bueiro", "iluminacao", "calcada", "rampa", "arvores"];

// Média da cidade ponderada como no mapa (pessoas ou domicílios), sem os bairros quase sem moradores.
function mediaCidade(bairros) {
  const validos = bairros.filter((b) => (b.pessoas ?? 0) >= MINIMO_MORADORES);
  const out = { pessoas: bairros.reduce((a, b) => a + (b.pessoas ?? 0), 0), domicilios: bairros.reduce((a, b) => a + (b.domicilios ?? 0), 0) };
  for (const k of CAMPOS_CENSO) {
    if (!BASE[k]) continue;
    const comDado = validos.filter((b) => b[k] != null);
    const peso = comDado.reduce((a, b) => a + b[BASE[k]], 0);
    out[k] = peso ? um(comDado.reduce((a, b) => a + b[k] * b[BASE[k]], 0) / peso) : null;
  }
  return out;
}

// Os nomes dos partidos mudam de um ano para outro (e às vezes o número também): a sigla vem do nome do ano.
const SIGLA_POR_NOME = {
  "partido dos trabalhadores": "PT", "partido da social democracia brasileira": "PSDB", "movimento democratico brasileiro": "MDB",
  "partido do movimento democratico brasileiro": "PMDB", "partido democratico trabalhista": "PDT", "partido socialista brasileiro": "PSB",
  "partido social democratico": "PSD", "partido trabalhista nacional": "PTN", "podemos": "Podemos", "partido liberal": "PL",
  "partido da republica": "PR", "partido republicano brasileiro": "PRB", "republicanos": "Republicanos", "democratas": "DEM",
  "progressistas": "PP", "partido progressista": "PP", "partido verde": "PV", "partido popular socialista": "PPS", "cidadania": "Cidadania",
  "solidariedade": "Solidariedade", "partido social cristao": "PSC", "partido trabalhista brasileiro": "PTB",
  "partido socialismo e liberdade": "PSOL", "partido comunista do brasil": "PCdoB", "rede sustentabilidade": "Rede",
  "partido social liberal": "PSL", "partido republicano da ordem social": "PROS", "partido trabalhista cristao": "PTC", "avante": "Avante",
  "partido trabalhista do brasil": "PTdoB", "partido humanista da solidariedade": "PHS", "partido da mulher brasileira": "PMB",
  "partido ecologico nacional": "PEN", "patriota": "Patriota", "democracia crista": "DC", "partido social democrata cristao": "PSDC",
  "partido renovador trabalhista brasileiro": "PRTB", "partido da mobilizacao nacional": "PMN", "partido republicano progressista": "PRP",
  "partido novo": "Novo", "novo": "Novo", "uniao brasil": "União", "partido da causa operaria": "PCO", "partido comunista brasileiro": "PCB",
  "partido socialista dos trabalhadores unificado": "PSTU", "unidade popular": "UP", "agir": "Agir", "mobiliza": "Mobiliza",
  "partido renovacao democratica": "PRD", "partido renovacao democratica prd": "PRD",
};
const sigla = (ano, nomes, nr) => {
  const nome = nomes[nr];
  if (nome && SIGLA_POR_NOME[dobra(nome)]) return SIGLA_POR_NOME[dobra(nome)];
  if (nome && nome.length <= 14) return nome.replace(/^PARTIDO /, "");
  if (Number(ano) === 2024 && SIGLAS[nr]) return SIGLAS[nr];
  return nome ?? nr;
};

function resumoEleicao(ano, e) {
  const turnos = Object.keys(e.turnos).sort();
  const ultimo = e.turnos[turnos.at(-1)];
  const eleito = ultimo.candidatos[0];
  const validos = (t) => t.candidatos.reduce((a, c) => a + c.votos, 0);
  const cand = (t) => t.candidatos.map((c) => ({ nome: c.nome, partido: sigla(ano, e.partidos.nomes, c.numero.slice(0, 2)), votos: c.votos, pct: um((c.votos / validos(t)) * 100) }));
  const comp = Object.values(e.comparecimento).reduce((x, q) => ({ aptos: x.aptos + q.aptos, foram: x.foram + q.compareceram, bn: x.bn + q.brancos + q.nulos }), { aptos: 0, foram: 0, bn: 0 });
  const totalPartidos = Object.values(e.partidos.total).reduce((a, q) => a + q, 0);
  const cidade = {
    aptos: comp.aptos,
    comparecimento: um((comp.foram / comp.aptos) * 100),
    brancosNulos: um((comp.bn / comp.foram) * 100),
    turnos: turnos.map((t) => ({ turno: Number(t), candidatos: cand(e.turnos[t]).slice(0, 6) })),
    eleito: { nome: eleito.nome, partido: sigla(ano, e.partidos.nomes, eleito.numero.slice(0, 2)) },
    partidos: Object.entries(e.partidos.total)
      .sort((a, z) => z[1] - a[1])
      .slice(0, 10)
      .map(([nr, q]) => ({ sigla: sigla(ano, e.partidos.nomes, nr), pct: um((q / totalPartidos) * 100) })),
  };
  const bairros = {};
  const ids = new Set([...Object.keys(e.comparecimento), ...Object.keys(e.turnos[turnos[0]].porBairro)]);
  ids.delete("sem-bairro");
  for (const id of ids) {
    const c = e.comparecimento[id];
    const t1 = e.turnos[turnos[0]].porBairro[id] ?? {};
    const v1 = Object.values(t1).reduce((a, q) => a + q, 0);
    const pt = e.partidos.porBairro[id] ?? {};
    const vpt = Object.values(pt).reduce((a, q) => a + q, 0);
    bairros[id] = {
      aptos: c?.aptos ?? null,
      comparecimento: c?.aptos ? um((c.compareceram / c.aptos) * 100) : null,
      brancosNulos: c?.compareceram ? um(((c.brancos + c.nulos) / c.compareceram) * 100) : null,
      // Voto no prefeito que acabou eleito, no 1º turno: mede a mesma coisa nos três anos.
      eleito: v1 ? um(((t1[eleito.nome] ?? 0) / v1) * 100) : null,
      prefeito: Object.entries(t1)
        .sort((a, z) => z[1] - a[1])
        .slice(0, 3)
        .map(([nome, q]) => ({ nome, pct: um((q / v1) * 100) })),
      partidos: Object.entries(pt)
        .sort((a, z) => z[1] - a[1])
        .slice(0, 3)
        .map(([nr, q]) => ({ sigla: sigla(ano, e.partidos.nomes, nr), pct: um((q / vpt) * 100) })),
    };
  }
  return { cidade, bairros };
}

export function montarHistorico() {
  const c2010 = ler("data/historico/censo-2010.json");
  const c2022 = ler("data/territorio/censo.json");
  const ele = ler("data/historico/eleicoes.json");
  const pop = ler("data/historico/populacao.json");
  const ipca = ler("data/historico/ipca.json");
  if (!c2010 && !ele && !pop) return null;

  const censo =
    c2010 && c2022
      ? {
          anos: [2010, 2022],
          fontes: [
            { nome: c2010.fonte, url: c2010.url },
            { nome: c2022.fonte, url: c2022.url },
          ],
          notaRenda: c2010.notaRenda,
          fatorIpca: ipca?.fator ?? null,
          cidade: { 2010: mediaCidade(c2010.bairros), 2022: mediaCidade(c2022.bairros) },
          bairros: Object.fromEntries(
            c2022.bairros.map((b) => {
              const antes = c2010.bairros.find((x) => x.id === b.id);
              const pegar = (x) => (x?.pessoas ? Object.fromEntries(CAMPOS_CENSO.map((k) => [k, x[k] ?? null])) : null);
              return [b.id, { 2010: pegar(antes), 2022: pegar(b) }];
            }),
          ),
        }
      : null;

  const eleicoes = ele
    ? (() => {
        const anos = Object.keys(ele.anos).map(Number).sort();
        const resumos = Object.fromEntries(anos.map((a) => [a, resumoEleicao(a, ele.anos[a])]));
        const ids = new Set(anos.flatMap((a) => Object.keys(resumos[a].bairros)));
        return {
          anos,
          fonte: { nome: ele.fonte, url: ele.url },
          cidade: Object.fromEntries(anos.map((a) => [a, resumos[a].cidade])),
          bairros: Object.fromEntries([...ids].map((id) => [id, Object.fromEntries(anos.map((a) => [a, resumos[a].bairros[id] ?? null]))])),
        };
      })()
    : null;

  return {
    censo,
    eleicoes,
    populacao: pop && { fonte: pop.fonte, url: pop.url, censos: pop.censos, estimativas: pop.estimativas },
  };
}
