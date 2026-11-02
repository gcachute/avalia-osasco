// Contratos da Prefeitura e da Câmara publicados no Portal Nacional de Contratações Públicas (PNCP).
// Rode com: npm run coletar:contratos   (depois: npm run dados)
//
// A publicação no portal passou a valer aos poucos: os primeiros contratos de Osasco são de 2024. Contrato com pessoa física
// entra só na contagem: nome e documento não são guardados. Uma página por segundo; para depois de 3 recusas seguidas.
import { mkdirSync, writeFileSync } from "node:fs";
import { baixar, sleep } from "./lib/baixar.mjs";

const ORGAOS = { prefeitura: "46523171000104", camara: process.env.CNPJ_CAMARA ?? "" };
const ANOS = Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => 2023 + i);
const API = "https://pncp.gov.br/api/consulta/v1/contratos";
const DESTINO = "data/dinheiro/contratos.json";

const contratos = [];
const pessoasFisicas = {};
let recusas = 0;
for (const [orgao, cnpj] of Object.entries(ORGAOS)) {
  if (!cnpj) continue;
  for (const ano of ANOS) {
    for (let pagina = 1, total = 1; pagina <= total; pagina++) {
      const url = `${API}?dataInicial=${ano}0101&dataFinal=${ano}1231&cnpjOrgao=${cnpj}&pagina=${pagina}&tamanhoPagina=100`;
      const r = await baixar(url, { timeout: 90000 }).catch(() => null);
      if (!r) {
        if (++recusas >= 3) throw new Error("Três recusas seguidas: parando.");
        continue;
      }
      recusas = 0;
      const texto = await r.text();
      if (!texto) break;
      const j = JSON.parse(texto);
      total = j.totalPaginas;
      for (const c of j.data ?? []) {
        if (c.tipoPessoa !== "PJ") {
          (pessoasFisicas[ano] ??= { quantidade: 0, valor: 0 }).quantidade++;
          pessoasFisicas[ano].valor += c.valorGlobal ?? 0;
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
mkdirSync("data/dinheiro", { recursive: true });
writeFileSync(DESTINO, `${JSON.stringify({ fonte: "Portal Nacional de Contratações Públicas (PNCP)", url: "https://pncp.gov.br/app/contratos", coletadoEm: new Date().toISOString().slice(0, 10), pessoasFisicas, contratos }, null, 1)}\n`);
console.log(`${contratos.length} contratos com empresas; soma R$ ${(contratos.reduce((s, c) => s + (c.valor ?? 0), 0) / 1e6).toFixed(1)} mi`);
