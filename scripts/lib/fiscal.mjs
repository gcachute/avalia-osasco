// Pilares A (gestão fiscal) e B (mínimos constitucionais) da nota do prefeito,
// calculados a partir dos arquivos de data/siconfi (ver scripts/coletar-siconfi.mjs).
import { existsSync, readFileSync } from "node:fs";

// Faixa plausível de cada indicador. Fora dela o dado é tratado como erro de preenchimento no SICONFI.
const PLAUSIVEL = {
  saude: [5, 60],
  educacao: [10, 60],
  fundeb: [50, 110],
  pessoal: [10, 70],
  investimento: [0, 40],
};
export const MINIMOS = { saude: 15, educacao: 25, fundeb: 70 };
export const PESSOAL = { otimo: 35, alerta: 48.6, prudencial: 51.3, maximo: 54 };
const PRIMARIO_TOLERANCIA = 3; // % da RCL abaixo da meta da LDO que leva a nota a zero

const valor = (linhas, conta, coluna) => linhas?.find((l) => l.cod_conta === conta && l.coluna.startsWith(coluna))?.valor ?? null;

function extrair(c) {
  const r14 = c.rreo14;
  const empenhada = valor(c.rreo01, "DespesasExcetoIntraOrcamentarias", "DESPESAS EMPENHADAS ATÉ");
  const investido = valor(c.rreo01, "Investimentos", "DESPESAS EMPENHADAS ATÉ");
  const meta = valor(r14, "ResultadoPrimarioAcimaDaLinhaSemRPPSDemonstrativoSimplificado", "Meta");
  const resultado = valor(r14, "ResultadoPrimarioAcimaDaLinhaSemRPPSDemonstrativoSimplificado", "Resultado Apurado");
  const rcl = valor(r14, "ReceitaCorrenteLiquidaDemonstrativoSimplificado", "Até o Bimestre");
  return {
    saude: valor(r14, "AplicacaoTotalDasDespesasComAcoesEServicosPublicosDeSaude", "% Aplicado"),
    educacao: valor(r14, "MinimoAnualDasReceitasDeImpostosNaManutencaoEDesenvolvimentoDoEnsinoDemonstrativoSimplificado", "% Aplicado"),
    fundeb: valor(r14, "MinimoAnualDoFUNDEBNaRemuneracaoDoMagisterioComEducacaoInfantilEnsinoFundamentalEMedioDemonstrativoSimplificado", "% Aplicado"),
    pessoal: valor(c.rgf01, "DespesaComPessoalTotal", "% sobre"),
    investimento: empenhada && investido != null ? (investido / empenhada) * 100 : null,
    primario: meta != null && resultado != null && rcl ? { meta, resultado, rcl, diferencaRCL: ((resultado - meta) / rcl) * 100 } : null,
  };
}

function validar(ind, avisos, nome, ano) {
  for (const [k, [min, max]] of Object.entries(PLAUSIVEL)) {
    if (ind[k] != null && (ind[k] < min || ind[k] > max)) {
      avisos.push(`${nome} ${ano}: ${k} = ${ind[k]} está fora da faixa plausível (${min}–${max}) e foi descartado.`);
      ind[k] = null;
    }
  }
  return ind;
}

// Posição entre as cidades com dado válido: 1 = melhor, 0 = pior.
export function percentil(valores, v, maiorMelhor = true) {
  const outros = valores.filter((x) => x != null);
  if (v == null || outros.length < 3) return null;
  const piores = outros.filter((x) => (maiorMelhor ? x < v : x > v)).length;
  const empates = outros.filter((x) => x === v).length - 1;
  return (piores + empates / 2) / (outros.length - 1);
}

export const linear = (x, x0, y0, x1, y1) => y0 + ((Math.min(Math.max(x, Math.min(x0, x1)), Math.max(x0, x1)) - x0) * (y1 - y0)) / (x1 - x0);

function notaPessoal(p) {
  if (p == null) return null;
  if (p <= PESSOAL.otimo) return 1;
  if (p <= PESSOAL.alerta) return linear(p, PESSOAL.otimo, 1, PESSOAL.alerta, 0.5);
  return linear(p, PESSOAL.alerta, 0.5, PESSOAL.maximo, 0);
}

