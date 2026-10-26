// Baixa do SICONFI (Tesouro Nacional) os demonstrativos fiscais de Osasco e das cidades pares
// para data/siconfi/<ano>.json. Rode com: npm run coletar:fiscal   (depois: npm run dados)
//
// Para cada ano usa o último período que Osasco já entregou e pede o MESMO período aos pares,
// para a comparação ser justa.
import { mkdirSync, writeFileSync } from "node:fs";

export const API = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/";
const pares = JSON.parse((await import("node:fs")).readFileSync("data/pares.json", "utf8"));
const PAUSA_MS = 1200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Só guardamos as contas que o cálculo usa, para o arquivo ficar pequeno.
const CONTAS = {
  rreo14: [
    "AplicacaoTotalDasDespesasComAcoesEServicosPublicosDeSaude",
    "MinimoAnualDasReceitasDeImpostosNaManutencaoEDesenvolvimentoDoEnsinoDemonstrativoSimplificado",
    "MinimoAnualDoFUNDEBNaRemuneracaoDoMagisterioComEducacaoInfantilEnsinoFundamentalEMedioDemonstrativoSimplificado",
    "ResultadoPrimarioAcimaDaLinhaSemRPPSDemonstrativoSimplificado",
    "ReceitaCorrenteLiquidaDemonstrativoSimplificado",
  ],
  rreo01: ["Investimentos", "DespesasExcetoIntraOrcamentarias"],
  rgf01: ["DespesaComPessoalTotal"],
};

const url = {
  rreo14: (ano, p, ibge) => `${API}rreo?an_exercicio=${ano}&nr_periodo=${p}&co_tipo_demonstrativo=RREO&id_ente=${ibge}&no_anexo=RREO-Anexo%2014`,
  rreo01: (ano, p, ibge) => `${API}rreo?an_exercicio=${ano}&nr_periodo=${p}&co_tipo_demonstrativo=RREO&id_ente=${ibge}&no_anexo=RREO-Anexo%2001`,
  rgf01: (ano, q, ibge) => `${API}rgf?an_exercicio=${ano}&in_periodicidade=Q&nr_periodo=${q}&co_tipo_demonstrativo=RGF&co_poder=E&id_ente=${ibge}&no_anexo=RGF-Anexo%2001`,
};

async function buscar(u) {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { items } = await res.json();
      await sleep(PAUSA_MS);
      return items ?? [];
    } catch (e) {
      console.warn(`  tentativa ${tentativa} falhou (${e.message})`);
      await sleep(PAUSA_MS * 5 * tentativa);
    }
  }
  throw new Error(`Não foi possível acessar ${u}`);
}

const enxugar = (items, contas) =>
  items.filter((i) => contas.includes(i.cod_conta)).map(({ cod_conta, coluna, valor, rotulo }) => ({ cod_conta, coluna, valor, rotulo }));

async function ultimoPeriodo(montarUrl, ano, maximo) {
  for (let p = maximo; p >= 1; p--) if ((await buscar(montarUrl(ano, p, pares.foco))).length) return p;
  return null;
}

mkdirSync("data/siconfi", { recursive: true });
for (const ano of pares.anos) {
  const rreoPeriodo = await ultimoPeriodo(url.rreo14, ano, 6);
  const rgfPeriodo = await ultimoPeriodo(url.rgf01, ano, 3);
  if (!rreoPeriodo) {
    console.log(`${ano}: Osasco ainda não entregou o RREO, pulando.`);
    continue;
  }
  console.log(`${ano}: RREO ${rreoPeriodo}º bimestre, RGF ${rgfPeriodo ?? "—"}º quadrimestre`);
  const cidades = {};
  for (const c of pares.cidades) {
    const fontes = {
      rreo14: url.rreo14(ano, rreoPeriodo, c.ibge),
      rreo01: url.rreo01(ano, rreoPeriodo, c.ibge),
      ...(rgfPeriodo && { rgf01: url.rgf01(ano, rgfPeriodo, c.ibge) }),
    };
    const dados = {};
    for (const [k, u] of Object.entries(fontes)) dados[k] = enxugar(await buscar(u), CONTAS[k]);
    cidades[c.ibge] = { fontes, ...dados };
    console.log(`  ${c.nome}: ${Object.values(dados).map((d) => d.length).join("/")} linhas`);
  }
  writeFileSync(`data/siconfi/${ano}.json`, JSON.stringify({ ano, rreoPeriodo, rgfPeriodo, coletadoEm: new Date().toISOString(), cidades }, null, 1));
}
