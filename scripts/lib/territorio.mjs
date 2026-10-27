// Junta, por bairro, os dados de território coletados em data/territorio (Censo, TSE, CNES, escolas)
// e calcula a média da cidade para comparação.
import { existsSync, readFileSync } from "node:fs";
import { reconhecedorDeBairros } from "./bairros.mjs";

const ler = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);

// Indicadores do Censo: média da cidade ponderada pela base de cada um (pessoas ou domicílios).
export const BASE = {
  rendaMedia: "domicilios",
  rendaMediana: "domicilios",
  agua: "domicilios",
  esgoto: "domicilios",
  lixo: "domicilios",
  alfabetizados: "pessoas",
  negros: "pessoas",
  criancas: "pessoas",
  idosos: "pessoas",
  pavimentacao: "domicilios",
  bueiro: "domicilios",
  iluminacao: "domicilios",
  onibus: "domicilios",
  calcada: "domicilios",
  rampa: "domicilios",
  arvores: "domicilios",
};
// Siglas dos partidos pelo número da urna (eleições de 2024).
export const SIGLAS = {
  10: "Republicanos", 11: "PP", 12: "PDT", 13: "PT", 15: "MDB", 16: "PSTU", 18: "Rede", 20: "Podemos", 21: "PCB", 22: "PL",
  23: "Cidadania", 25: "PRD", 27: "DC", 28: "PRTB", 29: "PCO", 30: "Novo", 33: "Mobiliza", 35: "PMB", 36: "Agir", 40: "PSB",
  43: "PV", 44: "União", 45: "PSDB", 50: "PSOL", 55: "PSD", 65: "PCdoB", 70: "Avante", 77: "Solidariedade", 80: "UP",
};
const GRUPOS_CRIME = ["mortes", "roubos", "furtos", "violencia", "sexual", "transito", "drogas"];

// Bairros com tão poucos moradores que as porcentagens viram ruído (áreas industriais).
export const MINIMO_MORADORES = 500;