const notaPrimario = (pr) => (pr ? linear(pr.diferencaRCL, -PRIMARIO_TOLERANCIA, 0, 0, 1) : null);
export const media = (xs) => {
  const v = xs.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

// Notas só para anos fechados: no meio do ano os percentuais de saúde e educação ainda estão subindo
// e a meta de resultado primário é anual, então uma nota parcial seria enganosa.
function pontuarAno(cidades, completo) {
  const col = (k) => cidades.map((c) => c.indicadores[k]);
  for (const c of cidades) {
    if (!completo) {
      c.pilares = {
        A: { nota: null, componentes: { pessoal: null, investimento: null, primario: null } },
        B: { nota: null, componentes: { saude: null, educacao: null, fundeb: null }, descumpridos: [] },
      };
      c.posicao = {};
      continue;
    }
    const i = c.indicadores;
    const abaixo = Object.entries(MINIMOS).filter(([k, m]) => i[k] != null && i[k] < m).map(([k]) => k);
    const minimos = Object.fromEntries(
      Object.keys(MINIMOS).map((k) => {
        const p = percentil(col(k), i[k]);
        return [k, i[k] == null ? null : i[k] < MINIMOS[k] ? 0 : p == null ? 0.75 : 0.5 + 0.5 * p];
      }),
    );
    const fiscal = {
      pessoal: notaPessoal(i.pessoal),
      investimento: percentil(col("investimento"), i.investimento),
      primario: notaPrimario(i.primario),
    };
    c.pilares = {
      A: { nota: media(Object.values(fiscal)), componentes: fiscal },
      B: { nota: abaixo.length ? 0 : media(Object.values(minimos)), componentes: minimos, descumpridos: abaixo },
    };
    c.posicao = {
      saude: percentil(col("saude"), i.saude),
      educacao: percentil(col("educacao"), i.educacao),
      fundeb: percentil(col("fundeb"), i.fundeb),
      pessoal: percentil(col("pessoal"), i.pessoal, false),
      investimento: fiscal.investimento,
    };
  }
  for (const p of ["A", "B"]) {
    const ordem = cidades.filter((c) => c.pilares[p].nota != null).sort((a, b) => b.pilares[p].nota - a.pilares[p].nota);
    ordem.forEach((c, k) => (c.pilares[p].ranking = k + 1));
  }
}

export function calcularFiscal() {
  if (!existsSync("data/pares.json")) return null;
  const pares = JSON.parse(readFileSync("data/pares.json", "utf8"));
  const avisos = [];
  const anos = [];
  for (const ano of pares.anos) {
    const arq = `data/siconfi/${ano}.json`;
    if (!existsSync(arq)) continue;
    const bruto = JSON.parse(readFileSync(arq, "utf8"));
    const completo = bruto.rreoPeriodo === 6 && bruto.rgfPeriodo === 3;
    const cidades = pares.cidades.map((c) => {
      const d = bruto.cidades[c.ibge] ?? {};
      const semDados = !d.rreo14?.length;
      if (semDados) avisos.push(`${c.nome} ${ano}: demonstrativo do período ainda não entregue ao SICONFI.`);
      const indicadores = validar(extrair(d), avisos, c.nome, ano);
      if (!semDados && indicadores.saude == null && indicadores.educacao == null)
        avisos.push(`${c.nome} ${ano}: não informou saúde e educação no RREO enviado ao SICONFI (esses dados também vão ao SIOPS e ao SIOPE, ainda não integrados). Fica sem nota no pilar B.`);
      return { ibge: c.ibge, nome: c.nome, foco: c.ibge === pares.foco, fontes: d.fontes ?? {}, semDados, indicadores };
    });
    pontuarAno(cidades, completo);
    anos.push({ ano, completo, rreoPeriodo: bruto.rreoPeriodo, rgfPeriodo: bruto.rgfPeriodo, coletadoEm: bruto.coletadoEm, mandato: ano >= pares.inicioMandato, cidades });
  }
  if (!anos.length) return null;

  // Nota do mandato: média dos anos fechados a partir da posse.
  const fechados = anos.filter((a) => a.completo && a.mandato);
  const foco = (a) => a.cidades.find((c) => c.foco);
  const pilar = (p) => ({ nota: media(fechados.map((a) => foco(a).pilares[p].nota)), anos: fechados.map((a) => a.ano) });
  return { pilares: { A: pilar("A"), B: pilar("B") }, anos, avisos, referencias: { minimos: MINIMOS, pessoal: PESSOAL, toleranciaPrimario: PRIMARIO_TOLERANCIA } };
}
