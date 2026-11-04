// Contratos da Prefeitura e da Câmara publicados no Portal Nacional de Contratações Públicas (PNCP).
// Rode com: npm run coletar:contratos   (depois: npm run dados)
//
// A publicação no portal passou a valer aos poucos: os primeiros contratos de Osasco são de 2024. Contrato com pessoa física
// entra só na contagem: nome e documento não são guardados. Uma página por segundo.
// Página recusada não vira lista pela metade: o órgão que perder alguma página fica com a coleta anterior inteira.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { baixar, sleep } from "./lib/baixar.mjs";

// CNPJ da Câmara conferido no próprio PNCP, onde ela aparece como "CAMARA MUNICIPAL DE OSASCO", poder Legislativo.
const ORGAOS = { prefeitura: "46523171000104", camara: process.env.CNPJ_CAMARA ?? "50520121000132" };
const ANOS = Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => 2023 + i);
const API = "https://pncp.gov.br/api/consulta/v1/contratos";
const DESTINO = "data/dinheiro/contratos.json";

const anterior = existsSync(DESTINO) ? JSON.parse(readFileSync(DESTINO, "utf8")) : null;
const contratos = [];
const pessoasFisicas = {};
const incompletos = new Set();
for (const [orgao, cnpj] of Object.entries(ORGAOS)) {
  if (!cnpj) continue;
  for (const ano of ANOS) {
    if (incompletos.has(orgao)) break;
    for (let pagina = 1, total = 1; pagina <= total; pagina++) {
      const url = `${API}?dataInicial=${ano}0101&dataFinal=${ano}1231&cnpjOrgao=${cnpj}&pagina=${pagina}&tamanhoPagina=100`;
      let r = await baixar(url, { timeout: 90000 }).catch(() => null);
      if (!r) {
        await sleep(30000);
        r = await baixar(url, { timeout: 90000 }).catch(() => null);
      }
      if (!r) {
        console.log(`${orgao} ${ano}: página ${pagina} recusada duas vezes, o órgão fica com a coleta anterior`);
        incompletos.add(orgao);
        break;
      }
      const texto = await r.text();
      if (!texto) break;
      const j = JSON.parse(texto);
      total = j.totalPaginas;
      for (const c of j.data ?? []) {
        if (c.tipoPessoa !== "PJ") {
          const pf = ((pessoasFisicas[orgao] ??= {})[ano] ??= { quantidade: 0, valor: 0 });
          pf.quantidade++;
          pf.valor += c.valorGlobal ?? 0;
          continue;
        }
        contratos.push({
          orgao,
          ano: c.anoContrato,
          sequencial: c.sequencialContrato,
          numero: c.numeroContratoEmpenho,
          processo: c.processo,
          tipo: c.tipoContrato?.nome ?? null,
          categoria: c.categoriaProcesso?.nome ?? null,
          cnpj: c.niFornecedor,
          fornecedor: c.nomeRazaoSocialFornecedor?.trim(),
          objeto: c.objetoContrato?.replace(/\s+/g, " ").trim(),
          valorInicial: c.valorInicial,
          valor: c.valorGlobal,
          assinatura: c.dataAssinatura,
          inicio: c.dataVigenciaInicio,
          fim: c.dataVigenciaFim,
          emenda: c.emendaParlamentar ?? null,
          url: `https://pncp.gov.br/app/contratos/${cnpj}/${c.anoContrato}/${c.sequencialContrato}`,
        });
      }
      console.log(`${orgao} ${ano}: página ${pagina} de ${total}`);
      await sleep(1000);
    }
  }
}
// Coletas antigas guardavam as pessoas físicas só por ano, todas da Prefeitura.
const pfAntes = anterior && Object.keys(anterior.pessoasFisicas ?? {}).every((k) => /^\d{4}$/.test(k)) ? { prefeitura: anterior.pessoasFisicas ?? {} } : (anterior?.pessoasFisicas ?? {});
for (const orgao of incompletos) {
  const antes = (anterior?.contratos ?? []).filter((c) => (c.orgao ?? "prefeitura") === orgao);
  contratos.splice(0, contratos.length, ...contratos.filter((c) => c.orgao !== orgao), ...antes);
  if (pfAntes[orgao]) pessoasFisicas[orgao] = pfAntes[orgao];
  else delete pessoasFisicas[orgao];
}
mkdirSync("data/dinheiro", { recursive: true });
writeFileSync(DESTINO, `${JSON.stringify({ fonte: "Portal Nacional de Contratações Públicas (PNCP)", url: "https://pncp.gov.br/app/contratos", coletadoEm: new Date().toISOString().slice(0, 10), pessoasFisicas, contratos }, null, 1)}\n`);
for (const orgao of Object.keys(ORGAOS)) console.log(`${orgao}: ${contratos.filter((c) => c.orgao === orgao).length} contratos com empresas`);
console.log(`${contratos.length} contratos com empresas; soma R$ ${(contratos.reduce((s, c) => s + (c.valor ?? 0), 0) / 1e6).toFixed(1)} mi`);