export function montarTerritorio(malha, idFor) {
  const censo = ler("data/territorio/censo.json");
  const eleicao = ler("data/territorio/eleicao-2024.json");
  const saude = ler("data/territorio/saude.json");
  const escolas = ler("data/territorio/escolas.json");
  const favelas = ler("data/territorio/favelas.json");
  const seguranca = ler("data/territorio/seguranca.json");
  const obrasTce = ler("data/transparencia/obras.json");
  const acha = reconhecedorDeBairros(malha.bairros);
  const obras = (obrasTce?.obras?.["3534401"] ?? []).map((o) => ({ ...o, bairros: acha(o.objeto) }));
  if (!censo && !eleicao && !saude) return null;

  const porId = Object.fromEntries((censo?.bairros ?? []).map((b) => [b.id, b]));
  const cidade = {};
  if (censo) {
    const validos = censo.bairros.filter((b) => b.pessoas >= MINIMO_MORADORES);
    for (const [k, base] of Object.entries(BASE)) {
      const comDado = validos.filter((b) => b[k] != null);
      const peso = comDado.reduce((a, b) => a + b[base], 0);
      cidade[k] = peso ? Math.round((comDado.reduce((a, b) => a + b[k] * b[base], 0) / peso) * 10) / 10 : null;
    }
    const area = censo.bairros.reduce((a, b) => a + (b.areaKm2 ?? 0), 0);
    cidade.pessoas = censo.bairros.reduce((a, b) => a + b.pessoas, 0);
    cidade.densidade = Math.round(cidade.pessoas / area);
  }

  // Eleição: prefeito (1º turno) e vereadores por bairro. Votos de legenda (número de 2 dígitos) não são de candidato.
  const prefeito = eleicao?.cargos["prefeito-1"];
  const vereador = eleicao?.cargos["vereador-1"];
  const candidatoVereador = (c) => c.valido && String(c.numero).length === 5;
  const idDoCandidato = new Map(vereador?.candidatos.filter(candidatoVereador).map((c) => [c.nome, idFor(c.nome)]) ?? []);
  const votosVereador = {};
  if (vereador)
    for (const [b, x] of Object.entries(vereador.porBairro))
      for (const [nome, q] of Object.entries(x.votos)) {
        const id = idDoCandidato.get(nome);
        if (!id) continue;
        votosVereador[id] ??= { nomeUrna: nome, total: 0, porBairro: {} };
        votosVereador[id].total += q;
        if (b !== "sem-bairro") votosVereador[id].porBairro[b] = (votosVereador[id].porBairro[b] ?? 0) + q;
      }
  const candidatosPrefeito = prefeito?.candidatos.filter((c) => c.valido) ?? [];
  const partidoDoPrefeito = candidatosPrefeito[0] ? String(candidatosPrefeito[0].numero).slice(0, 2) : null;
  const validosPrefeito = candidatosPrefeito.reduce((a, c) => a + c.votos, 0);

  const bairros = Object.fromEntries(
    malha.bairros.map((b) => {
      const c = porId[b.id];
      const pb = prefeito?.porBairro[b.id];
      const vb = vereador?.porBairro[b.id];
      const locais = eleicao?.locais.filter((l) => l.bairro === b.id) ?? [];
      const unidades = saude?.unidades.filter((u) => u.bairro === b.id) ?? [];
      const esc = escolas?.escolas.filter((e) => e.bairro === b.id) ?? [];
      const comp = eleicao?.comparecimento?.[b.id];
      const pt = eleicao?.partidos?.porBairro?.[b.id];
      const ptTotal = pt ? Object.values(pt).reduce((a, q) => a + q, 0) : 0;
      const crimes = seguranca?.porBairro?.[b.id] ?? null;
      const pessoasB = c?.pessoas ?? 0;
      return [
        b.id,
        {
          censo: c && {
            ...c,
            id: undefined,
            poucosMoradores: c.pessoas < MINIMO_MORADORES,
            densidade: c.areaKm2 ? Math.round(c.pessoas / c.areaKm2) : null,
          },
          eleicao: eleicao && {
            locais: locais.length,
            eleitores: locais.reduce((a, l) => a + l.eleitores, 0),
            prefeito: pb
              ? candidatosPrefeito.map((k) => ({ nome: k.nome, pct: pb.validos ? Math.round(((pb.votos[k.nome] ?? 0) / pb.validos) * 1000) / 10 : null }))
              : null,
            vereadores: vb
              ? Object.entries(vb.votos)
                  .filter(([n]) => idDoCandidato.has(n))
                  .sort((a, z) => z[1] - a[1])
                  .slice(0, 5)
                  .map(([nome, votos]) => ({ nome, id: idDoCandidato.get(nome), votos, pct: Math.round((votos / vb.validos) * 1000) / 10 }))
              : null,
            validosVereador: vb?.validos ?? 0,
            comparecimento: comp?.aptos ? Math.round((comp.compareceram / comp.aptos) * 1000) / 10 : null,
            brancosNulos: comp?.compareceram ? Math.round(((comp.brancos + comp.nulos) / comp.compareceram) * 1000) / 10 : null,
            partidos: pt
              ? Object.entries(pt)
                  .sort((a, z) => z[1] - a[1])
                  .slice(0, 5)
                  .map(([n, q]) => ({ numero: n, sigla: SIGLAS[n] ?? eleicao.partidos.nomes[n] ?? n, pct: Math.round((q / ptTotal) * 1000) / 10 }))
              : null,
          },
          partidoPrefeito: pt && partidoDoPrefeito ? Math.round(((pt[partidoDoPrefeito] ?? 0) / ptTotal) * 1000) / 10 : null,
          favelas: favelas
            ? {
                moradores: favelas.emFavela[b.id] ?? 0,
                pct: pessoasB ? Math.round(((favelas.emFavela[b.id] ?? 0) / pessoasB) * 1000) / 10 : null,
                comunidades: favelas.comunidades
                  .filter((x) => x.bairros[b.id])
                  .map((x) => ({ nome: x.nome, moradores: x.bairros[b.id] }))
                  .sort((a, z) => z.moradores - a.moradores),
              }
            : null,
          seguranca: crimes
            ? Object.fromEntries(GRUPOS_CRIME.map((g) => [g, { n: crimes[g] ?? 0, por10mil: pessoasB >= MINIMO_MORADORES ? Math.round(((crimes[g] ?? 0) / pessoasB) * 1e5) / 10 : null }]))
            : seguranca
              ? Object.fromEntries(GRUPOS_CRIME.map((g) => [g, { n: 0, por10mil: pessoasB >= MINIMO_MORADORES ? 0 : null }]))
              : null,
          obras: obras
            .filter((o) => o.bairros.includes(b.id))
            .map(({ objeto, situacao, valor, contratante, contratado, ano }) => ({ objeto, situacao, valor, contratante, contratado, ano })),
          saude: unidades.map(({ cnes, nome, tipo, publica, turno }) => ({ cnes, nome, tipo, publica, turno })),
          escolas: esc.map(({ codigo, nome, rede, idebIniciais, idebFinais }) => ({ codigo, nome, rede, idebIniciais, idebFinais })),
        },
      ];
    }),
  );

  // Médias da cidade para os indicadores que não vêm prontos do Censo.
  if (favelas && cidade.pessoas) cidade.favelas = Math.round((Object.values(favelas.emFavela).reduce((x, q) => x + q, 0) / cidade.pessoas) * 1000) / 10;
  if (eleicao?.comparecimento) {
    const t = Object.values(eleicao.comparecimento).reduce((x, q) => ({ aptos: x.aptos + q.aptos, foram: x.foram + q.compareceram, bn: x.bn + q.brancos + q.nulos }), { aptos: 0, foram: 0, bn: 0 });
    cidade.comparecimento = Math.round((t.foram / t.aptos) * 1000) / 10;
    cidade.brancosNulos = Math.round((t.bn / t.foram) * 1000) / 10;
  }
  if (seguranca && cidade.pessoas)
    for (const g of GRUPOS_CRIME)
      cidade[`crime_${g}`] = Math.round((Object.values(seguranca.porBairro).reduce((x, q) => x + (q[g] ?? 0), 0) / cidade.pessoas) * 1e5) / 10;

  const pontos = [
    ...(saude?.unidades ?? []).filter((u) => u.lat && u.lon).map((u) => ({ tipo: "saude", categoria: u.tipo, nome: u.nome, lat: u.lat, lon: u.lon, bairro: u.bairro })),
    ...(eleicao?.locais ?? []).filter((l) => l.lat && l.lon).map((l) => ({ tipo: "votacao", categoria: "Local de votação", nome: l.nome, lat: l.lat, lon: l.lon, bairro: l.bairro, eleitores: l.eleitores })),
    ...(escolas?.escolas ?? []).filter((e) => e.lat && e.lon).map((e) => ({ tipo: "escola", categoria: e.rede, nome: e.nome, lat: e.lat, lon: e.lon, bairro: e.bairro })),
  ];

  // Para cada vereador com votos: quanto da votação veio de cada bairro.
  for (const v of Object.values(votosVereador))
    v.porBairro = Object.fromEntries(Object.entries(v.porBairro).sort((a, z) => z[1] - a[1]));

  return {
    bairros,
    cidade,
    prefeito: candidatosPrefeito.map((c) => ({ nome: c.nome, votos: c.votos, pct: Math.round((c.votos / validosPrefeito) * 1000) / 10 })),
    votosVereador,
    pontos,
    minimoMoradores: MINIMO_MORADORES,
    anoSeguranca: seguranca?.ano ?? null,
    partidoDoPrefeito: partidoDoPrefeito ? (SIGLAS[partidoDoPrefeito] ?? partidoDoPrefeito) : null,
    partidosCidade: eleicao?.partidos
      ? Object.entries(eleicao.partidos.total)
          .sort((a, z) => z[1] - a[1])
          .map(([n, q]) => ({ numero: n, sigla: SIGLAS[n] ?? eleicao.partidos.nomes[n] ?? n, votos: q }))
      : [],
    fontes: [censo, eleicao, saude, escolas, favelas, seguranca, obrasTce && { fonte: "TCE-SP, Painel de Obras", url: "https://www.tce.sp.gov.br/paineldeobras" }].filter(Boolean).map((x) => ({ nome: x.fonte, url: x.url })),
  };
}
