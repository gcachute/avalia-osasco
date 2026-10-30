// Emendas pagas pelo Fundo Nacional de Saúde a Osasco, com o parlamentar de cada uma.
// Rode com: npm run coletar:fns   (depois: npm run dados)   ANOS=2024,2025 escolhe os anos.
//
// O arquivo da CGU por recebedor não traz boa parte dos repasses fundo a fundo de saúde. A Consulta FNS, pública, traz: a tela
// de repasses lista cada ação do dia; a consulta por ano dá os municípios de cada ação; o detalhe dá parlamentar e emenda.
// Uma consulta a cada 0,4 s. Os dias já lidos ficam guardados em data/cache/fns-acoes-ANO.json. Só entra o que é de Osasco.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = "https://consultafns.saude.gov.br/recursos/repasse-dia";
const ARQUIVO = "data/dinheiro/emendas-fns.json";
const ATUAL = new Date().getFullYear();
const ANOS = (process.env.ANOS ?? `${ATUAL - 1},${ATUAL}`).split(",").map(Number);
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

let recusas = 0;
const pede = async (caminho, params) => {
  const q = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    await dorme(400);
    const r = await fetch(`${BASE}/${caminho}?${q}`, { headers: { "User-Agent": "avalia-osasco/0.1 (coleta de dados publicos)", Accept: "application/json" } }).catch(() => null);
    if (r?.ok) {
      recusas = 0;
      return (await r.json()).resultado;
    }
    console.log(`  tentativa ${tentativa} falhou (${r?.status ?? "sem resposta"}): ${caminho}`);
    await dorme(tentativa * 3000);
  }
  if (++recusas >= 3) throw new Error("Três recusas seguidas: parando.");
  return null;
};

// Cada ação de emenda paga no ano, varrendo a tela de repasses dia a dia.
const acoesDoAno = async (ano) => {
  const guardado = `data/cache/fns-acoes-${ano}.json`;
  const lidos = existsSync(guardado) ? JSON.parse(readFileSync(guardado, "utf8")) : { dias: [], acoes: {} };
  const hoje = new Date().toISOString().slice(0, 10);
  for (let d = new Date(Date.UTC(ano, 0, 1)); d.getUTCFullYear() === ano; d.setUTCDate(d.getUTCDate() + 1)) {
    const dia = d.toISOString().slice(0, 10);
    if (dia >= hoje || lidos.dias.includes(dia) || [0, 6].includes(d.getUTCDay())) continue;
    const r = await pede("consultar", { ano, mes: d.getUTCMonth() + 1, dia: d.getUTCDate() });
    if (r === null) continue;
    const anda = (nos) => {
      for (const n of nos ?? []) {
        if (/^EMENDA/.test(n.noTipoTransferencia ?? "")) lidos.acoes[`${n.noTipoTransferencia}|${n.codigo}`] = { tipo: n.noTipoTransferencia, codigo: n.codigo, nome: n.nome };
        anda(n.repasses);
      }
    };
    anda(r);
    lidos.dias.push(dia);
    if (lidos.dias.length % 40 === 0) writeFileSync(guardado, JSON.stringify(lidos));
  }
  writeFileSync(guardado, JSON.stringify(lidos));
  return Object.values(lidos.acoes);
};

mkdirSync("data/cache", { recursive: true });
const antes = existsSync(ARQUIVO) ? JSON.parse(readFileSync(ARQUIVO, "utf8")).repasses : [];
const repasses = antes.filter((r) => !ANOS.includes(r.ano));

for (const ano of ANOS) {
  const acoes = await acoesDoAno(ano);
  console.log(`${ano}: ${acoes.length} ações com emenda`);
  for (const a of acoes) {
    const linhas = [];
    for (let page = 1; ; page++) {
      const r = await pede("detalhar-pagamento", { page, count: 100, tipo: a.tipo, codigo: a.codigo, nuAno: ano, sgEstado: "SP" });
      const l = r?.repasses ?? [];
      linhas.push(...l.filter((x) => /^OSASCO$/i.test(x.noMunicipio?.trim() ?? "")));
      if (l.length < 100) break;
    }
    for (const x of linhas) {
      const d = await pede("detalhar-pagamento-emenda", { cnpj: x.nuCnpj, processo: x.nuProcesso, portaria: x.nuPortaria, codigo: a.codigo, ano, estado: "SP", page: 1, count: 50 });
      for (const i of d?.itensPagina ?? []) {
        // Emenda paga em parcelas: o detalhe de cada parcela repete todas.
        const repetido = repasses.some((r) => r.ano === ano && r.proposta === i.nuProposta && r.emenda === i.nuEmenda && r.portaria === i.nuPortaria && r.competencia === i.dsCompetencia && r.valor === i.vlTotal);
        if (repetido) continue;
        repasses.push({
          ano,
          tipo: a.tipo,
          acao: a.nome,
          entidade: i.noEntidade,
          cnpj: i.nuCnpj.replace(/\D/g, ""),
          portaria: i.nuPortaria,
          proposta: i.nuProposta,
          parlamentar: i.noParlamentar,
          partido: i.sgPartido ?? null,
          emenda: i.nuEmenda,
          competencia: i.dsCompetencia,
          destino: i.dsTipo,
          valor: i.vlTotal,
        });
      }
    }
    if (linhas.length) console.log(`  ${a.tipo} ${a.codigo}: ${linhas.length} em Osasco`);
  }
  writeFileSync(ARQUIVO, `${JSON.stringify({ fonte: "Fundo Nacional de Saúde, Consulta FNS (repasses do dia)", url: "https://consultafns.saude.gov.br/#/repasse-dia", coletadoEm: new Date().toISOString().slice(0, 10), repasses }, null, 2)}\n`);
  const soma = repasses.filter((r) => r.ano === ano).reduce((s, r) => s + r.valor, 0);
  console.log(`${ano}: R$ ${(soma / 1e6).toFixed(2)} mi em ${repasses.filter((r) => r.ano === ano).length} repasses`);
}
